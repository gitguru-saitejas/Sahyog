from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import hashlib
import random

from app.database.session import get_db
from app.models.family_account import FamilyAccount, OTPVerification
from app.models.patient import Patient
from app.schemas.auth import (
    LoginRequest, TokenResponse, OTPRequest, OTPVerifyRequest,
    RegisterRequest, ForgotPasswordResetRequest
)
from app.core import security

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    account = db.query(FamilyAccount).filter(FamilyAccount.phone_number == request.phone_number).first()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this mobile number."
        )

    if not account.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Please contact support."
        )

    if request.login_type == "password":
        if not request.password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password is required for password login."
            )
        if not security.verify_password(request.password, account.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password. Please try again."
            )
    elif request.login_type == "otp":
        otp_rec = db.query(OTPVerification).filter(
            OTPVerification.phone_number == request.phone_number,
            OTPVerification.verified == True
        ).order_by(OTPVerification.created_at.desc()).first()

        if not otp_rec or otp_rec.expires_at < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="OTP verification has expired or is invalid. Please verify OTP first."
            )
        otp_rec.verified = False
        db.commit()
    else:
        raise HTTPException(status_code=400, detail="Invalid login method type.")

    patients = db.query(Patient).filter(Patient.family_account_id == account.id).all()
    token = security.create_access_token(subject=str(account.id))

    return {
        "accessToken": token,
        "family_account_id": account.id,
        "patients": patients
    }

@router.post("/otp/send")
def send_otp(request: OTPRequest, db: Session = Depends(get_db)):
    code = security.generate_otp()
    otp_hash = security.get_otp_hash(code)
    
    # Store OTP in database
    otp_record = OTPVerification(
        phone_number=request.phone_number,
        otp_hash=otp_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=3),
        verified=False,
        attempt_count=0
    )
    db.add(otp_record)
    db.commit()

    # SMS Gateway Simulation: print to logs
    print(f"\n==============================================")
    print(f"[SMS GATEWAY SIMULATOR] Sending code to +91 {request.phone_number}")
    print(f"VERIFICATION OTP: {code}")
    print(f"==============================================\n")

    return {"message": f"OTP verification code sent. Check server logs."}

@router.post("/otp/verify")
def verify_otp(request: OTPVerifyRequest, db: Session = Depends(get_db)):
    otp_rec = db.query(OTPVerification).filter(
        OTPVerification.phone_number == request.phone_number,
        OTPVerification.verified == False
    ).order_by(OTPVerification.created_at.desc()).first()

    if not otp_rec:
        raise HTTPException(status_code=400, detail="No active OTP request found for this phone.")
        
    if otp_rec.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new code.")

    if otp_rec.attempt_count >= 5:
        raise HTTPException(status_code=400, detail="Too many failed verification attempts.")

    # Match hash
    if not security.verify_otp_hash(request.code, otp_rec.otp_hash):
        otp_rec.attempt_count += 1
        db.commit()
        raise HTTPException(status_code=400, detail="Invalid OTP code.")

    # OTP is verified
    otp_rec.verified = True
    db.commit()

    # Check if a family account already exists for this verified phone (login flow)
    account = db.query(FamilyAccount).filter(FamilyAccount.phone_number == request.phone_number).first()
    if account:
        patients = db.query(Patient).filter(Patient.family_account_id == account.id).all()
        token = security.create_access_token(subject=str(account.id))
        return {
            "accessToken": token,
            "family_account_id": account.id,
            "patients": patients
        }

    return {"message": "OTP verification completed. Proceed to set up patient profile details."}

@router.post("/register")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    # Validate Aadhaar uniqueness first (each person can only have one profile)
    aadhaar_hash = hashlib.sha256(request.personal.aadhaar.encode()).hexdigest()
    existing_pat = db.query(Patient).filter(Patient.aadhaar_hash == aadhaar_hash).first()
    if existing_pat:
        raise HTTPException(status_code=400, detail="This Aadhaar number is already registered.")

    try:
        # Check if a family account already exists for this phone number
        account = db.query(FamilyAccount).filter(
            FamilyAccount.phone_number == request.credentials.phone_number
        ).first()

        if not account:
            # Create a new family account
            password_hash = security.get_password_hash(request.credentials.password)
            account = FamilyAccount(
                phone_number=request.credentials.phone_number,
                password_hash=password_hash
            )
            db.add(account)
            db.flush()  # Get account.id without committing

        # Generate a unique 6-digit patient_code
        def generate_patient_code():
            while True:
                code = str(random.randint(100000, 999999))
                if not db.query(Patient).filter(Patient.patient_code == code).first():
                    return code

        # Create new patient profile under the family account
        patient = Patient(
            family_account_id=account.id,
            patient_code=generate_patient_code(),
            first_name=request.personal.first_name,
            last_name=request.personal.last_name,
            date_of_birth=None,
            gender=None,
            blood_group=None,
            relation=request.personal.relation,
            aadhaar_hash=aadhaar_hash,
            aadhaar_last4=request.personal.aadhaar[-4:],
            address_line1=None,
            address_line2=None,
            city=None,
            district=None,
            state=None,
            pincode=None
        )
        db.add(patient)
        db.commit()  # Single atomic commit for both account + patient

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Registration failed. Please try again. ({str(e)})")

    return {"message": "Registration successful.", "patient_code": patient.patient_code}

