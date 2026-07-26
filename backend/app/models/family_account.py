from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from app.database.session import Base

def generate_uuid():
    return str(uuid.uuid4())

class FamilyAccount(Base):
    __tablename__ = "family_accounts"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    phone_number = Column(String(20), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    patients = relationship("Patient", back_populates="family_account", cascade="all, delete-orphan")
    sessions = relationship("FamilySession", back_populates="family_account", cascade="all, delete-orphan")

class FamilySession(Base):
    __tablename__ = "family_sessions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    family_account_id = Column(UUID(as_uuid=False), ForeignKey("family_accounts.id", ondelete="CASCADE"), nullable=False)
    refresh_token = Column(String(500), nullable=False, unique=True)
    ip_address = Column(String(45))
    user_agent = Column(String)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    family_account = relationship("FamilyAccount", back_populates="sessions")

class OTPVerification(Base):
    __tablename__ = "otp_verifications"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    phone_number = Column(String(20), nullable=False)
    otp_hash = Column(String(255), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    verified = Column(Boolean, default=False, nullable=False)
    attempt_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
