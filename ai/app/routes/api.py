from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    AnalyzeRequest, AnalyzeResponse,
    AiAnalyzeReq, AiAnalyzeResp, AiAnalysisData
)
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

@router.post("/deep/analyze", response_model=AiAnalyzeResp)
async def analyze_deep_session(request: AiAnalyzeReq):
    """
    Spring Boot에서 넘겨주는 JSON 데이터를 받아 심층(HTP, WHO5) 분석을 수행합니다.
    (현재는 Spring Boot와의 연동 테스트를 위한 Mock Endpoint 임)
    """
    try:
        print(f"[FastAPI] Received Deep Analysis Request for Session: {request.sessionId}")
        print(f"[FastAPI] DeepType: {request.deepType}")
        
        # 1. 실제로는 여기서 S3 객체 다운로드 (3장) 및 YOLO 처리가 진행됩니다.
        # request.images.houseImageKey 등을 사용하여 로드
        
        # 2. Mock 반환 데이타 생성
        mock_data = AiAnalysisData(
            resultSummary="그림과 설문을 종합해본 결과, 현재 안정적이고 긍정적인 심리 상태를 보이고 있습니다.",
            questions=["최근에 가장 즐거웠던 기억은 무엇인가요?", "그림 속 집에서 가장 마음에 드는 공간은 어디인가요?"],
            raw={"yolo_detections": "house: 1, tree: 2, person: 1"}
        )
        
        return AiAnalyzeResp(
            status="SUCCESS",
            message="분석이 정상적으로 완료되었습니다.",
            data=mock_data
        )

    except Exception as e:
        print(f"Deep Analysis failed: {str(e)}")
        return AiAnalyzeResp(
            status="ERROR",
            message=str(e),
            data=None
        )