@router.post("/forgot-password/request")
def request_password_reset(request: OTPRequest, db: Session = Depends(get_db)):
    account = db.query(FamilyAccount).filter(FamilyAccount.phone_number == request.phone_number).first()
    if not account:
        raise HTTPException(status_code=400, detail="Account with this mobile number does not exist.")

    code = security.generate_otp()
    otp_hash = security.get_otp_hash(code)
    
    # Store OTP
    otp_record = OTPVerification(
        phone_number=request.phone_number,
        otp_hash=otp_hash,
        expires_at=datetime.utcnow() + timedelta(minutes=3),
        verified=False,
        attempt_count=0
    )
    db.add(otp_record)
    db.commit()

    print(f"\n==============================================")
    print(f"[SMS GATEWAY SIMULATOR] Password reset requested for +91 {request.phone_number}")
    print(f"PASSWORD RESET OTP: {code}")
    print(f"==============================================\n")

    return {"message": "OTP verification code sent. Check server logs."}

@router.post("/forgot-password/reset")
def reset_password(request: ForgotPasswordResetRequest, db: Session = Depends(get_db)):
    otp_rec = db.query(OTPVerification).filter(
        OTPVerification.phone_number == request.phone_number,
        OTPVerification.verified == False
    ).order_by(OTPVerification.created_at.desc()).first()

    if not otp_rec or otp_rec.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP code.")

    if not security.verify_otp_hash(request.otp_code, otp_rec.otp_hash):
        otp_rec.attempt_count += 1
        db.commit()
        raise HTTPException(status_code=400, detail="Invalid OTP code.")

    account = db.query(FamilyAccount).filter(FamilyAccount.phone_number == request.phone_number).first()
    if not account:
        raise HTTPException(status_code=400, detail="Account not found.")

    # Update password
    account.password_hash = security.get_password_hash(request.new_password)
    otp_rec.verified = True
    db.commit()

    return {"message": "Password updated successfully."}

# ---------------------------------------------------------
# HOSPITAL EMPLOYEES SECURITY & AUTHENTICATION ENDPOINTS
# ---------------------------------------------------------
from fastapi import Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.core.config import settings
from app.schemas.auth import EmployeeLoginRequest, EmployeeTokenResponse, EmployeeRefreshRequest
from app.services.hospital import HospitalService
from app.models.patient import HospitalUser

security_scheme = HTTPBearer()

def get_current_employee(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> HospitalUser:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token credentials."
            )
        
        user = db.query(HospitalUser).filter(
            HospitalUser.id == user_id, HospitalUser.deleted_at == None
        ).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Employee account not found or has been deleted."
            )
            
        if user.status != "ACTIVE":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is locked or inactive."
            )
            
        return user
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is expired or invalid."
        )

def require_hospital_admin(current_user: HospitalUser = Depends(get_current_employee)) -> HospitalUser:
    if current_user.role != "HOSPITAL_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation restricted to Hospital Administrators only."
        )
    return current_user

def require_doctor(current_user: HospitalUser = Depends(get_current_employee)) -> HospitalUser:
    if current_user.role != "DOCTOR":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation restricted to Doctors only."
        )
    return current_user

def require_support_staff(current_user: HospitalUser = Depends(get_current_employee)) -> HospitalUser:
    if current_user.role != "SUPPORT_STAFF":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation restricted to Support Staff only."
        )
    return current_user

def require_hospital_user(current_user: HospitalUser = Depends(get_current_employee)) -> HospitalUser:
    if current_user.role not in ["HOSPITAL_ADMIN", "DOCTOR", "SUPPORT_STAFF"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation restricted to active hospital employees."
        )
    return current_user

@router.post("/employee/login", response_model=EmployeeTokenResponse)
def employee_login(
    req: EmployeeLoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    ip_address = request.client.host if request.client else None
    service = HospitalService(db)
    return service.employee_login(req.employee_id, req.password, ip_address)

@router.post("/employee/refresh", response_model=EmployeeTokenResponse)
def employee_refresh(
    req: EmployeeRefreshRequest,
    db: Session = Depends(get_db)
):
    # Verify refresh token and issue a new pair
    try:
        payload = jwt.decode(req.refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid refresh token.")
        
        user = db.query(HospitalUser).filter(
            HospitalUser.id == user_id, HospitalUser.deleted_at == None, HospitalUser.status == "ACTIVE"
        ).first()
        if not user:
            raise HTTPException(status_code=401, detail="Employee not active or not found.")
            
        access_token = security.create_access_token(subject=user.id, expires_delta=timedelta(minutes=60))
        new_refresh_token = security.create_access_token(subject=user.id, expires_delta=timedelta(days=7))
        
        return {
            "accessToken": access_token,
            "refreshToken": new_refresh_token,
            "user_id": user.id,
            "hospital_id": user.hospital_id,
            "employee_id": user.employee_id,
            "role": user.role,
            "first_name": user.first_name,
            "last_name": user.last_name
        }
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token.")

@router.post("/employee/logout")
def employee_logout(
    current_user: HospitalUser = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    # Simply return success since JWT is stateless (client discards it)
    # Could optionally blacklist or audit
    return {"success": True, "message": "Successfully logged out."}

