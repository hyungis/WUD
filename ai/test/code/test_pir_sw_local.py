"""PERSON_IN_RAIN / STAR_WAVE 로컬 이미지 기반 전체 파이프라인 테스트.

test/image/빗속의사람.jpg, test/image/별파도.jpg 를 사용하여
S3 없이 로컬에서 LLM 멀티모달 분석까지 검증한다.
"""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

_AI_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_AI_ROOT))

from app.services.llm_service import llm_service
from app.services.drawing_guide_service import drawing_guide_service
from app.services.deep_analyze_service import _normalize_llm_response, _DEFAULT_QUESTIONS_PIR, _DEFAULT_QUESTIONS_SW


def _who5():
    return {"scoreTotal": 16, "raw": {"q1": 4, "q2": 3, "q3": 3, "q4": 3, "q5": 3}}


def _spane():
    return {
        "scorePositive": 21, "scoreNegative": 12, "scoreBalance": 9,
        "raw": {"q1": 4, "q2": 3, "q3": 4, "q4": 5, "q5": 3, "q6": 2,
                "q7": 2, "q8": 3, "q9": 2, "q10": 2, "q11": 1, "q12": 2},
    }


def test_person_in_rain(image_path: str):
    print("=" * 60)
    print("[PERSON_IN_RAIN] 로컬 이미지 LLM 분석 테스트")
    print(f"  이미지: {image_path}")

    guide_text = drawing_guide_service.build_prompt_context("PERSON_IN_RAIN", max_chars=4500)
    print(f"  가이드 텍스트: {len(guide_text)} chars 로드됨")

    start = time.time()
    result = llm_service.analyze_person_in_rain(
        session_id=0,
        who5=_who5(),
        spane=_spane(),
        image_path=image_path,
        prompt_guide_text=guide_text,
    )
    elapsed = time.time() - start

    print(f"\n  소요 시간: {elapsed:.1f}s")
    print(f"  응답 키: {list(result.keys())}")
    print("\n--- LLM 분석 결과 ---")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result


def test_star_wave(image_path: str):
    print("\n" + "=" * 60)
    print("[STAR_WAVE] 로컬 이미지 LLM 분석 테스트")
    print(f"  이미지: {image_path}")

    guide_text = drawing_guide_service.build_prompt_context("STAR_WAVE", max_chars=4500)
    print(f"  가이드 텍스트: {len(guide_text)} chars 로드됨")

    start = time.time()
    result = llm_service.analyze_star_wave(
        session_id=0,
        who5=_who5(),
        spane=_spane(),
        image_path=image_path,
        prompt_guide_text=guide_text,
    )
    elapsed = time.time() - start

    print(f"\n  소요 시간: {elapsed:.1f}s")
    print(f"  응답 키: {list(result.keys())}")
    print("\n--- LLM 분석 결과 ---")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result


def main():
    test_dir = _AI_ROOT / "test" / "image"
    pir_img = test_dir / "빗속의사람.jpg"
    sw_img = test_dir / "별파도.jpg"

    if not pir_img.exists():
        print(f"[ERROR] 빗속의사람 이미지 없음: {pir_img}")
        return
    if not sw_img.exists():
        print(f"[ERROR] 별파도 이미지 없음: {sw_img}")
        return

    if not os.getenv("GMS_KEY"):
        from app.core.config import settings
        if not settings.gms_key:
            print("[SKIP] GMS_KEY가 없어 LLM 테스트를 건너뜁니다.")
            return

    print("PERSON_IN_RAIN / STAR_WAVE 로컬 이미지 LLM 테스트")
    print("=" * 60)

    pir_result = test_person_in_rain(str(pir_img))
    sw_result = test_star_wave(str(sw_img))

    print("\n" + "=" * 60)
    print("_normalize_llm_response → AiAnalysisData 변환 검증")
    for label, r, dq in [
        ("PERSON_IN_RAIN", pir_result, _DEFAULT_QUESTIONS_PIR),
        ("STAR_WAVE", sw_result, _DEFAULT_QUESTIONS_SW),
    ]:
        data = _normalize_llm_response(r, dq)
        print(f"\n  [{label}]")
        print(f"    resultSummary ({len(data.resultSummary)} chars):")
        print(f"    {data.resultSummary[:300]}...")
        print(f"    questions: {data.questions}")
        print(f"    raw keys: {list(data.raw.keys())}")
        ok = bool(data.resultSummary) and bool(data.questions) and bool(data.raw)
        print(f"    -> {'PASS' if ok else 'FAIL'}")

    print("\n" + "=" * 60)
    print("LLM raw 응답 검증")
    for label, r in [("PERSON_IN_RAIN", pir_result), ("STAR_WAVE", sw_result)]:
        has_intro = bool(r.get("intro"))
        has_insights = bool(r.get("coreInsights"))
        has_strengths = bool(r.get("strengths"))
        has_questions = bool(r.get("questions"))
        has_raw = bool(r.get("raw"))
        ok = all([has_intro, has_insights, has_strengths, has_questions, has_raw])
        status = "PASS" if ok else "WARN"
        print(f"  [{status}] {label}: intro={has_intro} insights={has_insights} "
              f"strengths={has_strengths} questions={has_questions} raw={has_raw}")

    print("\n완료!")


if __name__ == "__main__":
    main()
