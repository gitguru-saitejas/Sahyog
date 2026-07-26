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
from sqlalchemy import text
from app.models.rag import RagDocument, DocumentChunk
from app.core.config import settings
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
    """
    Retrieves embedding from the configured provider (Ollama) using settings configurations.
    Uses POST /api/embed Ollama endpoint.
    """
    if settings.EMBEDDING_PROVIDER != "ollama":
        raise ValueError(f"Unsupported embedding provider: {settings.EMBEDDING_PROVIDER}")
        
    if not settings.OLLAMA_API_URL:
        raise ValueError("Ollama API URL is not configured. Please check settings.")

    url = f"{settings.OLLAMA_API_URL.rstrip('/')}/api/embed"
    payload = json.dumps({
        "model": settings.EMBEDDING_MODEL,
        "input": text
    }).encode("utf-8")
    
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    
    try:
        # Use 15.0s timeout to allow model loading if needed
        with urllib.request.urlopen(req, timeout=15.0) as response:
            res = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        if "not found" in body or "pull" in body or e.code == 404:
            raise ValueError(f"Ollama embedding model '{settings.EMBEDDING_MODEL}' is not installed. Please run: ollama pull {settings.EMBEDDING_MODEL}")
        raise ValueError(f"Ollama embedding request failed with status {e.code}: {body}")
    except (urllib.error.URLError, TimeoutError) as e:
        reason = getattr(e, "reason", str(e))
        raise ConnectionError(f"Ollama embedding service is unreachable at {settings.OLLAMA_API_URL}. Details: {str(reason)}")
    except Exception as e:
        raise ValueError(f"Unexpected connection failure during Ollama embedding: {str(e)}")

    embeddings = res.get("embeddings")
    if not embeddings or not isinstance(embeddings, list) or len(embeddings) == 0:
        raise ValueError("Ollama response did not contain standard embeddings array.")
        
    embedding = embeddings[0]
    if len(embedding) != settings.EMBEDDING_DIMENSIONS:
        raise ValueError(f"Incompatible embedding dimensions. Provider returned {len(embedding)} dimensions, expected {settings.EMBEDDING_DIMENSIONS}.")
        
    return embedding

