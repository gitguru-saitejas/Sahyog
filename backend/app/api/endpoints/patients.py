from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List
from jose import jwt, JWTError
import hashlib
from datetime import datetime, timezone

from app.database.session import get_db
from app.models.family_account import FamilyAccount, OTPVerification
from app.models.patient import Patient, PatientEmergencyContact
from app.schemas.patient import PatientResponse, AddFamilyMemberRequest, LinkExistingRequest
from app.core.config import settings
from app.core import security

router = APIRouter()
security_scheme = HTTPBearer()

def get_current_account_id(credentials: HTTPAuthorizationCredentials = Depends(security_scheme)) -> str:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        account_id: str = payload.get("sub")
        if account_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token credentials."
            )
        return account_id
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is expired or invalid."
        )

@router.get("", response_model=List[PatientResponse])
def get_patients(
    current_acc_id: str = Depends(get_current_account_id),
    db: Session = Depends(get_db)
):
    patients = db.query(Patient).filter(Patient.family_account_id == current_acc_id).all()
    return patients

@router.post("", response_model=PatientResponse)
def add_family_member(
    request: AddFamilyMemberRequest,
    current_acc_id: str = Depends(get_current_account_id),
    db: Session = Depends(get_db)
):
    # Enforce current account constraints
    if str(request.family_account_id) != current_acc_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation forbidden. You cannot add members to other accounts."
        )

    # Validate Aadhaar uniqueness
    aadhaar_hash = hashlib.sha256(request.patientData.aadhaar.encode()).hexdigest()
    existing_pat = db.query(Patient).filter(Patient.aadhaar_hash == aadhaar_hash).first()
    if existing_pat:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aadhaar number is already linked to another patient profile."
        )

    # Map string date
    dob = None
    if request.patientData.dob:
        try:
            from datetime import datetime
            dob = datetime.strptime(request.patientData.dob, "%Y-%m-%d").date()
        except ValueError:
            pass

    # Create Patient profile
    patient = Patient(
        family_account_id=request.family_account_id,
        first_name=request.patientData.first_name,
        last_name=request.patientData.last_name,
        date_of_birth=dob,
        gender=request.patientData.gender,
        blood_group=request.patientData.blood_group,
        relation=request.patientData.relation,
        aadhaar_hash=aadhaar_hash,
        aadhaar_last4=request.patientData.aadhaar[-4:],
        address_line1=request.patientData.address_line1,
        address_line2=request.patientData.address_line2,
        city=request.patientData.city,
        district=request.patientData.district,
        state=request.patientData.state,
        pincode=request.patientData.pincode
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)

    # Create emergency contact
    if request.patientData.emergency_name:
        emergency = PatientEmergencyContact(
            patient_id=patient.id,
            name=request.patientData.emergency_name,
            relationship=request.patientData.emergency_relationship,
            phone_number=request.patientData.emergency_phone
        )
        db.add(emergency)
        db.commit()

    return patient

@router.post("/link", response_model=PatientResponse)
def link_existing_profile(
    request: LinkExistingRequest,
    current_acc_id: str = Depends(get_current_account_id),
    db: Session = Depends(get_db)
):
    if str(request.family_account_id) != current_acc_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation forbidden. Link target must match your account."
        )

    # Verify phone OTP
    otp_rec = db.query(OTPVerification).filter(
        OTPVerification.phone_number == request.phone_number,
        OTPVerification.verified == True
    ).order_by(OTPVerification.created_at.desc()).first()

    if not otp_rec or otp_rec.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification credentials have expired. Verify OTP first."
        )

    # Find the target patient profile with this Aadhaar
    aadhaar_hash = hashlib.sha256(request.patient_aadhaar.encode()).hexdigest()
    patient = db.query(Patient).filter(Patient.aadhaar_hash == aadhaar_hash).first()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Patient profile with specified Aadhaar was not found."
        )

    # Re-link profile to current family account
    patient.family_account_id = request.family_account_id
    otp_rec.verified = False  # Consume verification
    db.commit()
    db.refresh(patient)

    return patient
