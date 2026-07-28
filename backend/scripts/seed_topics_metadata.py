import os
import sys
import argparse
from sqlalchemy.orm import Session

# Add backend root to path to ensure app imports resolve correctly
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.session import SessionLocal
from app.models import family_account, patient, user, hospital, rag, audit
from app.models.hospital import Hospital
from app.models.user import User
from app.models.rag import RagDocument, DocumentChunk

# Explicit document title to guidance topic mapping
DOCUMENT_TOPIC_MAP = {
    "Hypertension Patient Guidance": "HYPERTENSION",
    "Diabetes Patient Guidance": "DIABETES",
    "Hospital A Patient Guidance": "HYPERTENSION",
    "Hospital B Patient Guidance": "HYPERTENSION"
}

def seed_topics(dry_run: bool = True):
    print("="*60)
    print("  SEED RAG TOPICS METADATA MIGRATION")
    print(f"  Dry-Run Mode: {dry_run}")
    print("="*60)
    
    db = SessionLocal()
    try:
        documents = db.query(RagDocument).all()
        print(f"Found {len(documents)} documents in database.\n")
        
        updated_docs = 0
        total_chunks_updated = 0
        
        for doc in documents:
            proposed_topic = DOCUMENT_TOPIC_MAP.get(doc.title)
            
            # Skip if document has no approved topic in map (e.g. Asthma, Operations, etc.)
            if not proposed_topic:
                print(f"[-] Skip: '{doc.title}' (ID: {doc.id}) - No approved topic mapping (will remain untagged).")
                continue
                
            chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).all()
            print(f"[+] Match: '{doc.title}' (ID: {doc.id})")
            print(f"    Approved Topic: {proposed_topic}")
            print(f"    Affected Chunks: {len(chunks)}")
            
            for chunk in chunks:
                current_meta = chunk.metadata_dict or {}
                proposed_meta = {**current_meta, "guidance_topic": proposed_topic}
                
                # Print preview of changes for the first chunk
                if chunk == chunks[0]:
                    print(f"    Sample Metadata Change (Chunk index {chunk.chunk_index}):")
                    print(f"      Before: {current_meta}")
                    print(f"      After:  {proposed_meta}")
                
                if not dry_run:
                    # SQLAlchemy mutable JSON column requires reassignment or flag modified
                    chunk.metadata_dict = proposed_meta
                    db.add(chunk)
                    
            updated_docs += 1
            total_chunks_updated += len(chunks)
            print("-" * 50)
            
        if not dry_run:
            db.commit()
            print(f"\nSUCCESS: Committed updates for {updated_docs} documents ({total_chunks_updated} chunks).")
        else:
            print(f"\nDRY-RUN COMPLETE: No changes written. Proposed updates affect {updated_docs} documents ({total_chunks_updated} chunks).")
            
    except Exception as e:
        db.rollback()
        print(f"\nMigration failed: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed RAG topics metadata")
    parser.add_argument("--execute", action="store_true", help="Commit changes to database (default is dry-run)")
    args = parser.parse_args()
    
    seed_topics(dry_run=not args.execute)
