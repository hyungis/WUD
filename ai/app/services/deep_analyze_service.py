from concurrent.futures import ThreadPoolExecutor
from app.models.schemas import AiAnalyzeReq, AiAnalyzeResp, AiAnalysisData
from app.services.s3_service import s3_service
from app.services.yolo_service import YoloService
from app.services.llm_service import llm_service
from app.services.htp_guide_service import htp_guide_service
from app.services.drawing_guide_service import drawing_guide_service
from app.services.cv_feature_service import (
    extract_features as cv_extract_features,
    extract_cross_image_features as cv_extract_cross,
)
import os
from pathlib import Path

_IMAGE_KEYS = ("house", "tree", "person")

_BASE_DIR = Path(__file__).resolve().parents[2]
_YOLO_MODELS_DIR = (_BASE_DIR / "yolo_models").resolve()
_MODEL_PATHS = {
    "house": str(_YOLO_MODELS_DIR / "house_640.pt"),
    "tree": str(_YOLO_MODELS_DIR / "tree_640.pt"),
    "person": str(_YOLO_MODELS_DIR / "person_640.pt"),
}

_DEFAULT_QUESTIONS_HTP = [
    "그림을 그릴 때 가장 신경 쓴 부분은 무엇이었나요?",
    "그림 속 장면(집/나무/사람)이 어떤 분위기처럼 느껴지나요?",
    "최근 일상에서 마음이 편해지는 순간은 언제였나요?",
]

_DEFAULT_QUESTIONS_PIR = [
    "그림 속 사람은 비를 어떻게 느끼고 있을까요?",
    "이 사람에게 가장 필요한 것은 무엇일까요?",
    "최근 스트레스를 받을 때 나만의 대처 방법이 있나요?",
]

_DEFAULT_QUESTIONS_SW = [
    "그림 속 별과 파도를 바라볼 때 어떤 감정이 느껴지나요?",
    "별과 파도 중 더 마음이 가는 쪽은 어느 쪽인가요?",
    "지금 내면에서 가장 크게 움직이는 감정은 무엇인가요?",
]


def analyze_deep_session_request(request: AiAnalyzeReq) -> AiAnalyzeResp:
    """Deep analysis entrypoint — dispatches by deepType."""
    print(f"[FastAPI] Received Deep Analysis Request for Session: {request.sessionId}")
    print(f"[FastAPI] DeepType: {request.deepType}")

    deep_type = (request.deepType or "").upper()

    if deep_type == "HTP":
        return _analyze_htp(request)
    elif deep_type == "PERSON_IN_RAIN":
        return _analyze_single_image(request, deep_type="PERSON_IN_RAIN")
    elif deep_type == "STAR_WAVE":
        return _analyze_single_image(request, deep_type="STAR_WAVE")
    else:
        return AiAnalyzeResp(
            sessionId=request.sessionId,
            status="ERROR",
            message=f"Unsupported deepType: {request.deepType}",
            data=None,
        )


# ------------------------------------------------------------------
# Shared helpers
# ------------------------------------------------------------------

def _build_who5_spane_payloads(request: AiAnalyzeReq):
    who5_payload = {
        "scoreTotal": request.who5.scoreTotal,
        "raw": request.who5.raw,
    }
    spane_payload = None
    if request.spane:
        spane_payload = {
            "scorePositive": request.spane.scorePositive,
            "scoreNegative": request.spane.scoreNegative,
            "scoreBalance": request.spane.scoreBalance,
            "raw": request.spane.raw,
        }
    return who5_payload, spane_payload


def _normalize_llm_response(
    llm_json: dict,
    default_questions: list[str],
    extra_raw: dict | None = None,
) -> AiAnalysisData:
    """LLM JSON 출력을 AiAnalysisData 구조로 정규화."""
    result_summary = ""
    questions: list[str] = []
    raw: dict = {}

    if isinstance(llm_json, dict):
        intro = str(llm_json.get("intro", "") or "").strip()
        core_insights = llm_json.get("coreInsights", [])

        summary_parts = []
        if intro:
            summary_parts.append(intro)
        if core_insights and isinstance(core_insights, list):
            summary_parts.append("\n\nCore Insights")
            for insight in core_insights:
                summary_parts.append(str(insight))
        result_summary = "\n".join(summary_parts).strip()

        questions = [str(q) for q in (llm_json.get("questions") or []) if q]

        raw_obj = llm_json.get("raw")
        raw = raw_obj.copy() if isinstance(raw_obj, dict) else {}
        if not isinstance(raw_obj, dict):
            raw = {"llm": llm_json}

        strengths = llm_json.get("strengths")
        if isinstance(strengths, list) and strengths:
            raw["strengths"] = [str(s) for s in strengths if s]
        if intro:
            raw["intro"] = intro
        if core_insights:
            raw["coreInsights"] = core_insights

    if extra_raw:
        raw.update(extra_raw)

    if not result_summary:
        result_summary = _fallback_summary(llm_json, raw)

    if not questions:
        questions = default_questions

    return AiAnalysisData(
        resultSummary=result_summary,
        questions=questions[:5],
        raw=raw,
    )


