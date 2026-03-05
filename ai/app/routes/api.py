from fastapi import APIRouter, HTTPException
from app.models.schemas import AnalyzeRequest, AnalyzeResponse
from app.services.s3_service import s3_service
from app.services.yolo_service import YoloService
from app.services.llm_service import llm_service
import os

router = APIRouter()

@router.post("/daily/analyze", response_model=AnalyzeResponse)
async def analyze_daily_image(request: AnalyzeRequest):
    """
    S3의 이미지 객체 키를 받아 YOLO로 객체를 탐지하고, LLM을 통해 분석합니다.
    """
    image_path = None
    try:
        # 1. S3에서 이미지 다운로드
        image_path = s3_service.download_image(request.s3_object_key)
        
        # 2. YOLO Classification
        classifications = YoloService.classify_image(image_path)
        
        # 3. LLM 분석
        analysis_text = llm_service.analyze_results(classifications)
        
        return AnalyzeResponse(
            status="success",
            classifications=classifications,
            llm_analysis=analysis_text
        )

    except Exception as e:
        print(f"Analysis failed: {str(e)}")
        # 발생한 오류를 프론트에 전달 (보안상 민감한 정보를 제외할 필요가 있음)
        return AnalyzeResponse(
            status="error",
            classifications=[],
            llm_analysis="",
            error=str(e)
        )
    finally:
        # 혹시 지워지지 않은 임시 이미지가 있다면 정리 (YoloService에서도 처리하지만 대비용)
        if image_path and os.path.exists(image_path):
            try:
                os.remove(image_path)
            except OSError:
                pass
