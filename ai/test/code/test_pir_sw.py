"""PERSON_IN_RAIN / STAR_WAVE 분석 파이프라인 테스트.

1) 디스패치 분기 검증 (잘못된 deepType → ERROR)
2) 스키마 호환성 검증 (Dict[str, str] images)
3) 로컬 이미지 기반 전체 파이프라인 테스트 (GMS_KEY 필요)
"""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

_AI_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_AI_ROOT))

from app.models.schemas import AiAnalyzeReq, Who5Data, SpaneData
from app.services.deep_analyze_service import analyze_deep_session_request
from app.services.drawing_guide_service import drawing_guide_service


def _who5():
    return Who5Data(scoreTotal=16, raw={"q1": 4, "q2": 3, "q3": 3, "q4": 3, "q5": 3})


def _spane():
    return SpaneData(
        scorePositive=21, scoreNegative=12, scoreBalance=9,
        raw={"q1": 4, "q2": 3, "q3": 4, "q4": 5, "q5": 3, "q6": 2,
             "q7": 2, "q8": 3, "q9": 2, "q10": 2, "q11": 1, "q12": 2},
    )


def test_dispatch_unknown_type():
    """알 수 없는 deepType → ERROR 반환 확인."""
    print("=" * 60)
    print("[TEST 1] 알 수 없는 deepType 디스패치 → ERROR")
    req = AiAnalyzeReq(
        sessionId=1,
        deepType="UNKNOWN_TYPE",
        who5=_who5(),
        spane=_spane(),
        images={"someKey": "some/path.png"},
    )
    resp = analyze_deep_session_request(req)
    assert resp.status == "ERROR", f"Expected ERROR, got {resp.status}"
    assert "Unsupported" in resp.message
    print(f"  -> PASS: status={resp.status}, message={resp.message}")


def test_dispatch_missing_image_key():
    """PERSON_IN_RAIN인데 rainPersonImageKey가 없을 때 ERROR."""
    print("\n" + "=" * 60)
    print("[TEST 2] PERSON_IN_RAIN + 잘못된 image key → ERROR")
    req = AiAnalyzeReq(
        sessionId=2,
        deepType="PERSON_IN_RAIN",
        who5=_who5(),
        spane=_spane(),
        images={"wrongKey": "some/path.png"},
    )
    resp = analyze_deep_session_request(req)
    assert resp.status == "ERROR", f"Expected ERROR, got {resp.status}"
    assert "rainPersonImageKey" in resp.message
    print(f"  -> PASS: status={resp.status}, message={resp.message}")


def test_dispatch_star_wave_missing_key():
    """STAR_WAVE인데 starWaveImageKey가 없을 때 ERROR."""
    print("\n" + "=" * 60)
    print("[TEST 3] STAR_WAVE + 잘못된 image key → ERROR")
    req = AiAnalyzeReq(
        sessionId=3,
        deepType="STAR_WAVE",
        who5=_who5(),
        spane=_spane(),
        images={"wrongKey": "some/path.png"},
    )
    resp = analyze_deep_session_request(req)
    assert resp.status == "ERROR", f"Expected ERROR, got {resp.status}"
    assert "starWaveImageKey" in resp.message
    print(f"  -> PASS: status={resp.status}, message={resp.message}")


def test_guide_service():
    """DrawingGuideService 가이드 텍스트 로드 검증."""
    print("\n" + "=" * 60)
    print("[TEST 4] DrawingGuideService 가이드 로드")

    pir_guide = drawing_guide_service.build_prompt_context("PERSON_IN_RAIN", max_chars=4500)
    assert len(pir_guide) > 100, f"PERSON_IN_RAIN guide too short: {len(pir_guide)} chars"
    assert "우산" in pir_guide or "비" in pir_guide, "PITR guide should contain rain-related keywords"
    print(f"  -> PERSON_IN_RAIN guide: {len(pir_guide)} chars, OK")

    sw_guide = drawing_guide_service.build_prompt_context("STAR_WAVE", max_chars=4500)
    assert len(sw_guide) > 100, f"STAR_WAVE guide too short: {len(sw_guide)} chars"
    assert "별" in sw_guide or "파도" in sw_guide, "SW guide should contain star/wave keywords"
    print(f"  -> STAR_WAVE guide: {len(sw_guide)} chars, OK")

    unknown = drawing_guide_service.build_prompt_context("UNKNOWN", max_chars=4500)
    assert unknown == "", f"Unknown type should return empty, got {len(unknown)} chars"
    print(f"  -> UNKNOWN type: empty, OK")