def _fallback_summary(llm_json: dict, raw: dict) -> str:
    """LLM이 예상과 다른 JSON 스키마를 반환했을 때 요약문 추출."""
    parts: list[str] = []
    obs = llm_json.get("observations") or (raw.get("observations") if isinstance(raw, dict) else None)
    who5_llm = llm_json.get("WHO-5") if isinstance(llm_json, dict) else None

    if isinstance(obs, dict):
        for k in ("house", "tree", "person", "rain", "umbrella", "star", "wave"):
            v = obs.get(k)
            if isinstance(v, dict):
                interp = v.get("interpretation")
                if interp:
                    parts.append(str(interp))
                for vv in v.values():
                    if isinstance(vv, str) and vv.strip():
                        parts.append(vv.strip())
                    if isinstance(vv, list):
                        for item in vv:
                            if isinstance(item, str) and item.strip():
                                parts.append(item.strip())
                    if isinstance(vv, dict):
                        for item in vv.values():
                            if isinstance(item, str) and item.strip():
                                parts.append(item.strip())

    if isinstance(who5_llm, dict) and who5_llm.get("interpretation"):
        parts.append(str(who5_llm.get("interpretation")))

    wb = raw.get("wellbeing") if isinstance(raw, dict) else None
    if isinstance(wb, dict) and wb.get("note"):
        parts.append(str(wb.get("note")))

    return " ".join(parts)[:600].strip()


# ------------------------------------------------------------------
# HTP analysis (YOLO + CV + LLM)
# ------------------------------------------------------------------

def _analyze_htp(request: AiAnalyzeReq) -> AiAnalyzeResp:
    image_paths: dict[str, str] = {}
    downloaded: list[str] = []
    try:
        s3_keys = {
            "house": request.images["houseImageKey"],
            "tree": request.images["treeImageKey"],
            "person": request.images["personImageKey"],
        }

        with ThreadPoolExecutor(max_workers=3) as pool:
            download_futures = {
                key: pool.submit(s3_service.download_image, s3_keys[key])
                for key in _IMAGE_KEYS
            }
            image_paths = {key: f.result() for key, f in download_futures.items()}

        downloaded = [p for p in image_paths.values() if p]

        yolo_raw: dict[str, object] = {}
        yolo_summary: dict[str, object] = {}
        cv_features: dict[str, object] = {}
        for key in _IMAGE_KEYS:
            det = YoloService.classify_image(image_paths[key], _MODEL_PATHS[key])
            yolo_raw[key] = det
            yolo_summary[key] = YoloService.summarize_detections(det)
            try:
                cv_features[key] = cv_extract_features(
                    image_paths[key], list(det), image_type=key
                )
            except Exception as cv_err:
                print(f"[Deep Analyze] CV feature extract failed for {key}: {cv_err}")
                cv_features[key] = {}

        try:
            cross_image_features = cv_extract_cross(cv_features)
        except Exception as cross_err:
            print(f"[Deep Analyze] Cross-image feature extract failed: {cross_err}")
            cross_image_features = {}

        who5_payload, spane_payload = _build_who5_spane_payloads(request)

        yolo_payload = {
            "summary": yolo_summary,
            "raw": yolo_raw,
            "classTaxonomy": {
                "house": ["집전체", "지붕", "문", "창문굴뚝", "연기", "길", "울타리", "잔디", "꽃", "태양", "산", "연못"],
                "person": ["사람전체", "얼굴", "머리", "머리카락", "눈", "코", "입", "귀", "목", "상체", "팔", "손", "다리", "발", "옷세부", "신발"],
                "tree": ["나무전체", "가지", "나뭇잎", "뿌리", "수관", "열매", "꽃", "구름", "달", "별", "새", "동물"],
            },
        }

        guide_text = htp_guide_service.build_prompt_context(
            requested_sections=("house", "tree", "person"),
            max_chars=4500,
        )

        llm_json = llm_service.analyze_htp(
            session_id=int(request.sessionId),
            who5=who5_payload,
            spane=spane_payload,
            yolo=yolo_payload,
            image_paths=image_paths,
            prompt_guide_text=guide_text,
            cv_features=cv_features if cv_features else None,
            cross_image_features=cross_image_features if cross_image_features else None,
        )

        extra_raw: dict = {}
        if cv_features:
            extra_raw["cvFeatures"] = cv_features
        if cross_image_features:
            extra_raw["crossImageFeatures"] = cross_image_features
        data = _normalize_llm_response(llm_json, _DEFAULT_QUESTIONS_HTP, extra_raw or None)

        print(f"[Deep Analyze HTP] SUCCESS session={request.sessionId} "
              f"summary_len={len(data.resultSummary)} questions={len(data.questions)}")
        return AiAnalyzeResp(
            sessionId=request.sessionId,
            status="SUCCESS",
            message="분석이 정상적으로 완료되었습니다.",
            data=data,
        )
    except Exception as e:
        print(f"[Deep Analyze HTP] FAILED session={request.sessionId}: {e}")
        return AiAnalyzeResp(
            sessionId=request.sessionId,
            status="ERROR",
            message=str(e),
            data=None,
        )
    finally:
        for p in downloaded:
            if p and os.path.exists(p):
                try:
                    os.remove(p)
                except OSError:
                    pass


