from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class AnalyzeRequest(BaseModel):
    s3_object_key: str

class AnalyzeResponse(BaseModel):
    status: str
    classifications: List[Dict[str, Any]]
    llm_analysis: str
    error: Optional[str] = None