def get_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """
    Retrieves embeddings for a list of texts from the configured provider (Ollama) in a single request.
    Uses POST /api/embed Ollama endpoint with batch input.
    """
    if not texts:
        return []
        
    if settings.EMBEDDING_PROVIDER != "ollama":
        raise ValueError(f"Unsupported embedding provider: {settings.EMBEDDING_PROVIDER}")
        
    if not settings.OLLAMA_API_URL:
        raise ValueError("Ollama API URL is not configured. Please check settings.")

    url = f"{settings.OLLAMA_API_URL.rstrip('/')}/api/embed"
    payload = json.dumps({
        "model": settings.EMBEDDING_MODEL,
        "input": texts
    }).encode("utf-8")
    
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    
    try:
        # Use 180.0s timeout to allow processing of multiple texts on CPU-bound machines
        with urllib.request.urlopen(req, timeout=180.0) as response:
            res = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        if "not found" in body or "pull" in body or e.code == 404:
            raise ValueError(f"Ollama embedding model '{settings.EMBEDDING_MODEL}' is not installed. Please run: ollama pull {settings.EMBEDDING_MODEL}")
        raise ValueError(f"Ollama embedding request failed with status {e.code}: {body}")
    except (urllib.error.URLError, TimeoutError) as e:
        reason = getattr(e, "reason", str(e))
        raise ConnectionError(f"Ollama embedding service is unreachable at {settings.OLLAMA_API_URL}. Details: {str(reason)}")
    except Exception as e:
        raise ValueError(f"Unexpected connection failure during Ollama embedding: {str(e)}")

    embeddings = res.get("embeddings")
    if not embeddings or not isinstance(embeddings, list) or len(embeddings) != len(texts):
        raise ValueError(f"Ollama response did not contain expected standard embeddings array of size {len(texts)}.")
        
    for idx, embedding in enumerate(embeddings):
        if len(embedding) != settings.EMBEDDING_DIMENSIONS:
            raise ValueError(f"Incompatible embedding dimensions at index {idx}. Provider returned {len(embedding)} dimensions, expected {settings.EMBEDDING_DIMENSIONS}.")
            
    return embeddings

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
    # 1. Validation (extension, size, empty check)
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

    # Validate hospital_id scope if provided
    clean_hosp_id = None
    if hospital_id and str(hospital_id).lower() != "null" and str(hospital_id).strip() != "":
        try:
            clean_hosp_id = str(uuid.UUID(str(hospital_id)))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid hospital_id UUID format."
            )
        
        # Verify hospital exists in database and is not deleted
        from app.models.hospital import Hospital
        hosp = db.query(Hospital).filter(Hospital.id == clean_hosp_id).first()
        if not hosp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Hospital associated with this scope does not exist."
            )
        if hosp.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Hospital associated with this scope is deactivated or deleted."
            )

    # 2. Storage Path Generation (safe UUID-based filenames)
    uuid_str = str(uuid.uuid4())
    if clean_hosp_id:
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
            hospital_id=clean_hosp_id,
            uploaded_by=uploaded_by,
            title=title,
            file_url=storage_path, # Stable object path
            category=category,
            version=version
        )
        db.add(doc)
        db.flush() # Fetch doc.id without committing

        # 7. Generate embeddings and chunks in batch
        chunk_contents = [chk["content"] for chk in chunks]
        vectors = get_embeddings_batch(chunk_contents)
        
        for idx, chk in enumerate(chunks):
            vector = vectors[idx]
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
        
    except HTTPException as he:
        import traceback
        traceback.print_exc()
        db.rollback()
        if uploaded_in_storage:
            try:
                delete_rag_document(storage_path)
            except Exception as clean_err:
                print(f"[ERROR] [RAG INGESTION] Compensating storage cleanup failed for {storage_path}: {clean_err}", flush=True)
        raise he
    except Exception as e:
        import traceback
        traceback.print_exc()
        db.rollback()
        if uploaded_in_storage:
            try:
                delete_rag_document(storage_path)
            except Exception as clean_err:
                print(f"[ERROR] [RAG INGESTION] Compensating storage cleanup failed for {storage_path}: {clean_err}", flush=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Incomplete RAG Ingestion Pipeline. Database transaction rolled back. Error: {str(e)}"
        )

def retrieve_similar_chunks(
    db: Session,
    query_text: str,
    limit: int = 5,
    hospital_id: Any = None
) -> List[Dict[str, Any]]:
    """
    Retrieves document chunks matching query text using pgvector similarity search in PostgreSQL.
    Filters result to include matching hospital scope (both global / IS NULL and the allowed hospital_id).
    """
    query_vector = get_embeddings(query_text)
    
    # 1 - (c.embedding <=> :query_vector) is Cosine Similarity.
    # We restrict documents using Cosine Similarity > 0.70.
    sql = text("""
        SELECT 
            c.id AS chunk_id, 
            c.content AS content, 
            d.title AS document_title,
            1 - (c.embedding <=> CAST(:query_vector AS vector)) AS similarity_score
        FROM document_chunks c
        JOIN rag_documents d ON c.document_id = d.id
        WHERE (d.hospital_id IS NULL OR d.hospital_id = :hospital_id)
          AND 1 - (c.embedding <=> CAST(:query_vector AS vector)) > 0.70
        ORDER BY similarity_score DESC
        LIMIT :limit
    """)
    
    # Convert query_vector to the text representation format for pgvector casting
    vector_str = "[" + ",".join(map(str, query_vector)) + "]"
    
    params = {
        "query_vector": vector_str,
        "hospital_id": str(hospital_id) if hospital_id else None,
        "limit": limit
    }
    
    rs = db.execute(sql, params).fetchall()
    return [
        {
            "chunk_id": str(r.chunk_id),
            "content": r.content,
            "document_title": r.document_title,
            "similarity_score": float(r.similarity_score)
        } for r in rs
    ]
