from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, JSON
from sqlalchemy.types import UserDefinedType
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from app.database.session import Base

def generate_uuid():
    return str(uuid.uuid4())

class PGVector(UserDefinedType):
    def __init__(self, dim=1536):
        self.dim = dim

    def get_col_spec(self, **kw):
        return f"vector({self.dim})"

    def bind_processor(self, dialect):
        def process(value):
            if value is None:
                return None
            if isinstance(value, str):
                return value
            return "[" + ",".join(map(str, value)) + "]"
        return process

    def result_processor(self, dialect, coltype):
        def process(value):
            if value is None:
                return None
            if isinstance(value, str):
                value = value.strip("[]")
                return [float(x) for x in value.split(",") if x.strip()]
            return value
        return process

class RagDocument(Base):
    __tablename__ = "rag_documents"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    hospital_id = Column(UUID(as_uuid=False), ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=True)
    uploaded_by = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    file_url = Column(String, nullable=False)
    category = Column(String(100), nullable=False)
    version = Column(String(50), nullable=False, default="1.0")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    hospital = relationship("Hospital")
    uploader = relationship("User")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")

class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    document_id = Column(UUID(as_uuid=False), ForeignKey("rag_documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(String, nullable=False)
    embedding = Column(PGVector(1536), nullable=False)
    metadata_dict = Column("metadata", JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    document = relationship("RagDocument", back_populates="chunks")
