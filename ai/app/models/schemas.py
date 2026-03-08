from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class AnalyzeRequest(BaseModel):
    s3_object_key: str

class AnalyzeResponse(BaseModel):
    status: str
    classifications: List[Dict[str, Any]]
    llm_analysis: str
    error: Optional[str] = None

# --- Deep Analysis Schemas (Mock for Spring Boot Integration) ---

class Who5Data(BaseModel):
    scoreTotal: int
    raw: Dict[str, int]

class HtpImages(BaseModel):
    houseImageKey: str
    treeImageKey: str
    personImageKey: str

class AiAnalyzeReq(BaseModel):
    sessionId: int
    deepType: str
    who5: Who5Data
    images: HtpImages

class AiAnalysisData(BaseModel):
    resultSummary: str
    questions: List[str]
    raw: Dict[str, Any]

class AiAnalyzeResp(BaseModel):
    status: str
    message: str
    data: Optional[AiAnalysisData] = None

