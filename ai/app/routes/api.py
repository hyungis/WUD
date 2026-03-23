from fastapi import APIRouter
from app.models.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    AiAnalyzeReq,
    AiAnalyzeResp,
    DailyAiAnalyzeReq,
    DailyAiAnalyzeResp,
)
from app.services.s3_service import s3_service
from app.services.yolo_service import YoloService
from app.services.llm_service import llm_service
from app.services.deep_analyze_service import analyze_deep_session_request
from app.services.daily_analyze_service import analyze_daily_request
import os

router = APIRouter()


# NOTE:
# 현재 데일리 분석의 실제 운영 경로는 Spring -> RabbitMQ -> daily_rabbitmq_rpc_service 이므로
# 아래 legacy HTTP 엔드포인트(`/daily/analyze`)는 사용하지 않습니다.
# 필요 시 재활성화할 수 있도록 코드는 주석으로 보존합니다.
#
# @router.post("/daily/analyze", response_model=AnalyzeResponse)
# async def analyze_daily_image(request: AnalyzeRequest):
#     """
#     S3의 이미지 객체 키를 받아 YOLO로 객체를 탐지하고, LLM을 통해 분석합니다.
#     """
#     image_path = None
#     try:
#         image_path = s3_service.download_image(request.s3_object_key)
#         classifications = YoloService.classify_image(image_path)
#         analysis_text = llm_service.analyze_daily_results(classifications)
#
#         return AnalyzeResponse(
#             status="success",
#             classifications=classifications,
#             llm_analysis=analysis_text,
#         )
#
#     except Exception as e:
#         print(f"Analysis failed: {str(e)}")
#         return AnalyzeResponse(
#             status="error",
#             classifications=[],
#             llm_analysis="",
#             error=str(e),
#         )
#     finally:
#         if image_path and os.path.exists(image_path):
#             try:
#                 os.remove(image_path)
#             except OSError:
#                 pass


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


@router.post("/daily/feedback", response_model=DailyAiAnalyzeResp)
async def analyze_daily_feedback(request: DailyAiAnalyzeReq):
    """
    HTTP 기반 daily 피드백 테스트 엔드포인트.
    RabbitMQ consumer와 동일한 mock 분석 로직을 사용한다.
    """
    try:
        return analyze_daily_request(request)
    except Exception as e:
        print(f"Daily Feedback failed: {str(e)}")
        return DailyAiAnalyzeResp(
            dailyId=request.dailyId,
            status="ERROR",
            message=str(e),
            data=None,
        )
