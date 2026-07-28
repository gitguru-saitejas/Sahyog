from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from uuid import UUID
from datetime import datetime

# Auth Schemas
class SuperAdminLoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserMiniResponse(BaseModel):
    id: UUID
    email: str
    first_name: str
    last_name: str
    role: str

class SuperAdminTokenResponse(BaseModel):
    accessToken: str
    user: UserMiniResponse

# Dashboard Schema
class DashboardSummaryResponse(BaseModel):
    active_hospitals: int
    total_documents: int
    global_documents: int
    hospital_documents: int

# Hospital Admin & Doctor detail helpers
class HospitalAdminResponse(BaseModel):
    id: UUID
    user_id: UUID
    first_name: str
    last_name: str
    email: str

class DepartmentResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    created_at: datetime

# Hospital Schemas
class HospitalCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    address: str = Field(..., min_length=1)
    contact_number: str = Field(..., min_length=1, max_length=20)
    email: EmailStr
    logo_url: Optional[str] = None

class HospitalUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    address: Optional[str] = Field(None, min_length=1)
    contact_number: Optional[str] = Field(None, min_length=1, max_length=20)
    email: Optional[EmailStr] = None
    logo_url: Optional[str] = None

class HospitalDetailResponse(BaseModel):
    id: UUID
    name: str
    address: str
    contact_number: str
    email: str
    logo_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    is_active: bool
    doctor_count: int
    departments: List[DepartmentResponse] = []
    assigned_admins: List[HospitalAdminResponse] = []

    class Config:
        from_attributes = True

class HospitalCreateResponse(HospitalDetailResponse):
    admin_employee_id: Optional[str] = None
    admin_temp_password: Optional[str] = None

class HospitalListResponse(BaseModel):
    items: List[HospitalDetailResponse]
    page: int
    limit: int
    total: int
    total_pages: int

# Knowledge Base / RAG Schemas
class KnowledgeDocumentDetailResponse(BaseModel):
    id: UUID
    hospital_id: Optional[UUID] = None
    hospital_name: Optional[str] = None
    uploaded_by: Optional[UUID] = None
    uploader_name: Optional[str] = None
    title: str
    file_url: str
    category: str
    version: str
    created_at: datetime
    updated_at: datetime
    chunk_count: int = 0
    guidance_topic: Optional[str] = None

    class Config:
        from_attributes = True

class KnowledgeDocumentListResponse(BaseModel):
    items: List[KnowledgeDocumentDetailResponse]
    page: int
    limit: int
    total: int
    total_pages: int

class AssignAdminRequest(BaseModel):
    user_id: UUID


class BulkUploadSuccessItem(BaseModel):
    filename: str
    document: KnowledgeDocumentDetailResponse


class BulkUploadFailureItem(BaseModel):
    filename: str
    error: str


class BulkUploadResponse(BaseModel):
    successes: List[BulkUploadSuccessItem]
    failures: List[BulkUploadFailureItem]
