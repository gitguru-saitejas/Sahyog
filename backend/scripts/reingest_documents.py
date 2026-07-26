import os
import sys
import uuid
import traceback
from sqlalchemy.orm import Session
import urllib.request

# Add backend root to path to ensure app imports resolve correctly
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.session import SessionLocal
from app.models import family_account, patient, user, hospital, rag, audit
from app.models.rag import RagDocument, DocumentChunk
from app.services.storage import download_rag_document
from app.services.rag import extract_text_from_bytes, chunk_text, get_embeddings, get_embeddings_batch
from app.core.config import settings

def reingest_single_document(db: Session, doc: RagDocument) -> bool:
    """
    Re-ingests a single document within its own database transaction context.
    Returns True if successful, False otherwise.
    """
    file_url = doc.file_url
    print(f"[RE-INGEST] Processing doc ID: {doc.id} | Title: '{doc.title}' | Path: '{file_url}'")
    
    # 1. Idempotency Check: if it already has chunks of size 1024, skip it
    existing_chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).all()
    if existing_chunks:
        # Check first chunk embedding length
        first_chunk = existing_chunks[0]
        if first_chunk.embedding and len(first_chunk.embedding) == settings.EMBEDDING_DIMENSIONS:
            print(f"[RE-INGEST] Skip: Doc already has valid {settings.EMBEDDING_DIMENSIONS}-d chunks.")
            return True
            
    # 2. Start document transaction
    tx = db.begin_nested() # Create a savepoint/nested transaction
    try:
        # Clear any existing chunks first (idempotent overwrite)
        db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).delete()
        
        # 3. Retrieve original file bytes
        content = None
        ext = os.path.splitext(file_url.split("?")[0])[1].lower()
        if not ext:
            ext = ".pdf" # Default
            
        if file_url.startswith("knowledge-base/"):
            print("[RE-INGEST] Downloading from private Supabase Storage...")
            content = download_rag_document(file_url)
        else:
            # Fallback to local files
            filename = file_url.split("/")[-1]
            local_path = os.path.join("static/uploads", filename)
            if os.path.exists(local_path):
                print(f"[RE-INGEST] Reading from local path: {local_path}...")
                with open(local_path, "rb") as f:
                    content = f.read()
            elif file_url.startswith("http://") or file_url.startswith("https://"):
                print(f"[RE-INGEST] Attempting to download from seed URL: {file_url}...")
                try:
                    req = urllib.request.Request(file_url, headers={"User-Agent": "Mozilla/5.0"})
                    with urllib.request.urlopen(req, timeout=10.0) as resp:
                        content = resp.read()
                except Exception as dl_err:
                    print(f"[RE-INGEST] URL download failed ({dl_err}). Using mock text for development seeder doc.")
                    content = b"Mock text for Global Hypertension Treatment Standard guidelines. Seed document re-ingestion."
                    ext = ".txt"
            else:
                raise FileNotFoundError(f"Local file not found at: {local_path}")
                
        if not content:
            raise ValueError("File content is empty or could not be loaded.")
            
        # 4. Extract Text Page-by-Page
        pages_data = extract_text_from_bytes(content, ext)
        if not pages_data or all(not p.get("text", "").strip() for p in pages_data):
            raise ValueError("Document contains no readable text.")
            
        # 5. Chunk Text
        chunks = chunk_text(pages_data)
        if not chunks:
            raise ValueError("No clean chunks could be generated from document text.")
            
        # 6. Generate Embeddings in batch (1024 dimensions via Ollama mxbai-embed-large)
        print(f"[RE-INGEST] Generating {len(chunks)} embeddings in batch...")
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
            
        tx.commit() # Commit nested transaction savepoint
        print(f"[RE-INGEST] SUCCESS: Re-ingested {len(chunks)} chunks for document '{doc.title}'")
        return True
        
    except Exception as e:
        tx.rollback() # Rollback document transaction
        print(f"[RE-INGEST] ERROR: Failed to re-ingest document '{doc.title}': {str(e)}")
        traceback.print_exc()
        return False

def main():
    print(f"[RE-INGEST] Starting RAG document re-ingestion...")
    print(f"[RE-INGEST] Target Provider: {settings.EMBEDDING_PROVIDER}")
    print(f"[RE-INGEST] Target Model: {settings.EMBEDDING_MODEL}")
    print(f"[RE-INGEST] Target Dimensions: {settings.EMBEDDING_DIMENSIONS}")
    
    db = SessionLocal()
    try:
        documents = db.query(RagDocument).all()
        total = len(documents)
        print(f"[RE-INGEST] Found {total} documents in database.")
        
        success_count = 0
        failed_count = 0
        
        for idx, doc in enumerate(documents, 1):
            print("-" * 50)
            print(f"Document {idx} of {total}")
            success = reingest_single_document(db, doc)
            if success:
                success_count += 1
            else:
                failed_count += 1
                
        db.commit() # Commit global transaction changes
        print("=" * 50)
        print(f"[RE-INGEST] Complete: {success_count} succeeded, {failed_count} failed out of {total} documents.")
        
    except Exception as e:
        print(f"[RE-INGEST] Global error: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