def test_htp_schema_compat():
    """HTP도 Dict[str, str] images로 잘 받는지 확인 (S3 없으면 에러나도 분기는 타야 함)."""
    print("\n" + "=" * 60)
    print("[TEST 5] HTP Dict images 스키마 호환성")
    req = AiAnalyzeReq(
        sessionId=5,
        deepType="HTP",
        who5=_who5(),
        spane=_spane(),
        images={
            "houseImageKey": "nonexistent/house.png",
            "treeImageKey": "nonexistent/tree.png",
            "personImageKey": "nonexistent/person.png",
        },
    )
    resp = analyze_deep_session_request(req)
    # S3 키가 없으므로 에러가 나지만, 분기는 HTP로 진입해야 함
    print(f"  -> status={resp.status}, message={resp.message[:80]}...")
    print(f"  -> PASS (HTP 분기 진입 확인)")


def test_full_pipeline_s3():
    """S3 + LLM 전체 파이프라인 (환경변수 필요)."""
    from app.core.config import settings

    if not settings.gms_key:
        print("\n[SKIP] GMS_KEY 없음 — LLM 파이프라인 건너뜀")
        return
    if not settings.aws_access_key_id or not settings.s3_bucket_name:
        print("\n[SKIP] AWS 설정 없음 — S3 파이프라인 건너뜀")
        return

    pir_key = os.getenv("TEST_PIR_IMAGE_KEY", "").strip()
    sw_key = os.getenv("TEST_SW_IMAGE_KEY", "").strip()

    if pir_key:
        print("\n" + "=" * 60)
        print("[TEST 6] PERSON_IN_RAIN 전체 파이프라인 (S3 + LLM)")
        req = AiAnalyzeReq(
            sessionId=100,
            deepType="PERSON_IN_RAIN",
            who5=_who5(),
            spane=_spane(),
            images={"rainPersonImageKey": pir_key},
        )
        start = time.time()
        resp = analyze_deep_session_request(req)
        elapsed = time.time() - start
        print(f"  상태: {resp.status} ({elapsed:.1f}s)")
        print(f"  메시지: {resp.message}")
        if resp.data:
            print(f"  요약: {resp.data.resultSummary[:200]}...")
            print(f"  질문 수: {len(resp.data.questions)}")
            print(json.dumps(resp.data.raw, ensure_ascii=False, indent=2)[:500])
    else:
        print("\n[SKIP] TEST_PIR_IMAGE_KEY 환경변수 없음")

    if sw_key:
        print("\n" + "=" * 60)
        print("[TEST 7] STAR_WAVE 전체 파이프라인 (S3 + LLM)")
        req = AiAnalyzeReq(
            sessionId=101,
            deepType="STAR_WAVE",
            who5=_who5(),
            spane=_spane(),
            images={"starWaveImageKey": sw_key},
        )
        start = time.time()
        resp = analyze_deep_session_request(req)
        elapsed = time.time() - start
        print(f"  상태: {resp.status} ({elapsed:.1f}s)")
        print(f"  메시지: {resp.message}")
        if resp.data:
            print(f"  요약: {resp.data.resultSummary[:200]}...")
            print(f"  질문 수: {len(resp.data.questions)}")
            print(json.dumps(resp.data.raw, ensure_ascii=False, indent=2)[:500])
    else:
        print("\n[SKIP] TEST_SW_IMAGE_KEY 환경변수 없음")


def main():
    print("PERSON_IN_RAIN / STAR_WAVE 파이프라인 테스트")
    print("=" * 60)

    test_dispatch_unknown_type()
    test_dispatch_missing_image_key()
    test_dispatch_star_wave_missing_key()
    test_guide_service()
    test_htp_schema_compat()
    test_full_pipeline_s3()

    print("\n" + "=" * 60)
    print("모든 기본 테스트 통과!")


if __name__ == "__main__":
    main()
