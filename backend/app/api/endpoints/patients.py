from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
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

    return patient

# ---------------------------------------------------------
# HOSPITAL PORTAL ROLE APIS (ADMIN, DOCTOR, SUPPORT STAFF)
# ---------------------------------------------------------
from fastapi import Request
from app.api.endpoints.auth import (
    require_hospital_admin, require_doctor, require_support_staff, require_hospital_user
)
from app.models.patient import HospitalUser, Department, Encounter, Prescription
from app.schemas.patient import (
    DepartmentCreate, DepartmentResponse,
    DoctorCreate, DoctorUpdate, DoctorResponse, DoctorCreateResponse,
    SupportStaffCreate, SupportStaffUpdate, SupportStaffResponse, SupportStaffCreateResponse,
    EncounterCreate, EncounterUpdate, EncounterResponse,
    PrescriptionCreate, PrescriptionResponse
)
from app.services.hospital import HospitalService

# ---------------------------
# HOSPITAL ADMIN APIS
# ---------------------------
@router.post("/hospital/admin/doctors", response_model=DoctorCreateResponse, tags=["hospital-admin"])
def create_doctor(
    req: DoctorCreate,
    request: Request,
    current_admin: HospitalUser = Depends(require_hospital_admin),
    db: Session = Depends(get_db)
):
    ip_address = request.client.host if request.client else None
    service = HospitalService(db)
    user = service.create_doctor(str(current_admin.hospital_id), req.model_dump(), str(current_admin.id), ip_address)
    return user

@router.get("/hospital/admin/doctors", response_model=List[DoctorResponse], tags=["hospital-admin"])
def list_doctors(
    current_admin: HospitalUser = Depends(require_hospital_admin),
    db: Session = Depends(get_db)
):
    service = HospitalService(db)
    return service.repo.get_employees_by_role(str(current_admin.hospital_id), "DOCTOR")

@router.get("/hospital/admin/doctors/{user_id}", response_model=DoctorResponse, tags=["hospital-admin"])
def get_doctor(
    user_id: str,
    current_admin: HospitalUser = Depends(require_hospital_admin),
    db: Session = Depends(get_db)
):
    service = HospitalService(db)
    user = service.repo.get_employee(str(current_admin.hospital_id), user_id)
    if not user or user.role != "DOCTOR":
        raise HTTPException(status_code=404, detail="Doctor not found.")
    return user

@router.put("/hospital/admin/doctors/{user_id}", response_model=DoctorResponse, tags=["hospital-admin"])
def update_doctor(
    user_id: str,
    req: DoctorUpdate,
    request: Request,
    current_admin: HospitalUser = Depends(require_hospital_admin),
    db: Session = Depends(get_db)
):
    ip_address = request.client.host if request.client else None
    service = HospitalService(db)
    return service.update_doctor(str(current_admin.hospital_id), user_id, req.model_dump(exclude_unset=True), str(current_admin.id), ip_address)

@router.delete("/hospital/admin/doctors/{user_id}", tags=["hospital-admin"])
def delete_doctor(
    user_id: str,
    request: Request,
    current_admin: HospitalUser = Depends(require_hospital_admin),
    db: Session = Depends(get_db)
):
    ip_address = request.client.host if request.client else None
    service = HospitalService(db)
    service.delete_employee(str(current_admin.hospital_id), user_id, str(current_admin.id), ip_address)
    return {"success": True, "message": "Doctor profile soft-deleted successfully."}

@router.post("/hospital/admin/staff", response_model=SupportStaffCreateResponse, tags=["hospital-admin"])
def create_staff(
    req: SupportStaffCreate,
    request: Request,
    current_admin: HospitalUser = Depends(require_hospital_admin),
    db: Session = Depends(get_db)
):
    ip_address = request.client.host if request.client else None
    service = HospitalService(db)
    user = service.create_support_staff(str(current_admin.hospital_id), req.model_dump(), str(current_admin.id), ip_address)
    return user

