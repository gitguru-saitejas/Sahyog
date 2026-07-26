from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Union
from uuid import UUID
from app.schemas.patient import PatientResponse

class LoginRequest(BaseModel):
    phone_number: str
    password: Optional[str] = None
    login_type: str = "password"  # "password" | "otp"

    @field_validator('phone_number', mode='before')
    @classmethod
    def clean_phone(cls, v: str) -> str:
        if isinstance(v, str):
            s = v.replace(" ", "").replace("-", "").strip()
            if s.startswith("+91"):
                s = s[3:]
            return s
        return v

class TokenResponse(BaseModel):
    accessToken: str
    family_account_id: Union[str, UUID]
    patients: List[PatientResponse] = []

class OTPRequest(BaseModel):
    phone_number: str

    @field_validator('phone_number', mode='before')
    @classmethod
    def clean_phone(cls, v: str) -> str:
        if isinstance(v, str):
            s = v.replace(" ", "").replace("-", "").strip()
            if s.startswith("+91"):
                s = s[3:]
            return s
        return v

class OTPVerifyRequest(BaseModel):
    phone_number: str
    code: str

    @field_validator('phone_number', mode='before')
    @classmethod
    def clean_phone(cls, v: str) -> str:
        if isinstance(v, str):
            s = v.replace(" ", "").replace("-", "").strip()
            if s.startswith("+91"):
                s = s[3:]
            return s
        return v

    @field_validator('code', mode='before')
    @classmethod
    def clean_code(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip()
        return v

class ForgotPasswordResetRequest(BaseModel):
    phone_number: str
    otp_code: str
    new_password: str = Field(..., min_length=8)

    @field_validator('phone_number', mode='before')
    @classmethod
    def clean_phone(cls, v: str) -> str:
        if isinstance(v, str):
            s = v.replace(" ", "").replace("-", "").strip()
            if s.startswith("+91"):
                s = s[3:]
            return s
        return v

class RegisterCredentials(BaseModel):
    phone_number: str
    password: Optional[str] = None  # Optional: if omitted, backend generates an internal password

    @field_validator('phone_number', mode='before')
    @classmethod
    def clean_phone(cls, v: str) -> str:
        if isinstance(v, str):
            s = v.replace(" ", "").replace("-", "").strip()
            if s.startswith("+91"):
                s = s[3:]
            return s
        return v

class RegisterPersonal(BaseModel):
    first_name: str
    last_name: str
    aadhaar: str
    relation: str = "SELF"  # SELF, SPOUSE, SON, DAUGHTER, FATHER, MOTHER, BROTHER, SISTER, OTHER

    @field_validator('aadhaar', mode='before')
    @classmethod
    def clean_aadhaar(cls, v: str) -> str:
        if isinstance(v, str):
            return v.replace(" ", "").replace("-", "").strip()
        return v

class RegisterAddress(BaseModel):
    address_line1: Optional[str] = ""
    address_line2: Optional[str] = ""
    city: Optional[str] = ""
    district: Optional[str] = ""
    state: Optional[str] = ""
    pincode: Optional[str] = ""

class RegisterEmergency(BaseModel):
    name: Optional[str] = ""
    relationship: Optional[str] = ""
    phone_number: Optional[str] = ""

class RegisterMedical(BaseModel):
    diseases: Optional[str] = ""
    allergies: Optional[str] = ""
    medications: Optional[str] = ""

class RegisterConsent(BaseModel):
    agreeTerms: Optional[bool] = True
    consentStorage: Optional[bool] = True

class RegisterRequest(BaseModel):
    credentials: RegisterCredentials
    personal: RegisterPersonal
    address: Optional[RegisterAddress] = None
    emergency: Optional[RegisterEmergency] = None
    medical: Optional[RegisterMedical] = None
    consent: Optional[RegisterConsent] = None

class EmployeeLoginRequest(BaseModel):
    employee_id: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)

class EmployeeTokenResponse(BaseModel):
    accessToken: str
    refreshToken: str
    user_id: str
    hospital_id: str
    employee_id: str
    role: str
    first_name: str
    last_name: str
    is_first_login: bool = False
    password_changed: bool = True

class EmployeeChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)

    @field_validator('new_password')
    @classmethod
    def validate_complexity(cls, v: str) -> str:
        import re
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter.')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter.')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number.')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character.')
        return v

class EmployeeRefreshRequest(BaseModel):
    refresh_token: str

