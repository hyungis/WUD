"""HTP 로컬 이미지 기반 전체 파이프라인 테스트.

test/image/집.jpg, test/image/나무.jpg, test/image/사람.jpg 를 사용하여
S3 없이 로컬에서 CV feature 추출 + (선택) LLM 멀티모달 분석까지 검증한다.
"""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

_AI_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_AI_ROOT))

from app.services.yolo_service import YoloService
from app.services.cv_feature_service import (
    extract_features as cv_extract_features,
    extract_cross_image_features as cv_extract_cross,
)
from app.services.htp_guide_service import htp_guide_service
from app.services.llm_service import llm_service
from app.services.deep_analyze_service import _normalize_llm_response, _DEFAULT_QUESTIONS_HTP

_YOLO_DIR = _AI_ROOT / "yolo_models"
_MODEL_PATHS = {
    "house": str(_YOLO_DIR / "house_640.pt"),
    "tree": str(_YOLO_DIR / "tree_640.pt"),
    "person": str(_YOLO_DIR / "person_640.pt"),
}
_IMAGE_KEYS = ("house", "tree", "person")


def _who5():
    return {"scoreTotal": 16, "raw": {"q1": 4, "q2": 3, "q3": 3, "q4": 3, "q5": 3}}


def _spane():
    return {
        "scorePositive": 21, "scoreNegative": 12, "scoreBalance": 9,
        "raw": {"q1": 4, "q2": 3, "q3": 4, "q4": 5, "q5": 3, "q6": 2,
                "q7": 2, "q8": 3, "q9": 2, "q10": 2, "q11": 1, "q12": 2},
    }


def _pp(obj, label=""):
    """Pretty-print helper."""
    if label:
        print(f"\n{'─'*50}")
        print(f"  {label}")
        print(f"{'─'*50}")
    print(json.dumps(obj, ensure_ascii=False, indent=2, default=str))


def test_cv_features(image_paths: dict[str, str]):
    """YOLO + CV feature 추출 (LLM 불필요)."""
    print("\n" + "=" * 60)
    print("[PHASE 1] YOLO 객체 탐지 + CV Feature 추출")
    print("=" * 60)

    yolo_raw = {}
    yolo_summary = {}
    cv_features = {}

    for key in _IMAGE_KEYS:
        print(f"\n>>> {key.upper()} 처리 중...")
        t0 = time.time()

        det = YoloService.classify_image(image_paths[key], _MODEL_PATHS[key])
        yolo_raw[key] = det
        yolo_summary[key] = YoloService.summarize_detections(det)

        cv_features[key] = cv_extract_features(image_paths[key], list(det), image_type=key)

        elapsed = time.time() - t0
        print(f"    YOLO 탐지: {len(det)}개 객체 ({elapsed:.2f}s)")

        sf = cv_features[key].get("strokeFeatures", {})
        print(f"    필압: level={sf.get('strokeWidthLevel')}, "
              f"consistency={sf.get('pressureConsistency')}, "
              f"overdraw={sf.get('overdrawRatio')}")

        cf = cv_features[key].get("colorFeatures", {})
        print(f"    색상: mono={cf.get('isMonochrome')}, "
              f"warmCool={cf.get('warmCoolBalance')}, "
              f"colors={[c['name'] for c in cf.get('dominantColors', [])]}")

        gf = cv_features[key].get("globalFeatures", {})
        print(f"    전역: size={gf.get('drawingSizeLevel')}, "
              f"hBias={gf.get('horizontalBias')}, "
              f"vBias={gf.get('verticalBias')}, "
              f"ink={gf.get('inkPixelRatio')}")

    print("\n>>> Cross-image feature 추출 중...")
    cross_features = cv_extract_cross(cv_features)
    _pp(cross_features, "CROSS_IMAGE_FEATURES")

    sc = cross_features.get("styleConsistency", {})
    ep = cross_features.get("energyProgression", {})
    print(f"\n  스타일 일관성: {sc.get('overall')}")
    print(f"  에너지 추이: {ep.get('inkTrend')}")

    return yolo_raw, yolo_summary, cv_features, cross_features


def test_llm_analysis(
    image_paths: dict[str, str],
    yolo_raw: dict,
    yolo_summary: dict,
    cv_features: dict,
    cross_features: dict,
):
    """LLM 멀티모달 HTP 분석 (GMS_KEY 필요)."""
    print("\n" + "=" * 60)
    print("[PHASE 2] LLM 멀티모달 HTP 분석")
    print("=" * 60)

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
    print(f"  가이드 텍스트: {len(guide_text)} chars")

    t0 = time.time()
    llm_json = llm_service.analyze_htp(
        session_id=0,
        who5=_who5(),
        spane=_spane(),
        yolo=yolo_payload,
        image_paths=image_paths,
        prompt_guide_text=guide_text,
        cv_features=cv_features,
        cross_image_features=cross_features,
    )
    elapsed = time.time() - t0

    print(f"\n  LLM 소요 시간: {elapsed:.1f}s")
    print(f"  응답 키: {list(llm_json.keys())}")

    _pp(llm_json, "LLM 분석 결과")

    print("\n" + "=" * 60)
    print("_normalize_llm_response 검증")
    print("=" * 60)
    extra_raw = {}
    if cv_features:
        extra_raw["cvFeatures"] = cv_features
    if cross_features:
        extra_raw["crossImageFeatures"] = cross_features

    data = _normalize_llm_response(llm_json, _DEFAULT_QUESTIONS_HTP, extra_raw or None)
    print(f"  resultSummary ({len(data.resultSummary)} chars):")
    print(f"    {data.resultSummary[:400]}...")
    print(f"  questions: {data.questions}")
    print(f"  raw keys: {list(data.raw.keys())}")

    has_intro = bool(llm_json.get("intro"))
    has_insights = bool(llm_json.get("coreInsights"))
    has_strengths = bool(llm_json.get("strengths"))
    has_questions = bool(llm_json.get("questions"))
    has_raw = bool(llm_json.get("raw"))
    ok = all([has_intro, has_insights, has_strengths, has_questions, has_raw])
    status = "PASS" if ok else "WARN"
    print(f"\n  [{status}] intro={has_intro} insights={has_insights} "
          f"strengths={has_strengths} questions={has_questions} raw={has_raw}")

    return llm_json


def main():
    test_dir = _AI_ROOT / "test" / "image"
    image_paths = {
        "house": str(test_dir / "집.jpg"),
        "tree": str(test_dir / "나무.jpg"),
        "person": str(test_dir / "사람.jpg"),
    }

    for key, path in image_paths.items():
        if not Path(path).exists():
            print(f"[ERROR] {key} 이미지 없음: {path}")
            return

    print("HTP 로컬 이미지 전체 파이프라인 테스트")
    print(f"  이미지: {list(image_paths.values())}")

    yolo_raw, yolo_summary, cv_features, cross_features = test_cv_features(image_paths)

    from app.core.config import settings
    has_key = bool(os.getenv("GMS_KEY") or settings.gms_key)

    if has_key:
        test_llm_analysis(image_paths, yolo_raw, yolo_summary, cv_features, cross_features)
    else:
        print("\n" + "=" * 60)
        print("[SKIP] GMS_KEY가 없어 LLM 분석을 건너뜁니다.")
        print("  GMS_KEY를 설정하고 다시 실행하세요:")
        print("    $env:GMS_KEY='your-key-here'")
        print("=" * 60)

    print("\n완료!")


if __name__ == "__main__":
    main()