@router.get("/hospital/admin/staff", response_model=List[SupportStaffResponse], tags=["hospital-admin"])
def list_staff(
    current_admin: HospitalUser = Depends(require_hospital_admin),
    db: Session = Depends(get_db)
):
    service = HospitalService(db)
    return service.repo.get_employees_by_role(str(current_admin.hospital_id), "SUPPORT_STAFF")

@router.get("/hospital/admin/staff/{user_id}", response_model=SupportStaffResponse, tags=["hospital-admin"])
def get_staff(
    user_id: str,
    current_admin: HospitalUser = Depends(require_hospital_admin),
    db: Session = Depends(get_db)
):
    service = HospitalService(db)
    user = service.repo.get_employee(str(current_admin.hospital_id), user_id)
    if not user or user.role != "SUPPORT_STAFF":
        raise HTTPException(status_code=404, detail="Support staff member not found.")
    return user

@router.put("/hospital/admin/staff/{user_id}", response_model=SupportStaffResponse, tags=["hospital-admin"])
def update_staff(
    user_id: str,
    req: SupportStaffUpdate,
    request: Request,
    current_admin: HospitalUser = Depends(require_hospital_admin),
    db: Session = Depends(get_db)
):
    ip_address = request.client.host if request.client else None
    service = HospitalService(db)
    return service.update_support_staff(str(current_admin.hospital_id), user_id, req.model_dump(exclude_unset=True), str(current_admin.id), ip_address)

@router.delete("/hospital/admin/staff/{user_id}", tags=["hospital-admin"])
def delete_staff(
    user_id: str,
    request: Request,
    current_admin: HospitalUser = Depends(require_hospital_admin),
    db: Session = Depends(get_db)
):
    ip_address = request.client.host if request.client else None
    service = HospitalService(db)
    service.delete_employee(str(current_admin.hospital_id), user_id, str(current_admin.id), ip_address)
    return {"success": True, "message": "Support staff profile soft-deleted successfully."}

@router.post("/hospital/admin/departments", response_model=DepartmentResponse, tags=["hospital-admin"])
def create_department(
    req: DepartmentCreate,
    current_admin: HospitalUser = Depends(require_hospital_admin),
    db: Session = Depends(get_db)
):
    # Guard: check for existing active department with the same name (case-insensitive)
    from sqlalchemy import func
    service = HospitalService(db)
    existing = db.query(Department).filter(
        Department.hospital_id == str(current_admin.hospital_id),
        func.lower(Department.name) == req.name.strip().lower(),
        Department.deleted_at == None
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A department named '{req.name}' already exists in this hospital."
        )
    return service.repo.create_department(str(current_admin.hospital_id), req.name.strip(), req.description)

@router.get("/hospital/admin/departments", response_model=List[DepartmentResponse], tags=["hospital-admin"])
def list_departments(
    current_admin: HospitalUser = Depends(require_hospital_admin),
    db: Session = Depends(get_db)
):
    service = HospitalService(db)
    return service.repo.get_departments(str(current_admin.hospital_id))

@router.post("/hospital/admin/reset-password", tags=["hospital-admin"])
def reset_employee_password(
    employee_id: str,
    new_password: str,
    request: Request,
    current_admin: HospitalUser = Depends(require_hospital_admin),
    db: Session = Depends(get_db)
):
    ip_address = request.client.host if request.client else None
    service = HospitalService(db)
    service.reset_employee_password(str(current_admin.hospital_id), employee_id, new_password, str(current_admin.id), ip_address)
    return {"success": True, "message": "Employee password updated successfully."}

@router.get("/hospital/admin/dashboard", tags=["hospital-admin"])
def get_admin_dashboard(
    current_admin: HospitalUser = Depends(require_hospital_admin),
    db: Session = Depends(get_db)
):
    service = HospitalService(db)
    return service.get_dashboard_summary(str(current_admin.hospital_id))

