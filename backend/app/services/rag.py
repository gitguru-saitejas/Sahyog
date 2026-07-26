import os
import hashlib
import math
import json
import uuid
import urllib.request
import urllib.error
from io import BytesIO
from typing import List, Dict, Any, Tuple
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.orm import Session
from app.models.rag import RagDocument, DocumentChunk
from app.services.storage import upload_rag_document, delete_rag_document

# Try importing pypdf for PDF extraction
try:
    import pypdf
except ImportError:
    pypdf = None

# Max file size: 10MB
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {".pdf", ".txt"}

def extract_text_from_bytes(content: bytes, ext: str) -> List[Dict[str, Any]]:
    """Extracts text contents from file bytes, page by page. Returns list of chunk sources."""
    pages_data = []
    ext = ext.lower()

    if ext == ".txt":
        text = content.decode("utf-8", errors="ignore")
        pages_data.append({"page": 1, "text": text})
    elif ext == ".pdf":
        if pypdf is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="PDF processing library (pypdf) is not installed on the server."
            )
        try:
            stream = BytesIO(content)
            reader = pypdf.PdfReader(stream)
            for idx, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                pages_data.append({"page": idx + 1, "text": text})
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Failed to parse PDF document: {str(e)}"
            )
    return pages_data

def chunk_text(pages_data: List[Dict[str, Any]], chunk_size: int = 500, overlap: int = 100) -> List[Dict[str, Any]]:
    """Splits text into chunks of specified characters size with overlap."""
    chunks = []
    chunk_index = 0

    for page_info in pages_data:
        text = page_info["text"]
        page_num = page_info["page"]
        
        # Clean text
        text = " ".join(text.split())
        
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunk_content = text[start:end]
            
            # Trim chunk
            chunk_content = chunk_content.strip()
            if chunk_content:
                chunks.append({
                    "chunk_index": chunk_index,
                    "content": chunk_content,
                    "metadata": {"page": page_num}
                })
                chunk_index += 1
            
            start += (chunk_size - overlap)
            
    return chunks

def get_embeddings(text: str) -> List[float]:
    """Retrieves 1536-dimension embeddings from OpenAI or local Ollama if configured. Raises ValueError if validation fails."""
    openai_key = os.getenv("OPENAI_API_KEY")
    ollama_url = os.getenv("OLLAMA_API_URL") # E.g. http://localhost:11434
    
    if not openai_key and not ollama_url:
        import random
        import hashlib
        print("[RAG SERVICE] WARNING: No embedding provider (OpenAI/Ollama) configured. Using dummy mock embeddings.")
        seed_val = int(hashlib.md5(text.encode("utf-8")).hexdigest(), 16) % 10000000
        rng = random.Random(seed_val)
        return [rng.uniform(-0.1, 0.1) for _ in range(1536)]

    embedding = None

    # 1. Try OpenAI if key is present
    if openai_key:
        try:
            req = urllib.request.Request(
                "https://api.openai.com/v1/embeddings",
                data=json.dumps({
                    "input": text,
                    "model": "text-embedding-3-small"
                }).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {openai_key}"
                },
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                res = json.loads(response.read().decode("utf-8"))
                embedding = res["data"][0]["embedding"]
        except Exception as e:
            print(f"[RAG SERVICE] OpenAI embedding request failed: {e}")
            raise ValueError(f"OpenAI embedding generation failed: {str(e)}")

    # 2. Try Ollama if URL is configured
    elif ollama_url:
        try:
            req = urllib.request.Request(
                f"{ollama_url.rstrip('/')}/api/embeddings",
                data=json.dumps({
                    "model": "nomic-embed-text",
                    "prompt": text
                }).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                res = json.loads(response.read().decode("utf-8"))
                embedding = res["embedding"]
        except Exception as e:
            print(f"[RAG SERVICE] Ollama embedding request failed: {e}")
            raise ValueError(f"Ollama embedding generation failed: {str(e)}")

    # 3. Validate Dimensions
    if embedding is None:
        raise ValueError("Embedding generation returned empty response from provider.")
        
    if len(embedding) != 1536:
        raise ValueError(f"Incompatible embedding dimensions. Provider returned {len(embedding)} dimensions, expected 1536.")

    return embedding

def ingest_document(
    db: Session,
    hospital_id: Any,
    uploaded_by: Any,
    title: str,
    category: str,
    version: str,
    file: UploadFile
) -> RagDocument:
    """Orchestrates file upload to Supabase storage, memory-based extraction, embedding generation, database inserts, and compensating cleanup."""
    # 1. Validation
    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Only {', '.join(ALLOWED_EXTENSIONS)} are allowed."
        )
        
    contents = file.file.read()
    file_size = len(contents)
    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File exceeds maximum size of 10MB."
        )
    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    # 2. Storage Path Generation (safe UUID-based filenames)
    uuid_str = str(uuid.uuid4())
    if hospital_id:
        # Prevent path traversal by sanitizing hospital_id UUID string
        clean_hosp_id = str(uuid.UUID(str(hospital_id)))
        storage_path = f"knowledge-base/hospitals/{clean_hosp_id}/{uuid_str}{ext}"
    else:
        storage_path = f"knowledge-base/global/{uuid_str}{ext}"

    # 3. Supabase Storage Upload
    content_type = file.content_type or ("application/pdf" if ext == ".pdf" else "text/plain")
    try:
        upload_rag_document(storage_path, contents, content_type)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Storage upload failed: {str(e)}"
        )

    uploaded_in_storage = True

    try:
        # 4. Extract Text Page-by-Page in Memory
        pages_data = extract_text_from_bytes(contents, ext)
        if not pages_data or all(not p.get("text", "").strip() for p in pages_data):
            raise ValueError("Document contains no readable text.")

        # 5. Chunk Text
        chunks = chunk_text(pages_data)
        if not chunks:
            raise ValueError("No clean chunks could be generated from document text.")

        # 6. Insert doc metadata record (Postgres transaction context)
        doc = RagDocument(
            hospital_id=hospital_id if hospital_id else None,
            uploaded_by=uploaded_by,
            title=title,
            file_url=storage_path, # Stable object path
            category=category,
            version=version
        )
        db.add(doc)
        db.flush() # Fetch doc.id without committing

        # 7. Generate embeddings and chunks
        for chk in chunks:
            vector = get_embeddings(chk["content"])
            if not vector or len(vector) != 1536:
                raise ValueError(f"Incompatible embedding dimensions. Received {len(vector) if vector else 0} dimensions, expected 1536.")
                
            chunk_record = DocumentChunk(
                document_id=doc.id,
                chunk_index=chk["chunk_index"],
                content=chk["content"],
                embedding=vector,
                metadata_dict=chk["metadata"]
            )
            db.add(chunk_record)
            
        db.commit()
        db.refresh(doc)
        return doc
        
    except Exception as e:
        db.rollback()
        # Compensating cleanup
        if uploaded_in_storage:
            try:
                delete_rag_document(storage_path)
            except Exception as clean_err:
                print(f"[RAG INGESTION] Compensating storage cleanup failed: {clean_err}")
                
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Incomplete RAG Ingestion Pipeline. Database transaction rolled back and storage cleaned. Error: {str(e)}"
        )
