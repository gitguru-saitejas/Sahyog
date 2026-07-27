from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional, Dict, Any
from datetime import datetime, date

from app.models.patient import Patient, Encounter, Prescription, PatientCondition, PatientAllergy
from app.models.rag import RagDocument
from app.schemas.timeline import (
    EncounterTimelineCard, SubEvent, ClinicalSeverity, TimelineCategory,
    TimelineResponse, PatientHeaderResponse
)

def calculate_age(dob: Optional[date]) -> Optional[int]:
    if not dob:
        return None
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

class TimelineService:
    def __init__(self, db: Session):
        self.db = db

    def get_patient_header(self, patient: Patient) -> PatientHeaderResponse:
        """Constructs patient header payload with demographics, allergies, chronic conditions, and emergency contact."""
        allergies = [
            {"id": a.id, "allergen": a.allergen, "severity": a.severity or "Moderate"}
            for a in (patient.allergies or [])
        ]
        conditions = [
            {"id": c.id, "condition_name": c.condition_name, "status": c.status, "diagnosed_date": str(c.diagnosed_date) if c.diagnosed_date else None}
            for c in (patient.conditions or [])
        ]
        emergency = None
        if patient.emergency_contact:
            emergency = {
                "name": patient.emergency_contact.name,
                "relationship": patient.emergency_contact.relationship,
                "phone_number": patient.emergency_contact.phone_number
            }

        return PatientHeaderResponse(
            patient_id=patient.id,
            patient_code=patient.patient_code,
            first_name=patient.first_name,
            last_name=patient.last_name,
            full_name=f"{patient.first_name} {patient.last_name}",
            age=calculate_age(patient.date_of_birth),
            gender=patient.gender,
            blood_group=patient.blood_group,
            phone_number=patient.family_account.mobile_number if (patient.family_account and hasattr(patient.family_account, 'mobile_number')) else None,
            allergies=allergies,
            conditions=conditions,
            emergency_contact=emergency
        )

    def determine_severity(self, encounter: Encounter, prescription: Optional[Prescription]) -> ClinicalSeverity:
        """Determines clinical priority badge based on diagnosis, chief complaint, and vitals."""
        notes = f"{encounter.chief_complaint or ''} {encounter.symptoms or ''} {encounter.clinical_notes or ''} {prescription.diagnosis if prescription else ''}".lower()
        
        # Critical keywords
        if any(k in notes for k in ["emergency", "icu", "surgery", "cardiac", "stroke", "ischemic", "acute appendicitis", "severe"]):
            return ClinicalSeverity.CRITICAL

        # Moderate keywords
        if any(k in notes for k in ["admission", "admitted", "imaging", "mri", "ct scan", "fracture", "urgent"]):
            return ClinicalSeverity.MODERATE

        # Administrative / Documents
        if encounter.status == "ADMINISTRATIVE":
            return ClinicalSeverity.ADMINISTRATIVE

        return ClinicalSeverity.ROUTINE

    def get_patient_timeline(
        self,
        patient_id: str,
        category: Optional[str] = None,
        year: Optional[int] = None,
        search_query: Optional[str] = None
    ) -> TimelineResponse:
        """Retrieves and standardizes domain records into encounter-centric timeline cards."""
        query = self.db.query(Encounter).filter(Encounter.patient_id == patient_id)
        
        encounters = query.order_by(desc(Encounter.created_at)).all()
        
        cards: List[EncounterTimelineCard] = []
        years_set = set()

        for enc in encounters:
            dt = enc.created_at or datetime.now()
            enc_year = dt.year
            years_set.add(enc_year)

            rx = enc.prescription
            doctor_name = "Dr. Assigned"
            specialization = "General Physician"
            hospital_name = "Sahyog Medical Center"
            dept_name = "General OPD"

            if enc.doctor:
                doctor_name = f"Dr. {enc.doctor.first_name} {enc.doctor.last_name}"
                specialization = enc.doctor.specialization or "Specialist"
                if enc.doctor.department:
                    dept_name = enc.doctor.department.name

            # Build sub-events for encounter
            sub_events: List[SubEvent] = []

            # 1. Chief Complaint & Symptoms
            if enc.chief_complaint or enc.symptoms:
                sub_events.append(SubEvent(
                    id=f"{enc.id}_complaint",
                    type="CHIEF_COMPLAINT",
                    title="Chief Complaint & Symptoms",
                    description=f"{enc.chief_complaint or ''} {f'({enc.symptoms})' if enc.symptoms else ''}".strip(),
                    details={"duration": enc.symptoms_duration}
                ))

            # 2. Vitals
            vitals_dict = {}
            if enc.blood_pressure: vitals_dict["bp"] = enc.blood_pressure
            if enc.temperature: vitals_dict["temp"] = f"{enc.temperature}°F"
            if enc.pulse_rate: vitals_dict["pulse"] = f"{enc.pulse_rate} bpm"
            if enc.spo2: vitals_dict["spo2"] = f"{enc.spo2}%"
            if enc.bmi: vitals_dict["bmi"] = str(enc.bmi)

            if vitals_dict:
                sub_events.append(SubEvent(
                    id=f"{enc.id}_vitals",
                    type="VITALS",
                    title="Vitals Recorded",
                    description=", ".join([f"{k.upper()}: {v}" for k, v in vitals_dict.items()]),
                    details=vitals_dict
                ))

            # 3. Diagnosis & Prescription
            rx_list = []
            primary_diag = "General Checkup / Triage"
            if rx:
                if rx.diagnosis:
                    primary_diag = rx.diagnosis
                sub_events.append(SubEvent(
                    id=f"{rx.id}_diagnosis",
                    type="DIAGNOSIS",
                    title="Clinical Diagnosis",
                    description=rx.diagnosis or "No diagnosis specified",
                    details={"notes": rx.notes}
                ))

                for med in (rx.medicines or []):
                    rx_item = {
                        "id": med.id,
                        "medicine_name": med.medicine_name,
                        "strength": med.strength or "Standard",
                        "frequency": med.frequency or "1-0-1",
                        "duration": med.duration or "5 days",
                        "instructions": med.instructions or ""
                    }
                    rx_list.append(rx_item)

                if rx_list:
                    sub_events.append(SubEvent(
                        id=f"{rx.id}_prescription",
                        type="PRESCRIPTION",
                        title=f"Prescription Generated ({len(rx_list)} Medicines)",
                        description=", ".join([m["medicine_name"] for m in rx_list]),
                        details={"medicines": rx_list}
                    ))

            # 4. Lab Results / Clinical Uploads
            attachments = []
            if enc.uploaded_files:
                files_list = [f.strip() for f in enc.uploaded_files.split(",") if f.strip()]
                for f_name in files_list:
                    attachments.append({
                        "name": f_name.split("/")[-1],
                        "url": f_name,
                        "type": "DOCUMENT"
                    })
                sub_events.append(SubEvent(
                    id=f"{enc.id}_attachments",
                    type="ATTACHMENT",
                    title=f"Medical Records & Reports ({len(attachments)})",
                    description=", ".join([a["name"] for a in attachments]),
                    details={"files": attachments}
                ))

            # Determine severity & category
            severity = self.determine_severity(enc, rx)
            
            # Map category
            cat = TimelineCategory.CONSULTATION
            if "imaging" in primary_diag.lower() or "x-ray" in primary_diag.lower() or "mri" in primary_diag.lower():
                cat = TimelineCategory.IMAGING
            elif "surgery" in primary_diag.lower() or "operation" in primary_diag.lower():
                cat = TimelineCategory.SURGERY
            elif "admission" in primary_diag.lower() or "admitted" in primary_diag.lower():
                cat = TimelineCategory.ADMISSION
            elif rx_list:
                cat = TimelineCategory.PRESCRIPTION
            elif attachments:
                cat = TimelineCategory.LAB_REPORT

            card = EncounterTimelineCard(
                encounter_id=enc.id,
                patient_id=patient_id,
                encounter_date=dt,
                year=enc_year,
                hospital_name=hospital_name,
                doctor_name=doctor_name,
                doctor_specialization=specialization,
                department_name=dept_name,
                severity=severity,
                category=cat,
                status=enc.status,
                primary_diagnosis=primary_diag,
                chief_complaint=enc.chief_complaint or "",
                clinical_notes=enc.clinical_notes or "",
                sub_events=sub_events,
                vitals_summary=vitals_dict,
                prescriptions=rx_list,
                attachments=attachments
            )

            cards.append(card)

        # Apply filtering
        if year:
            cards = [c for c in cards if c.year == year]
        if category and category.upper() != "ALL":
            cards = [c for c in cards if c.category.value == category.upper()]
        if search_query:
            sq = search_query.lower()
            filtered_cards = []
            for c in cards:
                matches_diag = sq in (c.primary_diagnosis or "").lower()
                matches_doc = sq in c.doctor_name.lower()
                matches_complaint = sq in (c.chief_complaint or "").lower()
                matches_sub = any(sq in s.title.lower() or sq in s.description.lower() for s in c.sub_events)
                if matches_diag or matches_doc or matches_complaint or matches_sub:
                    filtered_cards.append(c)
            cards = filtered_cards

        return TimelineResponse(
            patient_id=patient_id,
            total_encounters=len(cards),
            years_available=sorted(list(years_set), reverse=True),
            encounters=cards
        )
