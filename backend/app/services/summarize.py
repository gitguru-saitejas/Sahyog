import json
import hashlib
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.patient import Patient, Encounter
from app.providers.gemini_provider import GeminiProvider
from app.prompts.summarize_prompt import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE
from app.utils.summarize_formatter import SummarizeFormatter
from app.schemas.summarize import ClinicalSummaryResponse, SummarizeStatusResponse

logger = logging.getLogger("sahyog.summarize")

# In-memory summary cache: patient_id -> { "summary": ClinicalSummaryResponse, "generated_at": str, "timeline_hash": str }
_SUMMARIZE_CACHE: Dict[str, Dict[str, Any]] = {}

class SummarizeService:
    def __init__(self, db: Session):
        self.db = db
        self.provider = GeminiProvider()

    def _generate_timeline_hash(self, patient: Patient, encounters: list[Encounter]) -> str:
        """
        Generates a unique hash based on patient demographic and encounter update times.
        If any vital, note, prescription, or demographic details change, this hash changes,
        ensuring automated cache invalidation checks.
        """
        hash_parts = [
            str(patient.id),
            str(patient.updated_at.timestamp() if patient.updated_at else 0.0),
            str(len(patient.allergies)),
            str(len(patient.conditions))
        ]
        for enc in encounters:
            hash_parts.append(f"{enc.id}:{enc.updated_at.timestamp() if enc.updated_at else 0.0}")
            
        hash_string = "|".join(hash_parts)
        return hashlib.sha256(hash_string.encode("utf-8")).hexdigest()

    def check_cache_status(self, patient_id: str) -> SummarizeStatusResponse:
        """
        Checks the status of the summary cache for a patient.
        Does NOT trigger Gemini summary generation.
        """
        patient = self.db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise ValueError(f"Patient with ID '{patient_id}' not found.")

        encounters = self.db.query(Encounter).filter(Encounter.patient_id == patient_id).all()
        current_hash = self._generate_timeline_hash(patient, encounters)

        if patient_id in _SUMMARIZE_CACHE:
            cached = _SUMMARIZE_CACHE[patient_id]
            is_outdated = cached.get("timeline_hash") != current_hash
            return SummarizeStatusResponse(
                has_cache=True,
                is_outdated=is_outdated,
                summary=cached["summary"].summary,
                generated_at=cached["summary"].generated_at
            )
        
        return SummarizeStatusResponse(has_cache=False, is_outdated=True)

    def summarize_patient(self, patient_id: str, force_refresh: bool = False) -> ClinicalSummaryResponse:
        """
        Retrieves or generates a single-paragraph EMR medical history summary.
        """
        logger.info(f"[SUMMARIZE SERVICE] Request received to summarize patient_id: {patient_id}")
        
        patient = self.db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            logger.error(f"[SUMMARIZE SERVICE] Patient not found for patient_id: {patient_id}")
            raise ValueError(f"Patient with ID '{patient_id}' not found.")

        encounters = self.db.query(Encounter).filter(Encounter.patient_id == patient_id).all()
        current_hash = self._generate_timeline_hash(patient, encounters)
        
        # If cache exists and matches, and it is not a force refresh, return cached value
        if not force_refresh and patient_id in _SUMMARIZE_CACHE:
            cached_entry = _SUMMARIZE_CACHE[patient_id]
            if cached_entry.get("timeline_hash") == current_hash:
                logger.info(f"[SUMMARIZE SERVICE] Cache hit for patient_id: {patient_id}. Returning cached summary.")
                return cached_entry["summary"]
            else:
                logger.info(f"[SUMMARIZE SERVICE] Cache match failed (timeline modified) for patient_id: {patient_id}. Invalidating cache.")

        # Format Chronological Context using SummarizeFormatter
        logger.info(f"[SUMMARIZE SERVICE] Formatter starting for patient_id: {patient_id}")
        metadata_context = SummarizeFormatter.format_metadata(patient)
        chronology_context = SummarizeFormatter.format_chronology(encounters)
        
        user_prompt = USER_PROMPT_TEMPLATE.format(
            metadata=metadata_context,
            chronology=chronology_context
        )

        now_str = datetime.now(timezone.utc).strftime("%d %b %Y • %H:%M")

        try:
            logger.info(f"[SUMMARIZE SERVICE] Calling Gemini for patient_id: {patient_id}")
            raw_json_str = self.provider.generate_structured_json(
                prompt=user_prompt,
                system_instruction=SYSTEM_PROMPT
            )
            logger.info(f"[SUMMARIZE SERVICE] Gemini response received for patient_id: {patient_id}")

            parsed_data = json.loads(raw_json_str)
            summary_text = parsed_data.get("summary") or "Not Available"

            summary_response = ClinicalSummaryResponse(
                summary=summary_text,
                generated_at=now_str,
                timeline_hash=current_hash
            )
        except Exception as e:
            logger.warning(f"[SUMMARIZE SERVICE] Gemini failed or rate-limited ({str(e)}). Compiling local fallback paragraph.")
            
            # Generate local database paragraph fallback
            age = SummarizeFormatter.calculate_age(patient.date_of_birth) if patient.date_of_birth else "N/A"
            gender = patient.gender or "N/A"
            latest_date_str = "Not Available"
            if encounters:
                latest_date_str = max(encounters, key=lambda x: x.created_at or datetime.min).created_at.strftime("%d %b %Y")

            # Extract meds
            meds = []
            for enc in encounters:
                if enc.prescription and enc.prescription.medicines:
                    for m in enc.prescription.medicines:
                        if m.medicine_name not in meds:
                            meds.append(m.medicine_name)
            meds_str = ", ".join(meds) if meds else "None Recorded"

            # History diagnoses
            history_list = []
            for enc in encounters:
                if enc.prescription and enc.prescription.diagnosis:
                    if enc.prescription.diagnosis not in history_list:
                        history_list.append(enc.prescription.diagnosis)
            diag_str = ", ".join(history_list) if history_list else "None Recorded"

            allergies_str = ", ".join([a.allergen for a in patient.allergies]) if patient.allergies else "No Known Drug Allergies"
            chronic_str = ", ".join([c.condition_name for c in patient.conditions]) if patient.conditions else "None Recorded"

            fallback_text = (
                f"Patient {patient.first_name} {patient.last_name} ({age} Yrs, {gender}) "
                f"has {len(encounters)} recorded clinical encounters in the medical system, with the latest encounter "
                f"occurring on {latest_date_str}. Diagnosed conditions in records include: {diag_str}. "
                f"Prescribed medications include: {meds_str}. Documented chronic conditions: {chronic_str}. "
                f"Allergies: {allergies_str}. Note: The Gemini AI summary engine is currently offline or rate-limited; "
                f"timeline events remain the authoritative source of structured details."
            )

            summary_response = ClinicalSummaryResponse(
                summary=fallback_text,
                generated_at=now_str,
                timeline_hash=current_hash
            )

        # Store in cache
        _SUMMARIZE_CACHE[patient_id] = {
            "summary": summary_response,
            "timeline_hash": current_hash
        }
        logger.info(f"[SUMMARIZE SERVICE] EMR single-paragraph cached for patient_id: {patient_id}")
        
        return summary_response
