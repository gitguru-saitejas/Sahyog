import os
import hashlib
import math
import json
import uuid
import urllib.request
import urllib.error
from io import BytesIO
from typing import List, Dict, Any, Tuple, Optional
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
    """Retrieves embeddings from OpenAI or local Ollama if configured, based on settings configuration. Raises ValueError if validation fails."""
    from app.core.config import settings
    openai_key = os.getenv("OPENAI_API_KEY")
    ollama_url = os.getenv("OLLAMA_API_URL") or settings.OLLAMA_API_URL # E.g. http://localhost:11434
    
    dim = settings.EMBEDDING_DIMENSIONS
    
    if not openai_key and not ollama_url:
        import random
        import hashlib
        print(f"[RAG SERVICE] WARNING: No embedding provider (OpenAI/Ollama) configured. Using dummy mock embeddings of size {dim}.")
        seed_val = int(hashlib.md5(text.encode("utf-8")).hexdigest(), 16) % 10000000
        rng = random.Random(seed_val)
        return [rng.uniform(-0.1, 0.1) for _ in range(dim)]

    embedding = None

    # 1. Try OpenAI if key is present
    if openai_key:
        try:
            model = "text-embedding-3-small" if dim == 1536 else "text-embedding-3-large"
            req = urllib.request.Request(
                "https://api.openai.com/v1/embeddings",
                data=json.dumps({
                    "input": text,
                    "model": model
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
            # Query standard /api/embed endpoint
            url = f"{ollama_url.rstrip('/')}/api/embed"
            payload = {
                "model": settings.EMBEDDING_MODEL,
                "input": text
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=30) as response:
                res = json.loads(response.read().decode("utf-8"))
                if "embeddings" in res:
                    embedding = res["embeddings"][0]
                elif "embedding" in res:
                    embedding = res["embedding"]
        except Exception as e:
            # Fallback to legacy /api/embeddings
            try:
                legacy_url = f"{ollama_url.rstrip('/')}/api/embeddings"
                legacy_payload = {
                    "model": settings.EMBEDDING_MODEL,
                    "prompt": text
                }
                req = urllib.request.Request(
                    legacy_url,
                    data=json.dumps(legacy_payload).encode("utf-8"),
                    headers={"Content-Type": "application/json"},
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=30) as response:
                    res = json.loads(response.read().decode("utf-8"))
                    embedding = res["embedding"]
            except Exception as legacy_err:
                print(f"[RAG SERVICE] Ollama embedding request failed: {e} | {legacy_err}")
                raise ValueError(f"Ollama embedding generation failed: {str(e)}")

    # 3. Validate Dimensions
    if embedding is None:
        raise ValueError("Embedding generation returned empty response from provider.")
        
    if len(embedding) != dim:
        raise ValueError(f"Incompatible embedding dimensions. Provider returned {len(embedding)} dimensions, expected {dim}.")

    return embedding

def ingest_document(
    db: Session,
    hospital_id: Any,
    uploaded_by: Any,
    title: str,
    category: str,
    version: str,
    file: UploadFile,
    guidance_topic: Optional[str] = None
) -> RagDocument:
    """Orchestrates file upload to Supabase storage, memory-based extraction, embedding generation, database inserts, and compensating cleanup."""
    # 1. Validation
    ALLOWED_CATEGORIES = {
        "CLINICAL_STANDARDS",
        "PATIENT_GUIDANCE",
        "HOSPITAL_OPERATIONS",
        "GOVERNMENT_SCHEMES",
        "OTHER"
    }
    if category not in ALLOWED_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported category '{category}'. Must be one of {ALLOWED_CATEGORIES}"
        )

    # Normalize guidance topic
    normalized_topic = None
    if guidance_topic and guidance_topic.strip():
        normalized_topic = guidance_topic.strip()


    # Validate guidance topic if provided
    from app.core.config import validate_guidance_topic
    try:
        validated_topic = validate_guidance_topic(normalized_topic)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )

    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension {ext}. Only PDF and TXT guidelines are supported."
        )

    # File size validation
    try:
        contents = file.file.read()
        file_size = len(contents)
        file.file.seek(0)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read file size: {str(e)}"
        )

    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds maximum limit of 10MB."
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

    # 3. Upload Guideline raw file to storage (Compensating action target)
    uploaded_in_storage = False
    try:
        content_type = "application/pdf" if ext == ".pdf" else "text/plain"
        upload_rag_document(storage_path, contents, content_type)
        uploaded_in_storage = True
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Storage upload failed: {str(e)}"
        )

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

        # Guidance topic already validated at the beginning of ingest_document

        # 7. Generate embeddings and chunks
        from app.core.config import settings
        for chk in chunks:
            vector = get_embeddings(chk["content"])
            if not vector or len(vector) != settings.EMBEDDING_DIMENSIONS:
                raise ValueError(f"Incompatible embedding dimensions. Received {len(vector) if vector else 0} dimensions, expected {settings.EMBEDDING_DIMENSIONS}.")
                
            metadata = chk["metadata"] or {}
            if validated_topic:
                metadata["guidance_topic"] = validated_topic

            chunk_record = DocumentChunk(
                document_id=doc.id,
                chunk_index=chk["chunk_index"],
                content=chk["content"],
                embedding=vector,
                metadata_dict=metadata
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

def retrieve_similar_chunks(
    db: Session,
    query_text: str,
    limit: int = 5,
    hospital_id: Any = None,
    category: Optional[str] = None,
    threshold: float = 0.50,
    guidance_topic: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Retrieves document chunks matching query text using pgvector similarity search in PostgreSQL.
    Filters result to include matching hospital scope (both global / IS NULL and the allowed hospital_id),
    and optionally filters by the category (e.g. PATIENT_GUIDANCE).
    Supports a Python-based cosine similarity fallback if running on an SQLite database.
    """
    from sqlalchemy import text
    
    # 0. Basic validation for empty/invalid query text
    if not query_text or not query_text.strip():
        return []
        
    query_vector = get_embeddings(query_text)
    
    # 1. SQLite Fallback (Computes cosine similarity in Python)
    if db.bind.dialect.name == "sqlite":
        # Query chunks and join documents to apply scope and category filters
        query = db.query(DocumentChunk).join(RagDocument)
        
        # Apply hospital scope filter
        if hospital_id:
            query = query.filter((RagDocument.hospital_id == None) | (RagDocument.hospital_id == str(hospital_id)))
        else:
            query = query.filter(RagDocument.hospital_id == None)
            
        # Apply category filter
        if category:
            query = query.filter(RagDocument.category == category)
            
        chunks = query.all()
        
        results = []
        for c in chunks:
            if not c.embedding or len(c.embedding) != len(query_vector):
                continue
            
            # Apply guidance topic filtering (excludes untagged chunks when topic is selected)
            if guidance_topic:
                meta = c.metadata_dict or {}
                if meta.get("guidance_topic") != guidance_topic.upper():
                    continue

            # Compute Cosine Similarity = dot(A, B) / (norm(A) * norm(B))
            dot_product = sum(a * b for a, b in zip(query_vector, c.embedding))
            norm_a = math.sqrt(sum(a * a for a in query_vector))
            norm_b = math.sqrt(sum(b * b for b in c.embedding))
            if norm_a == 0 or norm_b == 0:
                score = 0.0
            else:
                score = dot_product / (norm_a * norm_b)
            
            # Filter by threshold
            if score > threshold:
                results.append({
                    "chunk_id": str(c.id),
                    "content": c.content,
                    "document_title": c.document.title,
                    "document_category": c.document.category,
                    "hospital_id": c.document.hospital_id,
                    "similarity_score": score
                })
        
        # Sort by similarity score descending and return Top-K
        results.sort(key=lambda x: x["similarity_score"], reverse=True)
        return results[:limit]

    # 2. PostgreSQL (pgvector) Implementation
    # 1 - (c.embedding <=> :query_vector) is Cosine Similarity.
    sql_str = """
        SELECT 
            c.id AS chunk_id, 
            c.content AS content, 
            d.title AS document_title,
            d.category AS document_category,
            d.hospital_id AS hospital_id,
            1 - (c.embedding <=> CAST(:query_vector AS vector)) AS similarity_score
        FROM document_chunks c
        JOIN rag_documents d ON c.document_id = d.id
        WHERE 1=1
    """
    
    # Apply hospital scope
    if hospital_id:
        sql_str += " AND (d.hospital_id IS NULL OR d.hospital_id = :hospital_id)"
    else:
        sql_str += " AND d.hospital_id IS NULL"
        
    # Apply category filter
    if category:
        sql_str += " AND d.category = :category"

    # Apply guidance topic filter (excludes untagged chunks when topic is selected)
    if guidance_topic:
        sql_str += " AND c.metadata->>'guidance_topic' = :guidance_topic"
        
    # Apply similarity threshold
    sql_str += " AND 1 - (c.embedding <=> CAST(:query_vector AS vector)) > :threshold"
    sql_str += " ORDER BY similarity_score DESC LIMIT :limit"
    
    # Convert query_vector to the text representation format for pgvector casting
    vector_str = "[" + ",".join(map(str, query_vector)) + "]"
    
    params = {
        "query_vector": vector_str,
        "hospital_id": str(hospital_id) if hospital_id else None,
        "category": category,
        "threshold": threshold,
        "limit": limit
    }
    if guidance_topic:
        params["guidance_topic"] = guidance_topic.upper()
    
    rs = db.execute(text(sql_str), params).fetchall()
    return [
        {
            "chunk_id": str(r.chunk_id),
            "content": r.content,
            "document_title": r.document_title,
            "document_category": r.document_category,
            "hospital_id": r.hospital_id,
            "similarity_score": float(r.similarity_score)
        } for r in rs
    ]


def diversify_chunks(
    chunks: List[Dict[str, Any]],
    final_limit: int = 8,
    max_per_document: int = 2
) -> List[Dict[str, Any]]:
    """
    Diversifies the retrieved chunks by limiting the number of chunks from the same document.
    Assumes chunks are sorted by similarity_score descending.
    """
    selected = []
    unused = []
    doc_counts = {}

    # First pass: limit chunks per document
    for chunk in chunks:
        doc_title = chunk.get("document_title")
        count = doc_counts.get(doc_title, 0)
        if count < max_per_document and len(selected) < final_limit:
            selected.append(chunk)
            doc_counts[doc_title] = count + 1
        else:
            unused.append(chunk)

    # Second pass: fill remaining slots with highest-scoring unused chunks
    if len(selected) < final_limit:
        for chunk in unused:
            if len(selected) >= final_limit:
                break
            selected.append(chunk)

    return selected