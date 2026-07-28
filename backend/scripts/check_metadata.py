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
    print(f"Connected to database URL: {db.bind.url}")
    chunks = db.query(DocumentChunk).all()
    print(f"Total chunks in database: {len(chunks)}")
    for idx, c in enumerate(chunks):
        print(f"Chunk ID: {c.id} | Document: '{c.document.title}' | Metadata: {c.metadata_dict}")
finally:
    db.close()
