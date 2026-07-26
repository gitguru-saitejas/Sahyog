from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone
import os

from app.database.session import get_db
from app.models.user import User
from app.models.hospital import Hospital, HospitalAdmin, Department, Doctor
from app.models.rag import RagDocument, DocumentChunk
from app.models.audit import AuditLog
from app.core import security
from app.core.config import settings
from app.services.audit import log_audit
from app.services import rag as rag_service
from app.services.storage import delete_rag_document, create_signed_url
from app.schemas.super_admin import (
    SuperAdminLoginRequest, SuperAdminTokenResponse, DashboardSummaryResponse,
    HospitalCreate, HospitalUpdate, HospitalDetailResponse, HospitalListResponse,
    KnowledgeDocumentDetailResponse, KnowledgeDocumentListResponse, AssignAdminRequest,
    UserMiniResponse, HospitalAdminResponse, DepartmentResponse
)

router = APIRouter()
security_scheme = HTTPBearer()

# -----------------------------------------------------------------------------
# Dependency: Super Admin Authentication & Authorization
# -----------------------------------------------------------------------------
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security_scheme), db: Session = Depends(get_db)) -> User:
    from jose import jwt, JWTError
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token credentials."
            )
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found."
            )
        if not user.is_active or user.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This user account is inactive or has been deleted."
            )
        return user
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is expired or invalid."
        )

def get_current_super_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden. Access is restricted to platform Super Admins."
        )
    return current_user

# -----------------------------------------------------------------------------
# Super Admin Authentication Route
# -----------------------------------------------------------------------------
@router.post("/auth/login", response_model=SuperAdminTokenResponse)
def super_admin_login(request: SuperAdminLoginRequest, db: Session = Depends(get_db)):
    # Query standard users table
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
    if not user.is_active or user.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated."
        )
    if user.role != "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden. You do not have Super Admin privileges."
        )
    if not security.verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    # Generate standard access token
    token = security.create_access_token(subject=str(user.id))
    return {
        "accessToken": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role
        }
    }

