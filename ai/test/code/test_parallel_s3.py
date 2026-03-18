"""S3 병렬 다운로드 + SPANE 포함 전체 파이프라인 테스트."""
from __future__ import annotations

import base64
import io
import json
import os
import sys
import time
from pathlib import Path

_AI_ROOT = str(Path(__file__).resolve().parents[2])
sys.path.insert(0, _AI_ROOT)

from PIL import Image as PILImage
from app.core.config import settings
from app.models.schemas import AiAnalyzeReq, SpaneData, Who5Data, HtpImages
from app.services.deep_analyze_service import analyze_deep_session_request


def _small_data_url(path: str, max_side: int = 384, quality: int = 40) -> str:
    img = PILImage.open(path).convert("RGB")
    w, h = img.size
    scale = min(max_side / max(w, 1), max_side / max(h, 1), 1.0)
    if scale < 1.0:
        img = img.resize((int(w * scale), int(h * scale)), PILImage.Resampling.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality, optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{b64}"


def test_full_pipeline():
    """analyze_deep_session_request 전체 호출 테스트 (S3 필요)."""
    if not settings.aws_access_key_id or not settings.s3_bucket_name:
        print("[SKIP] AWS 설정이 없어 S3 테스트를 건너뜁니다.")
        return False

    if not settings.gms_key:
        print("[SKIP] GMS_KEY가 없어 LLM 테스트를 건너뜁니다.")
        return False

    # 실제 S3에 있는 테스트용 이미지 키가 필요 — 없으면 건너뜀
    test_keys = os.getenv("TEST_IMAGE_KEYS", "").strip()
    if not test_keys:
        print("[SKIP] TEST_IMAGE_KEYS 환경변수가 없어 S3 통합 테스트를 건너뜁니다.")
        print("  사용법: set TEST_IMAGE_KEYS=house_key,tree_key,person_key")
        return False

    keys = test_keys.split(",")
    if len(keys) != 3:
        print("[SKIP] TEST_IMAGE_KEYS는 콤마 구분 3개 키가 필요합니다.")
        return False

    req = AiAnalyzeReq(
        sessionId=99999,
        deepType="HTP",
        who5=Who5Data(scoreTotal=16, raw={"q1": 4, "q2": 3, "q3": 3, "q4": 3, "q5": 3}),
        spane=SpaneData(
            scorePositive=21, scoreNegative=12, scoreBalance=9,
            raw={"q1": 4, "q2": 3, "q3": 4, "q4": 5, "q5": 3, "q6": 2,
                 "q7": 2, "q8": 3, "q9": 2, "q10": 2, "q11": 1, "q12": 2},
        ),
        images=HtpImages(
            houseImageKey=keys[0].strip(),
            treeImageKey=keys[1].strip(),
            personImageKey=keys[2].strip(),
        ),
    )

    start = time.time()
    resp = analyze_deep_session_request(req)
    elapsed = time.time() - start

    print(f"\n  상태: {resp.status}")
    print(f"  소요시간: {elapsed:.2f}s")
    if resp.data:
        print(f"  resultSummary 길이: {len(resp.data.resultSummary)}")
        print(f"  questions: {resp.data.questions}")
        wb = resp.data.raw.get("wellbeing", {})
        print(f"  wellbeing: {json.dumps(wb, ensure_ascii=False)}")
    else:
        print(f"  에러: {resp.message}")

    assert resp.status == "SUCCESS", f"Expected SUCCESS, got {resp.status}: {resp.message}"
    print("\n  [PASS] 전체 파이프라인 통과")
    return True


def test_parallel_vs_sequential():
    """병렬 vs 순차 S3 다운로드 속도 비교 (S3 필요)."""
    from concurrent.futures import ThreadPoolExecutor
    from app.services.s3_service import s3_service

    if not settings.aws_access_key_id or not settings.s3_bucket_name:
        print("[SKIP] AWS 설정 없음")
        return False

    test_keys = os.getenv("TEST_IMAGE_KEYS", "").strip()
    if not test_keys:
        print("[SKIP] TEST_IMAGE_KEYS 환경변수 없음")
        return False

    keys = [k.strip() for k in test_keys.split(",")]
    if len(keys) != 3:
        print("[SKIP] 키 3개 필요")
        return False

    # 순차 다운로드
    start = time.time()
    paths_seq = []
    for k in keys:
        paths_seq.append(s3_service.download_image(k))
    seq_time = time.time() - start

    for p in paths_seq:
        if p and os.path.exists(p):
            os.remove(p)

    # 병렬 다운로드
    start = time.time()
    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = [pool.submit(s3_service.download_image, k) for k in keys]
        paths_par = [f.result() for f in futures]
    par_time = time.time() - start

    for p in paths_par:
        if p and os.path.exists(p):
            os.remove(p)

    print(f"  순차 다운로드: {seq_time:.3f}s")
    print(f"  병렬 다운로드: {par_time:.3f}s")
    print(f"  개선율: {((seq_time - par_time) / seq_time * 100):.1f}%")
    print(f"\n  [PASS] 병렬 다운로드 테스트 완료")
    return True


def test_local_only():
    """S3 없이 로컬 이미지로 스키마 + YOLO 파이프라인만 검증."""
    from app.services.yolo_service import YoloService
    from app.services.cv_feature_service import extract_features as cv_extract_features
    from app.services.deep_analyze_service import _IMAGE_KEYS, _MODEL_PATHS

    root = Path(__file__).resolve().parents[2]
    test_dir = root / "test" / "image"

    local_images = {
        "house": test_dir / "집.jpg",
        "tree": test_dir / "나무.jpg",
        "person": test_dir / "사람.jpg",
    }

    if not all(p.exists() for p in local_images.values()):
        print("[SKIP] test/image 폴더에 집/나무/사람 이미지 필요")
        return False

    start = time.time()
    for key in _IMAGE_KEYS:
        det = YoloService.classify_image(str(local_images[key]), _MODEL_PATHS[key])
        summary = YoloService.summarize_detections(det)
        print(f"  {key}: {summary['total']} objects detected")
    elapsed = time.time() - start

    print(f"  YOLO 총 소요: {elapsed:.2f}s")
    print(f"\n  [PASS] 로컬 YOLO 파이프라인 정상")
    return True


if __name__ == "__main__":
    print("=" * 60)
    print("[1] 로컬 YOLO 파이프라인")
    test_local_only()

    print("\n" + "=" * 60)
    print("[2] 병렬 vs 순차 S3 다운로드 비교")
    test_parallel_vs_sequential()

    print("\n" + "=" * 60)
    print("[3] 전체 파이프라인 (S3 + YOLO + LLM)")
    test_full_pipeline()

    print("\n" + "=" * 60)
    print("완료")
