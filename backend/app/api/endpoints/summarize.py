from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import logging

from app.database.session import get_db
from app.models.patient import HospitalUser
from app.api.endpoints.auth import require_hospital_user
from app.schemas.summarize import ClinicalSummaryResponse, SummarizeStatusResponse
from app.services.summarize import SummarizeService

router = APIRouter()
logger = logging.getLogger("sahyog.summarize")

@router.get("/{patient_id}/summarize/status", response_model=SummarizeStatusResponse)
def check_patient_clinical_summary_status(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: HospitalUser = Depends(require_hospital_user)
):
    """
    Checks the cache status for the patient clinical summary without generating a new one.
    """
    try:
        service = SummarizeService(db)
        return service.check_cache_status(patient_id=patient_id)
    except ValueError as val_err:
        logger.error(f"[SUMMARIZE API] Patient not found or validation error during status check: {str(val_err)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(val_err)
        )
    except Exception as e:
        logger.error(f"[SUMMARIZE API] Unexpected error during status check: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to read cache status."
        )

@router.get("/{patient_id}/summarize", response_model=ClinicalSummaryResponse)
def get_patient_clinical_summary(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: HospitalUser = Depends(require_hospital_user)
):
    """
    Retrieves the structured clinical summary of the patient.
    Uses cached summary if the patient database record hash matches.
    """
    try:
        service = SummarizeService(db)
        return service.summarize_patient(patient_id=patient_id, force_refresh=False)
    except ValueError as val_err:
        logger.error(f"[SUMMARIZE API] Patient not found or validation error: {str(val_err)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(val_err)
        )
    except Exception as e:
        logger.error(f"[SUMMARIZE API] Unexpected error: {str(e)}")
        # Graceful fallback error response as requested, so the timeline never crashes
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to generate AI summary at this time."
        )

@router.post("/{patient_id}/summarize/refresh", response_model=ClinicalSummaryResponse)
def refresh_patient_clinical_summary(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: HospitalUser = Depends(require_hospital_user)
):
    """
    Forces recalculation of the patient summary by bypassing the cache.
    """
    try:
        service = SummarizeService(db)
        return service.summarize_patient(patient_id=patient_id, force_refresh=True)
    except ValueError as val_err:
        logger.error(f"[SUMMARIZE API] Patient not found or validation error during refresh: {str(val_err)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(val_err)
        )
    except Exception as e:
        logger.error(f"[SUMMARIZE API] Unexpected error during refresh: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to generate AI summary at this time."
        )