# -----------------------------------------------------------------------------
# Super Admin Dashboard Summary
# -----------------------------------------------------------------------------
@router.get("/dashboard/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    current_admin: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    active_hospitals = db.query(Hospital).filter(Hospital.deleted_at == None).count()
    total_docs = db.query(RagDocument).count()
    global_docs = db.query(RagDocument).filter(RagDocument.hospital_id == None).count()
    hosp_docs = db.query(RagDocument).filter(RagDocument.hospital_id != None).count()

    return {
        "active_hospitals": active_hospitals,
        "total_documents": total_docs,
        "global_documents": global_docs,
        "hospital_documents": hosp_docs
    }

# -----------------------------------------------------------------------------
# Hospital Management Routes
# -----------------------------------------------------------------------------
@router.get("/hospitals", response_model=HospitalListResponse)
def list_hospitals(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    status_filter: str = "active", # "active" | "deleted" | "all"
    current_admin: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Hospital)
    if search:
        query = query.filter(
            (Hospital.name.ilike(f"%{search}%")) |
            (Hospital.email.ilike(f"%{search}%")) |
            (Hospital.contact_number.ilike(f"%{search}%"))
        )
    if status_filter == "active":
        query = query.filter(Hospital.deleted_at == None)
    elif status_filter == "deleted":
        query = query.filter(Hospital.deleted_at != None)

    query = query.order_by(Hospital.created_at.desc())
    total = query.count()
    total_pages = (total + limit - 1) // limit if total > 0 else 0
    items = query.offset((page - 1) * limit).limit(limit).all()

    response_items = []
    for h in items:
        # Doctor Count
        doc_count = db.query(Doctor).filter(Doctor.hospital_id == h.id, Doctor.deleted_at == None).count()
        # Departments
        deps = db.query(Department).filter(Department.hospital_id == h.id, Department.deleted_at == None).all()
        # Admins
        h_admins = db.query(HospitalAdmin).filter(HospitalAdmin.hospital_id == h.id).all()
        assigned_admins = []
        for ha in h_admins:
            u = db.query(User).filter(User.id == ha.user_id).first()
            if u:
                assigned_admins.append(HospitalAdminResponse(
                    id=ha.id,
                    user_id=u.id,
                    first_name=u.first_name,
                    last_name=u.last_name,
                    email=u.email
                ))

        response_items.append(HospitalDetailResponse(
            id=h.id,
            name=h.name,
            address=h.address,
            contact_number=h.contact_number,
            email=h.email,
            logo_url=h.logo_url,
            created_at=h.created_at,
            updated_at=h.updated_at,
            is_active=h.deleted_at is None,
            doctor_count=doc_count,
            departments=[DepartmentResponse(id=d.id, name=d.name, description=d.description, created_at=d.created_at) for d in deps],
            assigned_admins=assigned_admins
        ))

    return {
        "items": response_items,
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": total_pages
    }

@router.post("/hospitals", response_model=HospitalDetailResponse, status_code=status.HTTP_201_CREATED)
def create_hospital(
    payload: HospitalCreate,
    current_admin: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    # Verify uniqueness of hospital email
    existing = db.query(Hospital).filter(Hospital.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Hospital with this email already exists."
        )

    hospital = Hospital(
        name=payload.name,
        address=payload.address,
        contact_number=payload.contact_number,
        email=payload.email,
        logo_url=payload.logo_url
    )
    db.add(hospital)
    db.commit()
    db.refresh(hospital)

    # Auditing
    log_audit(
        db=db,
        user_id=current_admin.id,
        action="CREATE",
        table_name="hospitals",
        record_id=hospital.id,
        new_values={
            "name": hospital.name,
            "email": hospital.email,
            "contact_number": hospital.contact_number,
            "address": hospital.address
        }
    )

    return HospitalDetailResponse(
        id=hospital.id,
        name=hospital.name,
        address=hospital.address,
        contact_number=hospital.contact_number,
        email=hospital.email,
        logo_url=hospital.logo_url,
        created_at=hospital.created_at,
        updated_at=hospital.updated_at,
        is_active=True,
        doctor_count=0,
        departments=[],
        assigned_admins=[]
    )

@router.get("/hospitals/{hospital_id}", response_model=HospitalDetailResponse)
def get_hospital(
    hospital_id: UUID,
    current_admin: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    h = db.query(Hospital).filter(Hospital.id == str(hospital_id)).first()
    if not h:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hospital not found."
        )

    doc_count = db.query(Doctor).filter(Doctor.hospital_id == h.id, Doctor.deleted_at == None).count()
    deps = db.query(Department).filter(Department.hospital_id == h.id, Department.deleted_at == None).all()
    h_admins = db.query(HospitalAdmin).filter(HospitalAdmin.hospital_id == h.id).all()
    
    assigned_admins = []
    for ha in h_admins:
        u = db.query(User).filter(User.id == ha.user_id).first()
        if u:
            assigned_admins.append(HospitalAdminResponse(
                id=ha.id,
                user_id=u.id,
                first_name=u.first_name,
                last_name=u.last_name,
                email=u.email
            ))

    return HospitalDetailResponse(
        id=h.id,
        name=h.name,
        address=h.address,
        contact_number=h.contact_number,
        email=h.email,
        logo_url=h.logo_url,
        created_at=h.created_at,
        updated_at=h.updated_at,
        is_active=h.deleted_at is None,
        doctor_count=doc_count,
        departments=[DepartmentResponse(id=d.id, name=d.name, description=d.description, created_at=d.created_at) for d in deps],
        assigned_admins=assigned_admins
    )

@router.patch("/hospitals/{hospital_id}", response_model=HospitalDetailResponse)
def update_hospital(
    hospital_id: UUID,
    payload: HospitalUpdate,
    current_admin: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    h = db.query(Hospital).filter(Hospital.id == str(hospital_id)).first()
    if not h:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hospital not found."
        )

    # Check email conflict
    if payload.email and payload.email != h.email:
        conflict = db.query(Hospital).filter(Hospital.email == payload.email).first()
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Hospital with this email already exists."
            )

    old_values = {
        "name": h.name,
        "address": h.address,
        "contact_number": h.contact_number,
        "email": h.email,
        "logo_url": h.logo_url
    }

    new_values = {}
    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(h, field, val)
        new_values[field] = val

    h.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(h)

    # Auditing
    log_audit(
        db=db,
        user_id=current_admin.id,
        action="UPDATE",
        table_name="hospitals",
        record_id=h.id,
        old_values=old_values,
        new_values=new_values
    )

    doc_count = db.query(Doctor).filter(Doctor.hospital_id == h.id, Doctor.deleted_at == None).count()
    deps = db.query(Department).filter(Department.hospital_id == h.id, Department.deleted_at == None).all()
    h_admins = db.query(HospitalAdmin).filter(HospitalAdmin.hospital_id == h.id).all()
    assigned_admins = []
    for ha in h_admins:
        u = db.query(User).filter(User.id == ha.user_id).first()
        if u:
            assigned_admins.append(HospitalAdminResponse(
                id=ha.id,
                user_id=u.id,
                first_name=u.first_name,
                last_name=u.last_name,
                email=u.email
            ))

    return HospitalDetailResponse(
        id=h.id,
        name=h.name,
        address=h.address,
        contact_number=h.contact_number,
        email=h.email,
        logo_url=h.logo_url,
        created_at=h.created_at,
        updated_at=h.updated_at,
        is_active=h.deleted_at is None,
        doctor_count=doc_count,
        departments=[DepartmentResponse(id=d.id, name=d.name, description=d.description, created_at=d.created_at) for d in deps],
        assigned_admins=assigned_admins
    )

@router.delete("/hospitals/{hospital_id}", response_model=HospitalDetailResponse)
def delete_hospital(
    hospital_id: UUID,
    current_admin: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    h = db.query(Hospital).filter(Hospital.id == str(hospital_id)).first()
    if not h:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hospital not found."
        )

    if h.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hospital is already soft-deleted."
        )

    h.deleted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(h)

    # Auditing
    log_audit(
        db=db,
        user_id=current_admin.id,
        action="DELETE",
        table_name="hospitals",
        record_id=h.id,
        old_values={"deleted_at": None},
        new_values={"deleted_at": str(h.deleted_at)}
    )

    doc_count = db.query(Doctor).filter(Doctor.hospital_id == h.id, Doctor.deleted_at == None).count()
    deps = db.query(Department).filter(Department.hospital_id == h.id, Department.deleted_at == None).all()
    h_admins = db.query(HospitalAdmin).filter(HospitalAdmin.hospital_id == h.id).all()
    assigned_admins = []
    for ha in h_admins:
        u = db.query(User).filter(User.id == ha.user_id).first()
        if u:
            assigned_admins.append(HospitalAdminResponse(
                id=ha.id,
                user_id=u.id,
                first_name=u.first_name,
                last_name=u.last_name,
                email=u.email
            ))

    return HospitalDetailResponse(
        id=h.id,
        name=h.name,
        address=h.address,
        contact_number=h.contact_number,
        email=h.email,
        logo_url=h.logo_url,
        created_at=h.created_at,
        updated_at=h.updated_at,
        is_active=False,
        doctor_count=doc_count,
        departments=[DepartmentResponse(id=d.id, name=d.name, description=d.description, created_at=d.created_at) for d in deps],
        assigned_admins=assigned_admins
    )

