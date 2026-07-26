from sqlalchemy import Column, String, Date, DateTime, ForeignKey, Boolean, Integer, Float
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

from app.models.hospital import Hospital, Department

class HospitalUser(Base):
    __tablename__ = "hospital_users"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    hospital_id = Column(UUID(as_uuid=False), ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(String(50), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False) # HOSPITAL_ADMIN, DOCTOR, SUPPORT_STAFF
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    department_id = Column(UUID(as_uuid=False), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(20), default="ACTIVE", nullable=False) # ACTIVE, INACTIVE, LOCKED
    is_first_login = Column(Boolean, default=True, nullable=False)  # True when employee uses a temp password
    password_changed = Column(Boolean, default=False, nullable=False)  # False until employee sets own password
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    department = orm_relationship("Department")
    doctor_profile = orm_relationship("DoctorProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    support_staff_profile = orm_relationship("SupportStaffProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")

    @property
    def specialization(self):
        return self.doctor_profile.specialization if self.doctor_profile else ""

    @property
    def qualification(self):
        return self.doctor_profile.qualification if self.doctor_profile else ""

    @property
    def license_number(self):
        return self.doctor_profile.license_number if self.doctor_profile else ""

    @property
    def experience(self):
        return self.doctor_profile.experience if self.doctor_profile else 0

    @property
    def bio(self):
        return self.doctor_profile.bio if self.doctor_profile else None

    @property
    def designation(self):
        return self.support_staff_profile.designation if self.support_staff_profile else ""


class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"

    user_id = Column(UUID(as_uuid=False), ForeignKey("hospital_users.id", ondelete="CASCADE"), primary_key=True)
    specialization = Column(String(150), nullable=False)
    qualification = Column(String(150), nullable=False)
    license_number = Column(String(100), nullable=False, unique=True)
    experience = Column(Integer, default=0, nullable=False)
    bio = Column(String(1000), nullable=True)

    user = orm_relationship("HospitalUser", back_populates="doctor_profile")

class SupportStaffProfile(Base):
    __tablename__ = "support_staff_profiles"

    user_id = Column(UUID(as_uuid=False), ForeignKey("hospital_users.id", ondelete="CASCADE"), primary_key=True)
    designation = Column(String(100), nullable=False)
    department_id = Column(UUID(as_uuid=False), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)

    user = orm_relationship("HospitalUser", back_populates="support_staff_profile")

class Encounter(Base):
    __tablename__ = "encounters"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    patient_id = Column(UUID(as_uuid=False), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    hospital_id = Column(UUID(as_uuid=False), ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=False)
    staff_id = Column(UUID(as_uuid=False), ForeignKey("hospital_users.id", ondelete="SET NULL"), nullable=True)
    doctor_id = Column(UUID(as_uuid=False), ForeignKey("hospital_users.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(30), default="PENDING", nullable=False) # PENDING, COMPLETED, CANCELLED

    # Vitals (All optional)
    height = Column(Float, nullable=True)
    weight = Column(Float, nullable=True)
    bmi = Column(Float, nullable=True)
    temperature = Column(Float, nullable=True)
    blood_pressure = Column(String(50), nullable=True)
    pulse_rate = Column(Integer, nullable=True)
    respiratory_rate = Column(Integer, nullable=True)
    spo2 = Column(Integer, nullable=True)

    # Clinical Info (All optional)
    chief_complaint = Column(String(1000), nullable=True)
    symptoms = Column(String(1000), nullable=True)
    symptoms_duration = Column(String(255), nullable=True)
    clinical_notes = Column(String(2000), nullable=True)

    # Lab Results (All optional)
    blood_group = Column(String(10), nullable=True)
    blood_sugar = Column(String(50), nullable=True)
    cbc = Column(String(500), nullable=True)
    urine_test = Column(String(500), nullable=True)
    ecg = Column(String(500), nullable=True)
    other_labs = Column(String(1000), nullable=True)

    # Optional File Uploads
    uploaded_files = Column(String(2000), nullable=True) # comma-separated list of URLs or file names

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    patient = orm_relationship("Patient")
    doctor = orm_relationship("HospitalUser", foreign_keys=[doctor_id])
    staff = orm_relationship("HospitalUser", foreign_keys=[staff_id])
    prescription = orm_relationship("Prescription", back_populates="encounter", uselist=False, cascade="all, delete-orphan")

class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    encounter_id = Column(UUID(as_uuid=False), ForeignKey("encounters.id", ondelete="CASCADE"), nullable=False)
    patient_id = Column(UUID(as_uuid=False), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(UUID(as_uuid=False), ForeignKey("hospital_users.id", ondelete="CASCADE"), nullable=False)
    diagnosis = Column(String(1000), nullable=True)
    notes = Column(String(2000), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    encounter = orm_relationship("Encounter", back_populates="prescription")
    patient = orm_relationship("Patient")
    doctor = orm_relationship("HospitalUser")
    medicines = orm_relationship("PrescriptionMedicine", back_populates="prescription", cascade="all, delete-orphan")

class PrescriptionMedicine(Base):
    __tablename__ = "prescription_medicines"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    prescription_id = Column(UUID(as_uuid=False), ForeignKey("prescriptions.id", ondelete="CASCADE"), nullable=False)
    medicine_name = Column(String(255), nullable=False)
    strength = Column(String(100), nullable=True)
    frequency = Column(String(100), nullable=True)
    duration = Column(String(100), nullable=True)
    instructions = Column(String(500), nullable=True)

    prescription = orm_relationship("Prescription", back_populates="medicines")

class HospitalAuditLog(Base):
    __tablename__ = "hospital_audit_logs"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    hospital_id = Column(UUID(as_uuid=False), ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=False), ForeignKey("hospital_users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)
    resource = Column(String(100), nullable=False)
    resource_id = Column(String(100), nullable=True)
    ip_address = Column(String(45), nullable=True)
    details = Column(String(2000), nullable=True) # JSON details string
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

