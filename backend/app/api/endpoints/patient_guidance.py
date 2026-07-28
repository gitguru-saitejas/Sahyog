from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.api.endpoints.patients import get_current_account_id
from app.models.patient import Patient
from app.models.chat import ChatSession
from app.schemas.patient_guidance import PatientGuidanceAskRequest, PatientGuidanceResponse
from app.services.guidance import generate_patient_guidance_answer
from app.core.config import validate_guidance_topic

router = APIRouter()

@router.post("/ask", response_model=PatientGuidanceResponse)
def ask_patient_guidance(
    body: PatientGuidanceAskRequest,
    current_acc_id: str = Depends(get_current_account_id),
    db: Session = Depends(get_db)
):
    session_id = body.session_id
    patient_id_to_use = body.patient_id

    # 1. Explicitly validate session_id -> patient_id -> authenticated family ownership
    if session_id:
        session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat session not found."
            )
        
        # Verify that the session's patient belongs to the authenticated family account
        patient_id_to_use = session.patient_id
        patient = db.query(Patient).filter(
            Patient.id == patient_id_to_use, 
            Patient.family_account_id == current_acc_id
        ).first()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Chat session does not belong to your family account."
            )
        
        # If they also passed a patient_id in body, verify it matches
        if body.patient_id and body.patient_id != patient_id_to_use:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Patient ID mismatch. The provided patient_id does not match the session's patient."
            )
    else:
        # If no session_id is provided, patient_id must be provided in body
        if not patient_id_to_use:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="patient_id is required to start a new chat session."
            )
        
        # Validate that the patient belongs to the authenticated family account
        patient = db.query(Patient).filter(
            Patient.id == patient_id_to_use, 
            Patient.family_account_id == current_acc_id
        ).first()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Patient does not belong to your family account."
            )

    # 2. Validate guidance topic
    try:
        validated_topic = validate_guidance_topic(body.guidance_topic)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )

    # Resolve language from request or fallback to auto-detection helper
    req_lang = body.language
    if not req_lang or req_lang == "en":
        from app.services.translation_service import identify_language
        req_lang = identify_language(body.question)

    # 3. Call guidance orchestration service
    result = generate_patient_guidance_answer(
        db=db,
        question=body.question,
        patient_id=patient_id_to_use,
        hospital_id=body.hospital_id,
        session_id=session_id,
        guidance_topic=validated_topic,
        language=req_lang
    )

    return result