@router.patch("/hospitals/{hospital_id}/restore", response_model=HospitalDetailResponse)
def restore_hospital(
    hospital_id: UUID,
    current_admin: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    h = db.query(Hospital).filter(Hospital.id == str(hospital_id)).first()
    if not h:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hospital not found."
        )

    if h.deleted_at is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hospital is not deleted."
        )

    old_del = h.deleted_at
    h.deleted_at = None
    db.commit()
    db.refresh(h)

    # Auditing
    log_audit(
        db=db,
        user_id=current_admin.id,
        action="RESTORE",
        table_name="hospitals",
        record_id=h.id,
        old_values={"deleted_at": str(old_del)},
        new_values={"deleted_at": None}
    )

    doc_count = db.query(Doctor).filter(Doctor.hospital_id == h.id, Doctor.deleted_at == None).count()
    deps = db.query(Department).filter(Department.hospital_id == h.id, Department.deleted_at == None).all()
    h_admins = db.query(HospitalAdmin).filter(HospitalAdmin.hospital_id == h.id).all()
    assigned_admins = []
    for ha in h_admins:
        u = db.query(User).filter(User.id == ha.user_id).first()
        if u:
            assigned_admins.append(HospitalAdminResponse(
                id=ha.id,
                user_id=u.id,
                first_name=u.first_name,
                last_name=u.last_name,
                email=u.email
            ))

    return HospitalDetailResponse(
        id=h.id,
        name=h.name,
        address=h.address,
        contact_number=h.contact_number,
        email=h.email,
        logo_url=h.logo_url,
        created_at=h.created_at,
        updated_at=h.updated_at,
        is_active=True,
        doctor_count=doc_count,
        departments=[DepartmentResponse(id=d.id, name=d.name, description=d.description, created_at=d.created_at) for d in deps],
        assigned_admins=assigned_admins
    )

