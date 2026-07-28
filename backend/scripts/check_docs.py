import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.session import SessionLocal
from app.models import family_account, patient, user, hospital, rag, audit
from app.models.hospital import Hospital
from app.models.user import User
from app.models.rag import RagDocument, DocumentChunk

db = SessionLocal()
try:
    docs = db.query(RagDocument).filter(RagDocument.title.like("%Patient Guidance%")).all()
    print(f"Found {len(docs)} documents:")
    for d in docs:
        chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == d.id).all()
        print(f"Doc ID: {d.id} | Title: '{d.title}' | Chunks count: {len(chunks)}")
        if chunks:
            print(f"   First chunk metadata: {chunks[0].metadata_dict}")
finally:
    db.close()
