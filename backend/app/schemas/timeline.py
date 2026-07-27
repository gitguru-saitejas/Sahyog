from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class ClinicalSeverity(str, Enum):
    CRITICAL = "CRITICAL"       # 🔴 Emergency, ICU, Surgery
    MODERATE = "MODERATE"       # 🟠 Admission, Imaging
    ROUTINE = "ROUTINE"         # 🟢 Follow-up, Consultation, Prescription
    ADMINISTRATIVE = "ADMIN"    # 🔵 Document Upload

class TimelineCategory(str, Enum):
    ALL = "ALL"
    CONSULTATION = "CONSULTATION"
    PRESCRIPTION = "PRESCRIPTION"
    LAB_REPORT = "LAB_REPORT"
    IMAGING = "IMAGING"
    ADMISSION = "ADMISSION"
    SURGERY = "SURGERY"
    UPLOADED_RECORD = "UPLOADED_RECORD"

class SubEvent(BaseModel):
    id: str
    type: str  # e.g., "CHIEF_COMPLAINT", "DIAGNOSIS", "PRESCRIPTION", "LAB_REPORT", "ATTACHMENT"
    title: str
    description: str
    details: Optional[Dict[str, Any]] = None

class EncounterTimelineCard(BaseModel):
    encounter_id: str
    patient_id: str
    encounter_date: datetime
    year: int
    hospital_name: str
    doctor_name: str
    doctor_specialization: Optional[str] = ""
    department_name: Optional[str] = ""
    severity: ClinicalSeverity
    category: TimelineCategory
    status: str
    primary_diagnosis: Optional[str] = "General Consultation"
    chief_complaint: Optional[str] = ""
    clinical_notes: Optional[str] = ""
    sub_events: List[SubEvent] = []
    vitals_summary: Optional[Dict[str, Any]] = {}
    prescriptions: List[Dict[str, Any]] = []
    attachments: List[Dict[str, Any]] = []

class TimelineResponse(BaseModel):
    patient_id: str
    total_encounters: int
    years_available: List[int]
    encounters: List[EncounterTimelineCard]

class PatientHeaderResponse(BaseModel):
    patient_id: str
    patient_code: str
    first_name: str
    last_name: str
    full_name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    phone_number: Optional[str] = None
    allergies: List[Dict[str, Any]] = []
    conditions: List[Dict[str, Any]] = []
    emergency_contact: Optional[Dict[str, Any]] = None

class AISummaryResponse(BaseModel):
    patient_id: str
    encounter_id: Optional[str] = None
    is_cached: bool = True
    overall_summary: str
    key_deltas: List[str] = []
    generated_at: datetime