# ------------------------------------------------------------------
# PERSON_IN_RAIN / STAR_WAVE analysis (LLM only, single image)
# ------------------------------------------------------------------

_IMAGE_KEY_MAP = {
    "PERSON_IN_RAIN": "rainPersonImageKey",
    "STAR_WAVE": "starWaveImageKey",
}

_LLM_ANALYZE_FN = {
    "PERSON_IN_RAIN": llm_service.analyze_person_in_rain,
    "STAR_WAVE": llm_service.analyze_star_wave,
}

_DEFAULT_QUESTIONS_MAP = {
    "PERSON_IN_RAIN": _DEFAULT_QUESTIONS_PIR,
    "STAR_WAVE": _DEFAULT_QUESTIONS_SW,
}


def _analyze_single_image(request: AiAnalyzeReq, *, deep_type: str) -> AiAnalyzeResp:
    """PERSON_IN_RAIN / STAR_WAVE 공통 분석 로직 (이미지 1장, LLM only)."""
    image_key_name = _IMAGE_KEY_MAP[deep_type]
    s3_key = request.images.get(image_key_name)
    if not s3_key:
        return AiAnalyzeResp(
            sessionId=request.sessionId,
            status="ERROR",
            message=f"Missing image key: {image_key_name}",
            data=None,
        )

    downloaded_path: str | None = None
    try:
        downloaded_path = s3_service.download_image(s3_key)

        who5_payload, spane_payload = _build_who5_spane_payloads(request)

        guide_text = drawing_guide_service.build_prompt_context(deep_type, max_chars=4500)

        analyze_fn = _LLM_ANALYZE_FN[deep_type]
        llm_json = analyze_fn(
            session_id=int(request.sessionId),
            who5=who5_payload,
            spane=spane_payload,
            image_path=downloaded_path,
            prompt_guide_text=guide_text,
        )

        default_questions = _DEFAULT_QUESTIONS_MAP[deep_type]
        data = _normalize_llm_response(llm_json, default_questions)

        print(f"[Deep Analyze {deep_type}] SUCCESS session={request.sessionId} "
              f"summary_len={len(data.resultSummary)} questions={len(data.questions)}")
        return AiAnalyzeResp(
            sessionId=request.sessionId,
            status="SUCCESS",
            message="분석이 정상적으로 완료되었습니다.",
            data=data,
        )
    except Exception as e:
        print(f"[Deep Analyze {deep_type}] FAILED session={request.sessionId}: {e}")
        return AiAnalyzeResp(
            sessionId=request.sessionId,
            status="ERROR",
            message=str(e),
            data=None,
        )
    finally:
        if downloaded_path and os.path.exists(downloaded_path):
            try:
                os.remove(downloaded_path)
            except OSError:
                pass
