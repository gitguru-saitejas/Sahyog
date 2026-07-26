from datetime import datetime, timedelta, timezone
from typing import Any, Union
from jose import jwt
import bcrypt
import hashlib
import random
from app.core.config import settings

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pwd_bytes = plain_password.encode('utf-8')[:72]
        hash_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def generate_otp() -> str:
    """Generates a random 6-digit numeric string for verification."""
    return "".join(random.choices("0123456789", k=6))

def get_otp_hash(otp: str) -> str:
    """Hashes the OTP string using SHA-256 for secure storage."""
    return hashlib.sha256(otp.encode()).hexdigest()

def verify_otp_hash(otp: str, hashed_otp: str) -> bool:
    """Verifies that the entered plain OTP matches the stored hash."""
    return get_otp_hash(otp) == hashed_otp
