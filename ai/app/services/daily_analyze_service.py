import os
from typing import Any

from app.models.schemas import DailyAiAnalyzeReq, DailyAiAnalyzeResp, DailyAiAnalysisData
from app.services.s3_service import s3_service
from app.services.llm_service import llm_service


DAILY_TYPE_LABELS = {
    "MANDALA": "만다라",
    "COLORING": "컬러링",
    "FREE": "자유그림",
}

DAILY_TYPE_STYLE_HINTS = {
    "MANDALA": "반복된 패턴을 차분하게 채워간 흐름이",
    "COLORING": "색을 고르는 선택과 채움의 리듬이",
    "FREE": "자유로운 선과 면의 움직임이",
}


def analyze_daily_request(request: DailyAiAnalyzeReq) -> DailyAiAnalyzeResp:
    print(f"[FastAPI] Received Daily Analysis Request for Daily: {request.dailyId}")
    print(f"[FastAPI] DailyType: {request.dailyType}")

    try:
        result_summary, raw_extra = _generate_feedback(request)
        raw = _build_raw_payload(request, result_summary, raw_extra=raw_extra)

        print(f"[Daily Analyze] SUCCESS dailyId={request.dailyId} summary_len={len(result_summary)}")
        return DailyAiAnalyzeResp(
            dailyId=request.dailyId,
            status="SUCCESS",
            message="Daily feedback generated successfully.",
            data=DailyAiAnalysisData(
                resultSummary=result_summary,
                raw=raw,
            ),
        )
    except Exception as exc:
        print(f"[Daily Analyze] FAILED dailyId={request.dailyId}: {exc}")
        return DailyAiAnalyzeResp(
            dailyId=request.dailyId,
            status="ERROR",
            message=str(exc),
            data=None,
        )


def _generate_feedback(request: DailyAiAnalyzeReq) -> tuple[str, dict[str, Any]]:
    if _use_mock_response():
        return _generate_mock_feedback(request), {"imageSource": {"type": "none"}}

    local_path: str | None = None
    try:
        local_path = s3_service.download_image(request.s3ObjectKey)
        feedback = llm_service.analyze_daily_inner_feedback(
            daily_id=request.dailyId,
            daily_type=request.dailyType,
            emotion=request.emotion,
            emotion_color=request.emotionColor,
            content=request.content,
            image_path=local_path,
        )
        return feedback, {"imageSource": {"type": "base64"}}
    finally:
        if local_path and os.path.exists(local_path):
            try:
                os.remove(local_path)
            except OSError:
                pass


def _generate_mock_feedback(request: DailyAiAnalyzeReq) -> str:
    daily_type = (request.dailyType or "").upper()
    type_label = DAILY_TYPE_LABELS.get(daily_type, "그림")
    style_hint = DAILY_TYPE_STYLE_HINTS.get(daily_type, "색과 선의 흐름이")
    emotion = (request.emotion or "오늘의 감정").strip()
    color = (request.emotionColor or "선택한 색").strip()
    content_hint = _build_content_hint(request.content)

    return (
        f"{type_label}에서 {style_hint} {color}의 {emotion}을 자연스럽게 보여주고, "
        f"{content_hint}"
    )


def _build_content_hint(content: str | None) -> str:
    if content and content.strip():
        return "짧게 남긴 일기와도 감정 결이 잘 이어져 보여요."
    return "말로 남기지 않은 마음도 그림만으로 충분히 전해져요."


def _build_raw_payload(
    request: DailyAiAnalyzeReq,
    result_summary: str,
    *,
    raw_extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    # 프론트에서 실제로 사용하는 값은 resultSummary 중심이므로
    # raw는 전송 크기/저장 비용을 줄이기 위해 최소 메타만 유지합니다.
    payload: dict[str, Any] = {
        "mode": "mock" if _use_mock_response() else "llm",
        "version": "daily-feedback-v2",
    }
    if raw_extra:
        payload.update(raw_extra)
    return payload


def _use_mock_response() -> bool:
    # 기본은 LLM 경로를 사용하고, 개발/테스트에서만 명시적으로 mock을 켭니다.
    return os.getenv("DAILY_AI_USE_MOCK", "false").strip().lower() in {"1", "true", "yes", "on"}