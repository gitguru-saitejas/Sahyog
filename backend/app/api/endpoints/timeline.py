from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
import uuid as uuid_lib

from app.database.session import get_db
from app.models.patient import Patient, HospitalUser
from app.api.endpoints.auth import require_hospital_user
from app.schemas.timeline import (
    TimelineResponse, PatientHeaderResponse, AISummaryResponse, EncounterTimelineCard
)
from app.services.timeline import TimelineService
from app.services.ai_summarizer import AISummarizerService

router = APIRouter()

def _is_valid_uuid(value: str) -> bool:
    try:
        uuid_lib.UUID(value)
        return True
    except (ValueError, AttributeError):
        return False

@router.get("/code/{patient_code}/full-profile", response_model=PatientHeaderResponse)
def get_patient_header_by_code(
    patient_code: str,
    db: Session = Depends(get_db),
    current_user: HospitalUser = Depends(require_hospital_user)
):
    """Retrieves patient header, allergies, chronic conditions, and demographics by patient code or ID."""
    # Only add UUID filter when the input is actually a valid UUID —
    # otherwise PostgreSQL raises InvalidTextRepresentation casting e.g. "P-1001" to UUID.
    if _is_valid_uuid(patient_code):
        patient = db.query(Patient).filter(
            or_(Patient.patient_code == patient_code, Patient.id == patient_code)
        ).first()
    else:
        patient = db.query(Patient).filter(
            Patient.patient_code == patient_code
        ).first()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient profile with ID/Code '{patient_code}' was not found in the health system."
        )

    service = TimelineService(db)
    return service.get_patient_header(patient)

@router.get("/{patient_id}", response_model=TimelineResponse)
def get_patient_timeline(
    patient_id: str,
    category: Optional[str] = Query(None, description="Filter by category: ALL, CONSULTATION, PRESCRIPTION, LAB_REPORT, IMAGING, ADMISSION, SURGERY"),
    year: Optional[int] = Query(None, description="Filter by year e.g. 2026"),
    search_query: Optional[str] = Query(None, description="Search across diagnoses, doctors, and notes"),
    db: Session = Depends(get_db),
    current_user: HospitalUser = Depends(require_hospital_user)
):
    """Retrieves standard encounter-centric medical timeline events for a patient."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found."
        )

    service = TimelineService(db)
    return service.get_patient_timeline(
        patient_id=patient_id,
        category=category,
        year=year,
        search_query=search_query
    )

@router.get("/{patient_id}/ai-summary", response_model=AISummaryResponse)
def get_patient_ai_summary(
    patient_id: str,
    refresh: bool = Query(False, description="Force refresh cache"),
    db: Session = Depends(get_db),
    current_user: HospitalUser = Depends(require_hospital_user)
):
    """Retrieves cached change-focused AI medical history summary for the patient."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    service = TimelineService(db)
    header = service.get_patient_header(patient)
    timeline = service.get_patient_timeline(patient_id=patient_id)

    return AISummarizerService.generate_overall_summary(
        header=header,
        encounters=timeline.encounters,
        force_refresh=refresh
    )

@router.post("/{patient_id}/ai-summary/encounter/{encounter_id}", response_model=AISummaryResponse)
def get_encounter_ai_summary(
    patient_id: str,
    encounter_id: str,
    db: Session = Depends(get_db),
    current_user: HospitalUser = Depends(require_hospital_user)
):
    """Generates focused AI summary for a single selected encounter card."""
    service = TimelineService(db)
    timeline = service.get_patient_timeline(patient_id=patient_id)
    
    target_enc = next((e for e in timeline.encounters if e.encounter_id == encounter_id), None)
    if not target_enc:
        raise HTTPException(status_code=404, detail="Encounter event not found.")

    return AISummarizerService.generate_encounter_summary(target_enc)
