from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, status
from typing import List, Optional
import json

from app.repositories.hospital import HospitalRepository
from app.models.patient import (
    HospitalUser, DoctorProfile, SupportStaffProfile,
    Department, Encounter, Prescription, PrescriptionMedicine, HospitalAuditLog, Patient
)
from app.core import security

class HospitalService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = HospitalRepository(db)

    # ---------------------------------------------------------
    # AUTHENTICATION
    # ---------------------------------------------------------
    def employee_login(self, employee_id: str, password: str, ip_address: Optional[str] = None) -> dict:
        user = self.repo.get_employee_by_id(employee_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee account not found."
            )

        # Check account status & lockouts
        if user.status == "INACTIVE":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive. Please contact your administrator."
            )

        if user.locked_until and user.locked_until > datetime.now(timezone.utc):
            time_left = int((user.locked_until - datetime.now(timezone.utc)).total_seconds() / 60)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account is temporarily locked. Try again in {time_left} minutes."
            )

        # Password check
        if not security.verify_password(password, user.password_hash):
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 5:
                user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=15)
                user.status = "LOCKED"
            self.db.commit()

            self.repo.create_audit_log(
                hospital_id=user.hospital_id,
                user_id=user.id,
                action="LOGIN_FAILED",
                resource="hospital_users",
                resource_id=user.id,
                ip_address=ip_address,
                details=json.dumps({"reason": "Invalid password", "attempts": user.failed_login_attempts})
            )

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password credentials."
            )

        # Reset failed attempts on success
        user.failed_login_attempts = 0
        user.locked_until = None
        if user.status == "LOCKED":
            user.status = "ACTIVE"
        self.db.commit()

        # Generate JWT token with custom claims
        expires_delta = timedelta(minutes=60)
        access_token = security.create_access_token(
            subject=user.id,
            expires_delta=expires_delta
        )
        refresh_token = security.create_access_token(
            subject=user.id,
            expires_delta=timedelta(days=7)
        )

        self.repo.create_audit_log(
            hospital_id=user.hospital_id,
            user_id=user.id,
            action="LOGIN_SUCCESS",
            resource="hospital_users",
            resource_id=user.id,
            ip_address=ip_address,
            details=json.dumps({"role": user.role})
        )

        return {
            "accessToken": access_token,
            "refreshToken": refresh_token,
            "user_id": user.id,
            "hospital_id": user.hospital_id,
            "employee_id": user.employee_id,
            "role": user.role,
            "first_name": user.first_name,
            "last_name": user.last_name
        }

    # ---------------------------------------------------------
    # HOSPITAL ADMIN
    # ---------------------------------------------------------
    def create_doctor(self, hospital_id: str, doc_data: dict, admin_id: str, ip_address: Optional[str] = None) -> HospitalUser:
        # Check unique employee_id
        if self.repo.get_employee_by_id(doc_data["employee_id"]):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee ID already exists.")

        # Atomic creation
        try:
            password_hash = security.get_password_hash(doc_data["password"])
            user = HospitalUser(
                hospital_id=hospital_id,
                employee_id=doc_data["employee_id"],
                password_hash=password_hash,
                role="DOCTOR",
                first_name=doc_data["first_name"],
                last_name=doc_data["last_name"],
                email=doc_data.get("email"),
                phone=doc_data.get("phone"),
                department_id=doc_data.get("department_id"),
                status="ACTIVE"
            )
            self.db.add(user)
            self.db.flush()

            profile = DoctorProfile(
                user_id=user.id,
                specialization=doc_data["specialization"],
                qualification=doc_data["qualification"],
                license_number=doc_data["license_number"],
                experience=doc_data.get("experience", 0),
                bio=doc_data.get("bio")
            )
            self.db.add(profile)
            self.db.commit()
            self.db.refresh(user)

            self.repo.create_audit_log(
                hospital_id=hospital_id,
                user_id=admin_id,
                action="CREATE_DOCTOR",
                resource="hospital_users",
                resource_id=user.id,
                ip_address=ip_address,
                details=json.dumps({"employee_id": user.employee_id})
            )
            return user
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=500, detail=f"Database error during doctor creation: {str(e)}")

    def update_doctor(self, hospital_id: str, user_id: str, doc_data: dict, admin_id: str, ip_address: Optional[str] = None) -> HospitalUser:
        user = self.repo.get_employee(hospital_id, user_id)
        if not user or user.role != "DOCTOR":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found.")

        for key, val in doc_data.items():
            if hasattr(user, key) and val is not None:
                setattr(user, key, val)
            if user.doctor_profile and hasattr(user.doctor_profile, key) and val is not None:
                setattr(user.doctor_profile, key, val)

        self.db.commit()
        self.db.refresh(user)

        self.repo.create_audit_log(
            hospital_id=hospital_id,
            user_id=admin_id,
            action="UPDATE_DOCTOR",
            resource="hospital_users",
            resource_id=user.id,
            ip_address=ip_address,
            details=json.dumps({"updated_fields": list(doc_data.keys())})
        )
        return user

    def delete_employee(self, hospital_id: str, user_id: str, admin_id: str, ip_address: Optional[str] = None):
        user = self.repo.get_employee(hospital_id, user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")

        user.deleted_at = datetime.now(timezone.utc)
        user.status = "INACTIVE"
        self.db.commit()

        self.repo.create_audit_log(
            hospital_id=hospital_id,
            user_id=admin_id,
            action="DELETE_EMPLOYEE",
            resource="hospital_users",
            resource_id=user_id,
            ip_address=ip_address,
            details=json.dumps({"employee_id": user.employee_id})
        )

    def create_support_staff(self, hospital_id: str, staff_data: dict, admin_id: str, ip_address: Optional[str] = None) -> HospitalUser:
        if self.repo.get_employee_by_id(staff_data["employee_id"]):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee ID already exists.")

        try:
            password_hash = security.get_password_hash(staff_data["password"])
            user = HospitalUser(
                hospital_id=hospital_id,
                employee_id=staff_data["employee_id"],
                password_hash=password_hash,
                role="SUPPORT_STAFF",
                first_name=staff_data["first_name"],
                last_name=staff_data["last_name"],
                email=staff_data.get("email"),
                phone=staff_data.get("phone"),
                department_id=staff_data.get("department_id"),
                status="ACTIVE"
            )
            self.db.add(user)
            self.db.flush()

            profile = SupportStaffProfile(
                user_id=user.id,
                designation=staff_data["designation"],
                department_id=staff_data.get("department_id")
            )
            self.db.add(profile)
            self.db.commit()
            self.db.refresh(user)

            self.repo.create_audit_log(
                hospital_id=hospital_id,
                user_id=admin_id,
                action="CREATE_SUPPORT_STAFF",
                resource="hospital_users",
                resource_id=user.id,
                ip_address=ip_address,
                details=json.dumps({"employee_id": user.employee_id})
            )
            return user
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=500, detail=f"Database error during support staff creation: {str(e)}")

    def update_support_staff(self, hospital_id: str, user_id: str, staff_data: dict, admin_id: str, ip_address: Optional[str] = None) -> HospitalUser:
        user = self.repo.get_employee(hospital_id, user_id)
        if not user or user.role != "SUPPORT_STAFF":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Support staff member not found.")

        for key, val in staff_data.items():
            if hasattr(user, key) and val is not None:
                setattr(user, key, val)
            if user.support_staff_profile and hasattr(user.support_staff_profile, key) and val is not None:
                setattr(user.support_staff_profile, key, val)

        self.db.commit()
        self.db.refresh(user)

        self.repo.create_audit_log(
            hospital_id=hospital_id,
            user_id=admin_id,
            action="UPDATE_SUPPORT_STAFF",
            resource="hospital_users",
            resource_id=user.id,
            ip_address=ip_address,
            details=json.dumps({"updated_fields": list(staff_data.keys())})
        )
        return user

    def reset_employee_password(self, hospital_id: str, target_employee_id: str, new_password: str, admin_id: str, ip_address: Optional[str] = None):
        user = self.repo.get_employee_by_id(target_employee_id)
        if not user or str(user.hospital_id) != hospital_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found in your hospital.")

        user.password_hash = security.get_password_hash(new_password)
        self.db.commit()

        self.repo.create_audit_log(
            hospital_id=hospital_id,
            user_id=admin_id,
            action="RESET_PASSWORD",
            resource="hospital_users",
            resource_id=user.id,
            ip_address=ip_address,
            details=json.dumps({"target_employee_id": target_employee_id})
        )

    def get_dashboard_summary(self, hospital_id: str) -> dict:
        total_doctors = self.db.query(HospitalUser).filter(
            HospitalUser.hospital_id == hospital_id, HospitalUser.role == "DOCTOR", HospitalUser.deleted_at == None
        ).count()
        total_staff = self.db.query(HospitalUser).filter(
            HospitalUser.hospital_id == hospital_id, HospitalUser.role == "SUPPORT_STAFF", HospitalUser.deleted_at == None
        ).count()
        total_departments = self.db.query(Department).filter(
            Department.hospital_id == hospital_id, Department.deleted_at == None
        ).count()
        total_encounters = self.db.query(Encounter).filter(Encounter.hospital_id == hospital_id).count()

        return {
            "total_doctors": total_doctors,
            "total_staff": total_staff,
            "total_departments": total_departments,
            "total_encounters": total_encounters
        }

    # ---------------------------------------------------------
    # CLINICAL ENCOUNTERS (SUPPORT STAFF & DOCTORS)
    # ---------------------------------------------------------
    def get_patient_by_query(self, query_str: str) -> List[Patient]:
        # Search patient by code, name, phone, or aadhaar_last4
        return self.db.query(Patient).filter(
            (Patient.patient_code == query_str) |
            (Patient.first_name.ilike(f"%{query_str}%")) |
            (Patient.last_name.ilike(f"%{query_str}%")) |
            (Patient.aadhaar_last4 == query_str[-4:])
        ).all()

    def create_or_update_encounter(self, hospital_id: str, staff_id: str, data: dict, ip_address: Optional[str] = None) -> Encounter:
        # Check if an encounter_id is provided for updates
        encounter_id = data.get("encounter_id")
        encounter = None
        if encounter_id:
            encounter = self.repo.get_encounter(hospital_id, encounter_id)

        if not encounter:
            # Validate patient existence
            patient = self.db.query(Patient).filter(Patient.id == data["patient_id"]).first()
            if not patient:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient profile not found.")

            # Create new encounter (partial insert: all vital/clinical inputs optional)
            encounter = Encounter(
                patient_id=data["patient_id"],
                hospital_id=hospital_id,
                staff_id=staff_id,
                doctor_id=data.get("doctor_id"),
                status="PENDING"
            )
            self.db.add(encounter)
            self.db.flush() # get UUID

        # Update clinical/vital fields if provided in data payload
        for key, val in data.items():
            if hasattr(encounter, key) and val is not None and key not in ["id", "patient_id", "hospital_id", "staff_id"]:
                setattr(encounter, key, val)

        encounter.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(encounter)

        # Broadcast via simulated realtime trigger / webhook / logs
        self.repo.create_audit_log(
            hospital_id=hospital_id,
            user_id=staff_id,
            action="SAVE_ENCOUNTER" if not encounter_id else "UPDATE_ENCOUNTER",
            resource="encounters",
            resource_id=encounter.id,
            ip_address=ip_address,
            details=json.dumps({"patient_id": str(encounter.patient_id)})
        )
        return encounter

    # ---------------------------------------------------------
    # CONSULTATION & PRESCRIPTIONS (DOCTOR)
    # ---------------------------------------------------------
    def get_doctor_dashboard(self, hospital_id: str, doctor_id: str) -> dict:
        today_start = datetime.combine(datetime.today(), datetime.min.time())
        encounters = self.db.query(Encounter).filter(
            Encounter.hospital_id == hospital_id,
            Encounter.doctor_id == doctor_id,
            Encounter.created_at >= today_start
        ).all()

        pending = [e for e in encounters if e.status == "PENDING"]
        completed = [e for e in encounters if e.status == "COMPLETED"]

        return {
            "total_today": len(encounters),
            "pending_count": len(pending),
            "completed_count": len(completed),
            "encounters": encounters
        }

    def complete_consultation(self, hospital_id: str, encounter_id: str, doctor_id: str, data: dict, ip_address: Optional[str] = None) -> Encounter:
        encounter = self.repo.get_encounter(hospital_id, encounter_id)
        if not encounter:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Encounter not found.")

        if str(encounter.doctor_id) != doctor_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to complete this encounter.")

        # Create Prescription under single transaction
        try:
            # Update clinical notes in encounter
            if data.get("clinical_notes"):
                encounter.clinical_notes = data["clinical_notes"]
            encounter.status = "COMPLETED"
            encounter.updated_at = datetime.now(timezone.utc)

            # Create Prescription entry
            prescription = Prescription(
                encounter_id=encounter.id,
                patient_id=encounter.patient_id,
                doctor_id=doctor_id,
                diagnosis=data.get("diagnosis"),
                notes=data.get("notes")
            )
            self.db.add(prescription)
            self.db.flush()

            # Add medicines
            for med in data.get("medicines", []):
                medicine = PrescriptionMedicine(
                    prescription_id=prescription.id,
                    medicine_name=med["medicine_name"],
                    strength=med.get("strength"),
                    frequency=med.get("frequency"),
                    duration=med.get("duration"),
                    instructions=med.get("instructions")
                )
                self.db.add(medicine)

            self.db.commit()
            self.db.refresh(encounter)

            self.repo.create_audit_log(
                hospital_id=hospital_id,
                user_id=doctor_id,
                action="COMPLETE_CONSULTATION",
                resource="encounters",
                resource_id=encounter.id,
                ip_address=ip_address,
                details=json.dumps({"prescription_id": str(prescription.id)})
            )
            return encounter
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=500, detail=f"Database error completing consultation: {str(e)}")
