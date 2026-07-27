from pydantic import BaseModel

class ClinicalSummaryResponse(BaseModel):
    """
    Concise single-paragraph clinical history summary.
    """
    summary: str
    generated_at: str
    timeline_hash: str

class SummarizeStatusResponse(BaseModel):
    """
    Status of the summarizer cache for the patient.
    """
    has_cache: bool
    is_outdated: bool
    summary: str | None = None
    generated_at: str | None = None
