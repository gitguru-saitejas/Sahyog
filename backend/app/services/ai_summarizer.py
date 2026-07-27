import os
import json
import urllib.request
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from app.schemas.timeline import EncounterTimelineCard, AISummaryResponse, PatientHeaderResponse

# In-memory AI Summary Cache: patient_id -> { "summary": AISummaryResponse, "version": int }
_SUMMARY_CACHE: Dict[str, Dict[str, Any]] = {}

def invalidate_patient_summary_cache(patient_id: str):
    """Call when a new encounter, prescription, or lab report is created for the patient."""
    if patient_id in _SUMMARY_CACHE:
        del _SUMMARY_CACHE[patient_id]
        print(f"[AI SUMMARIZER] Cache invalidated for patient_id: {patient_id}")

class AISummarizerService:
    @staticmethod
    def generate_overall_summary(
        header: PatientHeaderResponse,
        encounters: List[EncounterTimelineCard],
        force_refresh: bool = False
    ) -> AISummaryResponse:
        patient_id = header.patient_id

        # Check Cache
        if not force_refresh and patient_id in _SUMMARY_CACHE:
            cached_data = _SUMMARY_CACHE[patient_id]["data"]
            cached_data.is_cached = True
            return cached_data

        # Construct machine-readable text representation of timeline events
        events_text_blocks = []
        for idx, enc in enumerate(encounters):
            block = (
                f"Encounter #{idx+1} Date: {enc.encounter_date.strftime('%Y-%m-%d')}\n"
                f"Hospital/Doctor: {enc.hospital_name} - {enc.doctor_name} ({enc.doctor_specialization})\n"
                f"Severity: {enc.severity.value}\n"
                f"Diagnosis: {enc.primary_diagnosis}\n"
                f"Chief Complaint: {enc.chief_complaint}\n"
                f"Vitals: {json.dumps(enc.vitals_summary)}\n"
                f"Prescribed Medicines: {', '.join([m.get('medicine_name', '') for m in enc.prescriptions])}\n"
            )
            events_text_blocks.append(block)

        full_context = (
            f"PATIENT HEADER:\n"
            f"Name: {header.full_name}, Age: {header.age or 'Unknown'}, Gender: {header.gender or 'Unknown'}, Blood Group: {header.blood_group or 'Unknown'}\n"
            f"Known Allergies: {', '.join([a.get('allergen', '') for a in header.allergies]) or 'None reported'}\n"
            f"Chronic Conditions: {', '.join([c.get('condition_name', '') for c in header.conditions]) or 'None reported'}\n\n"
            f"CHRONOLOGICAL MEDICAL EVENTS (Newest First):\n" +
            ("\n---\n".join(events_text_blocks) if events_text_blocks else "No recorded encounters.")
        )

        # Generate summary using OpenAI / Gemini or intelligent rule-based fallback
        openai_key = os.getenv("OPENAI_API_KEY")
        summary_text = ""
        deltas: List[str] = []

        if openai_key:
            try:
                system_prompt = (
                    "You are a Clinical AI Medical Assistant embedded in an EMR system. "
                    "Analyze the provided patient timeline records and summarize the patient's medical journey. "
                    "STRICT CONSTRAINTS:\n"
                    "1. Summarize ONLY the facts present in the text. DO NOT invent diagnoses or treatments.\n"
                    "2. Highlight PROGRESSION and DELTAS (e.g. vital improvements, medication adjustments, unresolved complaints).\n"
                    "3. Keep bullet points concise and actionable for attending doctors."
                )
                
                payload = {
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": full_context}
                    ],
                    "temperature": 0.2
                }
                
                req = urllib.request.Request(
                    "https://api.openai.com/v1/chat/completions",
                    data=json.dumps(payload).encode("utf-8"),
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {openai_key}"
                    },
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=8) as response:
                    res = json.loads(response.read().decode("utf-8"))
                    summary_text = res["choices"][0]["message"]["content"]
            except Exception as e:
                print(f"[AI SUMMARIZER] External LLM call failed: {e}")

        # Intelligent Fallback Generator if LLM is unavailable or unconfigured
        if not summary_text:
            if not encounters:
                summary_text = (
                    f"Patient {header.full_name} has no recorded medical encounters in the system. "
                    "Initial clinical triage or consultation is recommended."
                )
                deltas = ["No previous visits recorded."]
            else:
                latest = encounters[0]
                summary_text = (
                    f"Patient {header.full_name} ({header.age or 'Adult'} Yrs, {header.gender or 'N/A'}) "
                    f"has {len(encounters)} recorded encounter(s) in their longitudinal timeline.\n\n"
                    f"**Recent Clinical Status ({latest.encounter_date.strftime('%b %d, %Y')}):**\n"
                    f"• Primary Diagnosis: {latest.primary_diagnosis}\n"
                    f"• Chief Complaint: {latest.chief_complaint or 'Routine follow-up'}\n"
                    f"• Prescribed Active Medications: {', '.join([m.get('medicine_name', '') for m in latest.prescriptions]) or 'None'}\n"
                    f"• Known Allergies: {', '.join([a.get('allergen', '') for a in header.allergies]) or 'No known drug allergies'}"
                )

                # Compute key clinical deltas
                deltas.append(f"Most recent diagnosis: {latest.primary_diagnosis} ({latest.severity.value} priority)")
                if latest.vitals_summary:
                    v_str = ", ".join([f"{k.upper()}: {v}" for k, v in latest.vitals_summary.items()])
                    deltas.append(f"Latest Vitals: {v_str}")
                if len(encounters) > 1:
                    prev = encounters[1]
                    deltas.append(f"Previous visit was on {prev.encounter_date.strftime('%b %d, %Y')} for {prev.primary_diagnosis}.")
                else:
                    deltas.append("This is the patient's first logged encounter at this facility.")

        res_model = AISummaryResponse(
            patient_id=patient_id,
            encounter_id=None,
            is_cached=False,
            overall_summary=summary_text,
            key_deltas=deltas,
            generated_at=datetime.now(timezone.utc)
        )

        # Cache summary
        _SUMMARY_CACHE[patient_id] = {
            "data": res_model,
            "cached_at": datetime.now(timezone.utc)
        }

        return res_model

    @staticmethod
    def generate_encounter_summary(
        enc: EncounterTimelineCard
    ) -> AISummaryResponse:
        """Generates a focused summary for a single selected encounter card."""
        meds_str = ", ".join([f"{m.get('medicine_name')} ({m.get('frequency', '')})" for m in enc.prescriptions])
        vitals_str = ", ".join([f"{k.upper()}: {v}" for k, v in enc.vitals_summary.items()]) if enc.vitals_summary else "Vitals unrecorded"
        files_str = ", ".join([a.get("name", "") for a in enc.attachments]) if enc.attachments else "No external files"

        summary = (
            f"**Encounter Summary ({enc.encounter_date.strftime('%b %d, %Y')}):**\n"
            f"Patient evaluated by {enc.doctor_name} ({enc.doctor_specialization}) at {enc.hospital_name}.\n\n"
            f"• **Chief Complaint:** {enc.chief_complaint or 'Not specified'}\n"
            f"• **Primary Diagnosis:** {enc.primary_diagnosis}\n"
            f"• **Vitals Record:** {vitals_str}\n"
            f"• **Prescribed Medicines:** {meds_str or 'None'}\n"
            f"• **Attached Documents:** {files_str}"
        )

        deltas = [
            f"Encounter Priority: {enc.severity.value}",
            f"Diagnosis: {enc.primary_diagnosis}",
            f"Total Prescriptions: {len(enc.prescriptions)} item(s)"
        ]

        return AISummaryResponse(
            patient_id=enc.patient_id,
            encounter_id=enc.encounter_id,
            is_cached=False,
            overall_summary=summary,
            key_deltas=deltas,
            generated_at=datetime.now(timezone.utc)
        )
