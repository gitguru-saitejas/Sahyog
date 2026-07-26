from pydantic import BaseModel
from typing import Optional, Union, List
from datetime import date
from uuid import UUID

class PatientResponse(BaseModel):
    id: Union[str, UUID]
    patient_code: str
    family_account_id: Union[str, UUID]
    first_name: str
    last_name: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    relation: str
    aadhaar_last4: str
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None

    class Config:
        from_attributes = True

class PatientCreate(BaseModel):
    first_name: str
    last_name: str
    aadhaar: str
    dob: Optional[str] = ""
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    relation: str = "SPOUSE"
    
    address_line1: Optional[str] = ""
    address_line2: Optional[str] = ""
    city: Optional[str] = ""
    district: Optional[str] = ""
    state: Optional[str] = ""
    pincode: Optional[str] = ""
    
    emergency_name: Optional[str] = ""
    emergency_relationship: Optional[str] = ""
    emergency_phone: Optional[str] = ""

class AddFamilyMemberRequest(BaseModel):
    patientData: PatientCreate
    family_account_id: UUID

class LinkExistingRequest(BaseModel):
    family_account_id: UUID
    phone_number: str
    otp_code: str
    patient_aadhaar: str

class DepartmentCreate(BaseModel):
    name: str
    description: Optional[str] = None

class DepartmentResponse(BaseModel):
    id: UUID
    hospital_id: UUID
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

class DoctorCreate(BaseModel):
    employee_id: str
    password: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    department_id: Optional[UUID] = None
    specialization: str
    qualification: str
    license_number: str
    experience: Optional[int] = 0
    bio: Optional[str] = None

class DoctorUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    department_id: Optional[UUID] = None
    specialization: Optional[str] = None
    qualification: Optional[str] = None
    license_number: Optional[str] = None
    experience: Optional[int] = None
    bio: Optional[str] = None
    status: Optional[str] = None

class DoctorResponse(BaseModel):
    id: UUID
    employee_id: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str
    status: str
    department_id: Optional[UUID] = None
    specialization: str
    qualification: str
    license_number: str
    experience: int
    bio: Optional[str] = None

    class Config:
        from_attributes = True

class SupportStaffCreate(BaseModel):
    employee_id: str
    password: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    department_id: Optional[UUID] = None
    designation: str

class SupportStaffUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    department_id: Optional[UUID] = None
    designation: Optional[str] = None
    status: Optional[str] = None

class SupportStaffResponse(BaseModel):
    id: UUID
    employee_id: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str
    status: str
    department_id: Optional[UUID] = None
    designation: str

    class Config:
        from_attributes = True

class EncounterCreate(BaseModel):
    patient_id: UUID
    doctor_id: Optional[UUID] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    bmi: Optional[float] = None
    temperature: Optional[float] = None
    blood_pressure: Optional[str] = None
    pulse_rate: Optional[int] = None
    respiratory_rate: Optional[int] = None
    spo2: Optional[int] = None
    chief_complaint: Optional[str] = None
    symptoms: Optional[str] = None
    symptoms_duration: Optional[str] = None
    clinical_notes: Optional[str] = None
    blood_group: Optional[str] = None
    blood_sugar: Optional[str] = None
    cbc: Optional[str] = None
    urine_test: Optional[str] = None
    ecg: Optional[str] = None
    other_labs: Optional[str] = None
    uploaded_files: Optional[str] = None

class EncounterUpdate(BaseModel):
    doctor_id: Optional[UUID] = None
    status: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    bmi: Optional[float] = None
    temperature: Optional[float] = None
    blood_pressure: Optional[str] = None
    pulse_rate: Optional[int] = None
    respiratory_rate: Optional[int] = None
    spo2: Optional[int] = None
    chief_complaint: Optional[str] = None
    symptoms: Optional[str] = None
    symptoms_duration: Optional[str] = None
    clinical_notes: Optional[str] = None
    blood_group: Optional[str] = None
    blood_sugar: Optional[str] = None
    cbc: Optional[str] = None
    urine_test: Optional[str] = None
    ecg: Optional[str] = None
    other_labs: Optional[str] = None
    uploaded_files: Optional[str] = None

class EncounterResponse(BaseModel):
    id: UUID
    patient_id: UUID
    hospital_id: UUID
    staff_id: Optional[UUID] = None
    doctor_id: Optional[UUID] = None
    status: str
    height: Optional[float] = None
    weight: Optional[float] = None
    bmi: Optional[float] = None
    temperature: Optional[float] = None
    blood_pressure: Optional[str] = None
    pulse_rate: Optional[int] = None
    respiratory_rate: Optional[int] = None
    spo2: Optional[int] = None
    chief_complaint: Optional[str] = None
    symptoms: Optional[str] = None
    symptoms_duration: Optional[str] = None
    clinical_notes: Optional[str] = None
    blood_group: Optional[str] = None
    blood_sugar: Optional[str] = None
    cbc: Optional[str] = None
    urine_test: Optional[str] = None
    ecg: Optional[str] = None
    other_labs: Optional[str] = None
    uploaded_files: Optional[str] = None
    from_attributes: Optional[bool] = None

    class Config:
        from_attributes = True

class PrescriptionMedicineCreate(BaseModel):
    medicine_name: str
    strength: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    instructions: Optional[str] = None

class PrescriptionMedicineResponse(BaseModel):
    id: UUID
    medicine_name: str
    strength: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    instructions: Optional[str] = None

    class Config:
        from_attributes = True

class PrescriptionCreate(BaseModel):
    encounter_id: UUID
    patient_id: UUID
    diagnosis: Optional[str] = None
    notes: Optional[str] = None
    medicines: List[PrescriptionMedicineCreate] = []

class PrescriptionResponse(BaseModel):
    id: UUID
    encounter_id: UUID
    patient_id: UUID
    doctor_id: UUID
    diagnosis: Optional[str] = None
    notes: Optional[str] = None
    medicines: List[PrescriptionMedicineResponse] = []

    class Config:
        from_attributes = True