# ---------------------------
# HOSPITAL SUPPORT STAFF APIS
# ---------------------------
@router.get("/hospital/staff/search", response_model=List[PatientResponse], tags=["hospital-staff"])
def staff_search_patients(
    query: str,
    current_staff: HospitalUser = Depends(require_support_staff),
    db: Session = Depends(get_db)
):
    service = HospitalService(db)
    return service.get_patient_by_query(query)

@router.post("/hospital/staff/encounters", response_model=EncounterResponse, tags=["hospital-staff"])
def create_or_update_encounter(
    req: EncounterCreate,
    request: Request,
    encounter_id: Optional[str] = None,
    current_staff: HospitalUser = Depends(require_support_staff),
    db: Session = Depends(get_db)
):
    ip_address = request.client.host if request.client else None
    service = HospitalService(db)
    data = req.model_dump(exclude_unset=True)
    if encounter_id:
        data["encounter_id"] = encounter_id
    encounter = service.create_or_update_encounter(str(current_staff.hospital_id), str(current_staff.id), data, ip_address)
    return encounter

@router.get("/hospital/staff/doctors", response_model=List[DoctorResponse], tags=["hospital-staff"])
def staff_list_doctors(
    current_staff: HospitalUser = Depends(require_support_staff),
    db: Session = Depends(get_db)
):
    """Allows support staff to list active doctors in their hospital for triage assignment."""
    service = HospitalService(db)
    return service.repo.get_employees_by_role(str(current_staff.hospital_id), "DOCTOR")


# ---------------------------
# HOSPITAL DOCTOR APIS
# ---------------------------
@router.get("/hospital/doctor/dashboard", tags=["hospital-doctor"])
def get_doctor_dashboard(
    current_doctor: HospitalUser = Depends(require_doctor),
    db: Session = Depends(get_db)
):
    service = HospitalService(db)
    return service.get_doctor_dashboard(str(current_doctor.hospital_id), str(current_doctor.id))

@router.get("/hospital/doctor/search", response_model=List[PatientResponse], tags=["hospital-doctor"])
def doctor_search_patients(
    query: str,
    current_doctor: HospitalUser = Depends(require_doctor),
    db: Session = Depends(get_db)
):
    service = HospitalService(db)
    return service.get_patient_by_query(query)

@router.get("/hospital/doctor/patients/{patient_id}/timeline", response_model=List[EncounterResponse], tags=["hospital-doctor"])
def get_patient_timeline(
    patient_id: str,
    current_doctor: HospitalUser = Depends(require_doctor),
    db: Session = Depends(get_db)
):
    service = HospitalService(db)
    # Ensure isolation - only list encounters for this hospital
    return service.repo.get_encounters(str(current_doctor.hospital_id), patient_id=patient_id)

@router.post("/hospital/doctor/encounters/{encounter_id}/complete", response_model=EncounterResponse, tags=["hospital-doctor"])
def complete_consultation(
    encounter_id: str,
    req: PrescriptionCreate,
    request: Request,
    current_doctor: HospitalUser = Depends(require_doctor),
    db: Session = Depends(get_db)
):
    ip_address = request.client.host if request.client else None
    service = HospitalService(db)
    return service.complete_consultation(str(current_doctor.hospital_id), encounter_id, str(current_doctor.id), req.model_dump(), ip_address)

@router.get("/hospital/doctor/encounters/{encounter_id}", response_model=EncounterResponse, tags=["hospital-doctor"])
def get_encounter_detail(
    encounter_id: str,
    current_doctor: HospitalUser = Depends(require_doctor),
    db: Session = Depends(get_db)
):
    """Returns the full encounter record (all vitals + clinical notes entered by support staff)."""
    service = HospitalService(db)
    enc = service.repo.get_encounter(str(current_doctor.hospital_id), encounter_id)
    if not enc:
        raise HTTPException(status_code=404, detail="Encounter not found.")
    return enc
