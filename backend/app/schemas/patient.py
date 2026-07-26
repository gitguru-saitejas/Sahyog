from pydantic import BaseModel
from typing import Optional, Union
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