@router.get("/hospitals/admins/available", response_model=List[UserMiniResponse])
def get_available_admins(
    current_admin: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Retrieves Hospital Admins who are active and not currently assigned to a hospital."""
    assigned_user_ids = db.query(HospitalAdmin.user_id).subquery()
    available_users = db.query(User).filter(
        User.role == "HOSPITAL_ADMIN",
        User.is_active == True,
        User.deleted_at == None,
        ~User.id.in_(assigned_user_ids)
    ).all()

    return [
        UserMiniResponse(
            id=u.id,
            email=u.email,
            first_name=u.first_name,
            last_name=u.last_name,
            role=u.role
        ) for u in available_users
    ]

@router.post("/hospitals/{hospital_id}/admins", response_model=HospitalDetailResponse)
def assign_hospital_admin(
    hospital_id: UUID,
    payload: AssignAdminRequest,
    current_admin: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    h = db.query(Hospital).filter(Hospital.id == str(hospital_id)).first()
    if not h:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hospital not found."
        )

    # Verify target admin user exists
    user = db.query(User).filter(User.id == str(payload.user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    if user.role != "HOSPITAL_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must have the role HOSPITAL_ADMIN."
        )

    if not user.is_active or user.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is inactive or deleted."
        )

    # Check if this admin is already assigned
    existing = db.query(HospitalAdmin).filter(HospitalAdmin.user_id == str(payload.user_id)).first()
    if existing:
        old_h_id = existing.hospital_id
        if existing.hospital_id == str(hospital_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already assigned to this hospital."
            )
        
        # Re-assign
        existing.hospital_id = str(hospital_id)
        db.commit()
        
        log_audit(
            db=db,
            user_id=current_admin.id,
            action="UPDATE",
            table_name="hospital_admins",
            record_id=existing.id,
            old_values={"hospital_id": str(old_h_id)},
            new_values={"hospital_id": str(hospital_id)}
        )
    else:
        # Create assignment
        ha = HospitalAdmin(
            user_id=str(payload.user_id),
            hospital_id=str(hospital_id)
        )
        db.add(ha)
        db.commit()
        
        log_audit(
            db=db,
            user_id=current_admin.id,
            action="CREATE",
            table_name="hospital_admins",
            record_id=ha.id,
            new_values={"user_id": str(payload.user_id), "hospital_id": str(hospital_id)}
        )

    # Reload hospital details
    db.refresh(h)
    doc_count = db.query(Doctor).filter(Doctor.hospital_id == h.id, Doctor.deleted_at == None).count()
    deps = db.query(Department).filter(Department.hospital_id == h.id, Department.deleted_at == None).all()
    h_admins = db.query(HospitalAdmin).filter(HospitalAdmin.hospital_id == h.id).all()
    assigned_admins = []
    for ha in h_admins:
        u = db.query(User).filter(User.id == ha.user_id).first()
        if u:
            assigned_admins.append(HospitalAdminResponse(
                id=ha.id,
                user_id=u.id,
                first_name=u.first_name,
                last_name=u.last_name,
                email=u.email
            ))

    return HospitalDetailResponse(
        id=h.id,
        name=h.name,
        address=h.address,
        contact_number=h.contact_number,
        email=h.email,
        logo_url=h.logo_url,
        created_at=h.created_at,
        updated_at=h.updated_at,
        is_active=h.deleted_at is None,
        doctor_count=doc_count,
        departments=[DepartmentResponse(id=d.id, name=d.name, description=d.description, created_at=d.created_at) for d in deps],
        assigned_admins=assigned_admins
    )

# -----------------------------------------------------------------------------
# Knowledge Base (RAG Documents) Management Routes
# -----------------------------------------------------------------------------
@router.get("/knowledge-base", response_model=KnowledgeDocumentListResponse)
def list_knowledge_base(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    category: Optional[str] = None,
    scope: str = "all", # "all" | "global" | "hospital"
    hospital_id: Optional[UUID] = None,
    current_admin: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    query = db.query(RagDocument)
    if search:
        query = query.filter(RagDocument.title.ilike(f"%{search}%"))
    if category and category != "all":
        query = query.filter(RagDocument.category == category)
    
    if scope == "global":
        query = query.filter(RagDocument.hospital_id == None)
    elif scope == "hospital":
        query = query.filter(RagDocument.hospital_id != None)
        
    if hospital_id:
        query = query.filter(RagDocument.hospital_id == str(hospital_id))

    query = query.order_by(RagDocument.created_at.desc())
    total = query.count()
    total_pages = (total + limit - 1) // limit if total > 0 else 0
    items = query.offset((page - 1) * limit).limit(limit).all()

    response_items = []
    for doc in items:
        # Retrieve hospital name
        h_name = None
        if doc.hospital_id:
            h = db.query(Hospital).filter(Hospital.id == doc.hospital_id).first()
            if h:
                h_name = h.name
        
        # Retrieve uploader name
        up_name = None
        if doc.uploaded_by:
            u = db.query(User).filter(User.id == doc.uploaded_by).first()
            if u:
                up_name = f"{u.first_name} {u.last_name}"

        # Retrieve count of generated chunks
        chunks_count = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).count()

        response_items.append(KnowledgeDocumentDetailResponse(
            id=doc.id,
            hospital_id=doc.hospital_id,
            hospital_name=h_name,
            uploaded_by=doc.uploaded_by,
            uploader_name=up_name,
            title=doc.title,
            file_url=f"/api/v1/super-admin/knowledge-base/{doc.id}/download",
            category=doc.category,
            version=doc.version,
            created_at=doc.created_at,
            updated_at=doc.updated_at,
            chunk_count=chunks_count
        ))

    return {
        "items": response_items,
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": total_pages
    }

@router.post("/knowledge-base/upload", response_model=KnowledgeDocumentDetailResponse, status_code=status.HTTP_201_CREATED)
def upload_knowledge_document(
    title: str = Form(...),
    category: str = Form(...),
    version: str = Form(...),
    hospital_id: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_admin: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    h_id = None
    if hospital_id and hospital_id.lower() != "null" and hospital_id.strip() != "":
        try:
            h_id = str(UUID(hospital_id))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid hospital_id UUID format."
            )
        # Ensure hospital exists
        h = db.query(Hospital).filter(Hospital.id == h_id).first()
        if not h:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Hospital associated with this scope does not exist."
            )

    try:
        doc = rag_service.ingest_document(
            db=db,
            hospital_id=h_id,
            uploaded_by=current_admin.id,
            title=title,
            category=category,
            version=version,
            file=file
        )
    except HTTPException:
        # Pass HTTPExceptions from service
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete ingestion pipeline: {str(e)}"
        )

    # Auditing
    log_audit(
        db=db,
        user_id=current_admin.id,
        action="CREATE",
        table_name="rag_documents",
        record_id=doc.id,
        new_values={
            "title": doc.title,
            "category": doc.category,
            "version": doc.version,
            "hospital_id": str(doc.hospital_id) if doc.hospital_id else None,
            "file_url": doc.file_url
        }
    )

    # Return details
    h_name = None
    if doc.hospital_id:
        h = db.query(Hospital).filter(Hospital.id == doc.hospital_id).first()
        if h:
            h_name = h.name
    
    up_name = f"{current_admin.first_name} {current_admin.last_name}"
    chunks_count = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).count()

    return KnowledgeDocumentDetailResponse(
        id=doc.id,
        hospital_id=doc.hospital_id,
        hospital_name=h_name,
        uploaded_by=doc.uploaded_by,
        uploader_name=up_name,
        title=doc.title,
        file_url=f"/api/v1/super-admin/knowledge-base/{doc.id}/download",
        category=doc.category,
        version=doc.version,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        chunk_count=chunks_count
    )

@router.get("/knowledge-base/{document_id}", response_model=KnowledgeDocumentDetailResponse)
def get_knowledge_document(
    document_id: UUID,
    current_admin: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    doc = db.query(RagDocument).filter(RagDocument.id == str(document_id)).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found."
        )

    h_name = None
    if doc.hospital_id:
        h = db.query(Hospital).filter(Hospital.id == doc.hospital_id).first()
        if h:
            h_name = h.name

    up_name = None
    if doc.uploaded_by:
        u = db.query(User).filter(User.id == doc.uploaded_by).first()
        if u:
            up_name = f"{u.first_name} {u.last_name}"

    chunks_count = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).count()

    return KnowledgeDocumentDetailResponse(
        id=doc.id,
        hospital_id=doc.hospital_id,
        hospital_name=h_name,
        uploaded_by=doc.uploaded_by,
        uploader_name=up_name,
        title=doc.title,
        file_url=f"/api/v1/super-admin/knowledge-base/{doc.id}/download",
        category=doc.category,
        version=doc.version,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        chunk_count=chunks_count
    )

# Sub-route to retrieve preview list of chunks for a document
@router.get("/knowledge-base/{document_id}/chunks")
def get_document_chunks(
    document_id: UUID,
    current_admin: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    doc = db.query(RagDocument).filter(RagDocument.id == str(document_id)).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found."
        )

    chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).order_by(DocumentChunk.chunk_index.asc()).all()
    # Explicitly exclude the raw vector embeddings to avoid bloating response payload
    return [
        {
            "id": c.id,
            "chunk_index": c.chunk_index,
            "content": c.content,
            "metadata": c.metadata_dict,
            "created_at": c.created_at
        } for c in chunks
    ]

@router.delete("/knowledge-base/{document_id}", status_code=status.HTTP_200_OK)
def delete_knowledge_document(
    document_id: UUID,
    current_admin: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    doc = db.query(RagDocument).filter(RagDocument.id == str(document_id)).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found."
        )

    file_url = doc.file_url

    # Check and delete file based on its storage location
    if file_url.startswith("knowledge-base/"):
        try:
            delete_rag_document(file_url)
        except Exception as e:
            print(f"[RAG SERVICE] Failed to delete Supabase storage object {file_url}: {e}")
    elif file_url.startswith("/static/uploads/"):
        filename = file_url.split("/")[-1]
        file_path = os.path.join("static/uploads", filename)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"[RAG SERVICE] Failed to delete file {file_path}: {e}")

    # Log audit
    log_audit(
        db=db,
        user_id=current_admin.id,
        action="DELETE",
        table_name="rag_documents",
        record_id=doc.id,
        old_values={"title": doc.title, "file_url": doc.file_url, "category": doc.category}
    )

    # Delete record (foreign key cascades to document_chunks)
    db.delete(doc)
    db.commit()

    return {"message": "Document and all associated chunks deleted successfully."}

@router.get("/knowledge-base/{document_id}/download")
def download_knowledge_document(
    document_id: UUID,
    current_admin: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    doc = db.query(RagDocument).filter(RagDocument.id == str(document_id)).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found."
        )

    file_url = doc.file_url

    # 1. Supabase Storage Object Path Redirect
    if file_url.startswith("knowledge-base/"):
        try:
            signed_url = create_signed_url(file_url, expires_in=60)
            return RedirectResponse(signed_url, status_code=307)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate download URL from storage: {str(e)}"
            )

    # 2. Legacy local file path redirect fallback
    elif file_url.startswith("/static/uploads/"):
        return RedirectResponse(file_url, status_code=307)

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Unknown file URL storage scheme."
    )
