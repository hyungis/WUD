import os
from typing import Any

from app.models.schemas import DailyAiAnalyzeReq, DailyAiAnalyzeResp, DailyAiAnalysisData


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
        result_summary = _generate_feedback(request)
        raw = _build_raw_payload(request, result_summary)

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
        print(f"[Daily Analyze] failed: {exc}")
        return DailyAiAnalyzeResp(
            dailyId=request.dailyId,
            status="ERROR",
            message=str(exc),
            data=None,
        )


def _generate_feedback(request: DailyAiAnalyzeReq) -> str:
    if _use_mock_response():
        return _generate_mock_feedback(request)

    raise NotImplementedError("Daily LLM feedback is not implemented yet. Enable DAILY_AI_USE_MOCK=true.")


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


def _build_raw_payload(request: DailyAiAnalyzeReq, result_summary: str) -> dict[str, Any]:
    daily_type = (request.dailyType or "").upper()
    return {
        "mode": "mock" if _use_mock_response() else "llm",
        "version": "daily-feedback-v1",
        "dailyType": daily_type,
        "dailyTypeLabel": DAILY_TYPE_LABELS.get(daily_type, "그림"),
        "emotion": request.emotion,
        "emotionColor": request.emotionColor,
        "contentPresent": bool(request.content and request.content.strip()),
        "s3ObjectKey": request.s3ObjectKey,
        "promptPreview": {
            "emotion": request.emotion,
            "emotionColor": request.emotionColor,
            "content": request.content,
        },
        "resultSummary": result_summary,
    }


def _use_mock_response() -> bool:
    return os.getenv("DAILY_AI_USE_MOCK", "true").strip().lower() in {"1", "true", "yes", "on"}