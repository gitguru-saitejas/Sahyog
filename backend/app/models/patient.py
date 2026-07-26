from sqlalchemy import Column, String, Date, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship as orm_relationship
import uuid
from datetime import datetime, timezone
from app.database.session import Base

def generate_uuid():
    return str(uuid.uuid4())

class Patient(Base):
    __tablename__ = "patients"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    patient_code = Column(String(6), nullable=False, unique=True)  # Human-readable 6-digit ID
    family_account_id = Column(UUID(as_uuid=False), ForeignKey("family_accounts.id", ondelete="CASCADE"), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String(50), nullable=True)
    blood_group = Column(String(5), nullable=True)
    relation = Column(String(50), default='SELF', nullable=False)
    aadhaar_hash = Column(String(64), nullable=False, unique=True)
    aadhaar_last4 = Column(String(4), nullable=False)
    address_line1 = Column(String(255), nullable=True)
    address_line2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    pincode = Column(String(6), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    family_account = orm_relationship("FamilyAccount", back_populates="patients")
    emergency_contact = orm_relationship("PatientEmergencyContact", back_populates="patient", uselist=False, cascade="all, delete-orphan")
    conditions = orm_relationship("PatientCondition", back_populates="patient", cascade="all, delete-orphan")
    allergies = orm_relationship("PatientAllergy", back_populates="patient", cascade="all, delete-orphan")
    medications = orm_relationship("PatientMedication", back_populates="patient", cascade="all, delete-orphan")
    consents = orm_relationship("PatientConsent", back_populates="patient", cascade="all, delete-orphan")

class PatientEmergencyContact(Base):
    __tablename__ = "patient_emergency_contacts"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    patient_id = Column(UUID(as_uuid=False), ForeignKey("patients.id", ondelete="CASCADE"), unique=True, nullable=False)
    name = Column(String(150), nullable=False)
    relationship = Column(String(50), nullable=False)
    phone_number = Column(String(20), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    patient = orm_relationship("Patient", back_populates="emergency_contact")

class PatientCondition(Base):
    __tablename__ = "patient_conditions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    patient_id = Column(UUID(as_uuid=False), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    condition_name = Column(String(255), nullable=False)
    diagnosed_date = Column(Date, nullable=True)
    status = Column(String(50), default="ACTIVE")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    patient = orm_relationship("Patient", back_populates="conditions")

class PatientAllergy(Base):
    __tablename__ = "patient_allergies"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    patient_id = Column(UUID(as_uuid=False), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    allergen = Column(String(255), nullable=False)
    severity = Column(String(20), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    patient = orm_relationship("Patient", back_populates="allergies")

class PatientMedication(Base):
    __tablename__ = "patient_medications"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    patient_id = Column(UUID(as_uuid=False), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    medicine_name = Column(String(255), nullable=False)
    dosage = Column(String(100), nullable=False)
    frequency = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    patient = orm_relationship("Patient", back_populates="medications")

class PatientConsent(Base):
    __tablename__ = "patient_consents"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    patient_id = Column(UUID(as_uuid=False), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    consent_type = Column(String(100), nullable=False)
    accepted = Column(Boolean, default=True, nullable=False)
    accepted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    ip_address = Column(String(45), nullable=True)
    version = Column(String(20), nullable=False)

    patient = orm_relationship("Patient", back_populates="consents")
