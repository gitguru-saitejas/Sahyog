from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from app.database.session import Base

def generate_uuid():
    return str(uuid.uuid4())

class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    address = Column(String, nullable=False)
    contact_number = Column(String(20), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    logo_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    admins = relationship("HospitalAdmin", back_populates="hospital", cascade="all, delete-orphan")
    departments = relationship("Department", back_populates="hospital", cascade="all, delete-orphan")
    doctors = relationship("Doctor", back_populates="hospital", cascade="all, delete-orphan")

class HospitalAdmin(Base):
    __tablename__ = "hospital_admins"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    hospital_id = Column(UUID(as_uuid=False), ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User")
    hospital = relationship("Hospital", back_populates="admins")

class Department(Base):
    __tablename__ = "departments"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    hospital_id = Column(UUID(as_uuid=False), ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    hospital = relationship("Hospital", back_populates="departments")
    doctors = relationship("Doctor", back_populates="department")

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    hospital_id = Column(UUID(as_uuid=False), ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=False)
    department_id = Column(UUID(as_uuid=False), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    license_number = Column(String(100), nullable=False, unique=True)
    specialization = Column(String(150), nullable=False)
    experience_years = Column(Integer, nullable=False)
    bio = Column(String, nullable=True)
    consultation_fee = Column(Numeric(10, 2), nullable=False, default=0.00)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User")
    hospital = relationship("Hospital", back_populates="doctors")
    department = relationship("Department", back_populates="doctors")
