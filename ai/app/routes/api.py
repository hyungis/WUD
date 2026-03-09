from fastapi import APIRouter
from app.models.schemas import AnalyzeRequest, AnalyzeResponse, AiAnalyzeReq, AiAnalyzeResp
from app.services.s3_service import s3_service
from app.services.yolo_service import YoloService
from app.services.llm_service import llm_service
from app.services.deep_analyze_service import analyze_deep_session_request
import os

router = APIRouter()


@router.post("/daily/analyze", response_model=AnalyzeResponse)
async def analyze_daily_image(request: AnalyzeRequest):
    """
    S3의 이미지 객체 키를 받아 YOLO로 객체를 탐지하고, LLM을 통해 분석합니다.
    """
    image_path = None
    try:
        image_path = s3_service.download_image(request.s3_object_key)
        classifications = YoloService.classify_image(image_path)
        analysis_text = llm_service.analyze_results(classifications)

        return AnalyzeResponse(
            status="success",
            classifications=classifications,
            llm_analysis=analysis_text,
        )

    except Exception as e:
        print(f"Analysis failed: {str(e)}")
        return AnalyzeResponse(
            status="error",
            classifications=[],
            llm_analysis="",
            error=str(e),
        )
    finally:
        if image_path and os.path.exists(image_path):
            try:
                os.remove(image_path)
            except OSError:
                pass


@router.post("/deep/analyze", response_model=AiAnalyzeResp)
async def analyze_deep_session(request: AiAnalyzeReq):
    """
    HTTP 기반 심층 분석 엔드포인트.
    RabbitMQ RPC consumer도 동일 로직을 재사용합니다.
    """
    try:
        return analyze_deep_session_request(request)
    except Exception as e:
        print(f"Deep Analysis failed: {str(e)}")
        return AiAnalyzeResp(
            sessionId=request.sessionId,
            status="ERROR",
            message=str(e),
            data=None,
        )
