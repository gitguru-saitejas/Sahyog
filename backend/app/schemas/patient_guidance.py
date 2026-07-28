from pydantic import BaseModel
from typing import List, Optional

class PatientGuidanceAskRequest(BaseModel):
    patient_id: Optional[str] = None
    question: str
    hospital_id: Optional[str] = None
    session_id: Optional[str] = None
    guidance_topic: Optional[str] = None
    language: Optional[str] = "en"


class SourceAttribution(BaseModel):
    document_title: str
    similarity_score: float

class PatientGuidanceResponse(BaseModel):
    answer: str
    sources: List[SourceAttribution]
    session_id: str
