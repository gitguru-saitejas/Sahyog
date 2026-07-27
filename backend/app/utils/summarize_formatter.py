from datetime import datetime, date
from typing import List, Dict, Any
from app.models.patient import Patient, Encounter, Prescription, PrescriptionMedicine

class SummarizeFormatter:
    @staticmethod
    def calculate_age(dob: date) -> int:
        if not dob:
            return 0
        today = date.today()
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

    @staticmethod
    def format_metadata(patient: Patient) -> str:
        """
        Formats patient demographics, allergies, and chronic conditions into a clean summary block.
        """
        age = SummarizeFormatter.calculate_age(patient.date_of_birth) if patient.date_of_birth else "N/A"
        gender = patient.gender or "N/A"
        blood_group = patient.blood_group or "N/A"

        allergies = [f"{a.allergen} ({a.severity or 'Routine'})" for a in patient.allergies] if patient.allergies else ["None Reported"]
        chronic_conditions = [c.condition_name for c in patient.conditions if c.status == "ACTIVE"] if patient.conditions else ["None Reported"]

        metadata_lines = [
            f"Name: {patient.first_name} {patient.last_name}",
            f"Age: {age} | Gender: {gender} | Blood Group: {blood_group}",
            f"Allergies: {', '.join(allergies)}",
            f"Chronic Conditions: {', '.join(chronic_conditions)}",
        ]
        return "\n".join(metadata_lines)

    @staticmethod
    def format_chronology(encounters: List[Encounter]) -> str:
        """
        Converts list of database encounters + prescriptions into a clean chronological text timeline.
        """
        if not encounters:
            return "No previous clinical history or encounters available for this patient."

        # Sort encounters chronologically, oldest first, for narrative flow to Gemini
        sorted_encounters = sorted(encounters, key=lambda e: e.created_at or datetime.min)

        formatted_events = []
        for idx, enc in enumerate(sorted_encounters, 1):
            date_str = enc.created_at.strftime("%d %b %Y") if enc.created_at else "N/A"
            lines = [
                f"Encounter #{idx} - Date: {date_str}",
                f"  Status: {enc.status}"
            ]
            if enc.chief_complaint:
                lines.append(f"  Chief Complaint: {enc.chief_complaint}")
            if enc.symptoms:
                lines.append(f"  Symptoms: {enc.symptoms} (Duration: {enc.symptoms_duration or 'N/A'})")
            
            # Vitals
            vitals = []
            if enc.blood_pressure: vitals.append(f"BP: {enc.blood_pressure}")
            if enc.pulse_rate: vitals.append(f"Pulse: {enc.pulse_rate} bpm")
            if enc.temperature: vitals.append(f"Temp: {enc.temperature} C")
            if enc.spo2: vitals.append(f"SpO2: {enc.spo2}%")
            if vitals:
                lines.append(f"  Vitals: {', '.join(vitals)}")

            if enc.clinical_notes:
                lines.append(f"  Clinical Notes: {enc.clinical_notes}")

            # Prescriptions
            if enc.prescription:
                presc = enc.prescription
                if presc.diagnosis:
                    lines.append(f"  Diagnosis: {presc.diagnosis}")
                if presc.notes:
                    lines.append(f"  Prescription Notes: {presc.notes}")
                
                # Medicines
                if presc.medicines:
                    meds_list = []
                    for m in presc.medicines:
                        med_detail = f"{m.medicine_name}"
                        if m.strength: med_detail += f" {m.strength}"
                        if m.frequency: med_detail += f" ({m.frequency})"
                        if m.duration: med_detail += f" for {m.duration}"
                        if m.instructions: med_detail += f" [{m.instructions}]"
                        meds_list.append(med_detail)
                    lines.append(f"  Prescribed Medications:\n    - " + "\n    - ".join(meds_list))

            # Lab Results
            labs = []
            if enc.cbc: labs.append(f"CBC: {enc.cbc}")
            if enc.blood_sugar: labs.append(f"Blood Sugar: {enc.blood_sugar}")
            if enc.urine_test: labs.append(f"Urine Test: {enc.urine_test}")
            if enc.ecg: labs.append(f"ECG: {enc.ecg}")
            if enc.other_labs: labs.append(f"Other Labs: {enc.other_labs}")
            if labs:
                lines.append(f"  Lab Findings:\n    * " + "\n    * ".join(labs))

            formatted_events.append("\n".join(lines))

        return "\n\n--------------------------------\n\n".join(formatted_events)
