from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from datetime import datetime, timezone
from app.models.patient import (
    HospitalUser, DoctorProfile, SupportStaffProfile,
    Department, Encounter, Prescription, PrescriptionMedicine, HospitalAuditLog
)

class HospitalRepository:
    def __init__(self, db: Session):
        self.db = db

    # Department Repos
    def get_department(self, hospital_id: str, dept_id: str) -> Optional[Department]:
        return self.db.query(Department).filter(
            and_(Department.id == dept_id, Department.hospital_id == hospital_id, Department.deleted_at == None)
        ).first()

    def get_departments(self, hospital_id: str) -> List[Department]:
        return self.db.query(Department).filter(
            and_(Department.hospital_id == hospital_id, Department.deleted_at == None)
        ).all()

    def create_department(self, hospital_id: str, name: str, description: Optional[str]) -> Department:
        dept = Department(hospital_id=hospital_id, name=name, description=description)
        self.db.add(dept)
        self.db.commit()
        self.db.refresh(dept)
        return dept

    # Employee / HospitalUser Repos
    def get_employee_by_id(self, employee_id: str) -> Optional[HospitalUser]:
        return self.db.query(HospitalUser).filter(
            and_(HospitalUser.employee_id == employee_id, HospitalUser.deleted_at == None)
        ).first()

    def get_employee(self, hospital_id: str, user_id: str) -> Optional[HospitalUser]:
        return self.db.query(HospitalUser).filter(
            and_(HospitalUser.id == user_id, HospitalUser.hospital_id == hospital_id, HospitalUser.deleted_at == None)
        ).first()

    def get_employees_by_role(self, hospital_id: str, role: str) -> List[HospitalUser]:
        return self.db.query(HospitalUser).filter(
            and_(HospitalUser.hospital_id == hospital_id, HospitalUser.role == role, HospitalUser.deleted_at == None)
        ).all()

    # Encounter Repos
    def get_encounter(self, hospital_id: str, encounter_id: str) -> Optional[Encounter]:
        return self.db.query(Encounter).filter(
            and_(Encounter.id == encounter_id, Encounter.hospital_id == hospital_id)
        ).first()

    def get_encounters(self, hospital_id: str, patient_id: Optional[str] = None, doctor_id: Optional[str] = None) -> List[Encounter]:
        query = self.db.query(Encounter).filter(Encounter.hospital_id == hospital_id)
        if patient_id:
            query = query.filter(Encounter.patient_id == patient_id)
        if doctor_id:
            query = query.filter(Encounter.doctor_id == doctor_id)
        return query.order_by(Encounter.created_at.desc()).all()

    # Prescription Repos
    def get_prescription(self, prescription_id: str) -> Optional[Prescription]:
        return self.db.query(Prescription).filter(Prescription.id == prescription_id).first()

    # Audit Logging
    def create_audit_log(self, hospital_id: str, user_id: Optional[str], action: str, resource: str, resource_id: Optional[str], ip_address: Optional[str], details: Optional[str]) -> HospitalAuditLog:
        log = HospitalAuditLog(
            hospital_id=hospital_id,
            user_id=user_id,
            action=action,
            resource=resource,
            resource_id=resource_id,
            ip_address=ip_address,
            details=details
        )
        self.db.add(log)
        self.db.commit()
        return log
