# Deep 분석 S3 병렬 다운로드 최적화

## 개요

심층(HTP) 분석 시 S3 이미지 다운로드를 순차에서 병렬로 변경하여 I/O 대기 시간을 단축했습니다.

## 변경 파일

- `app/services/deep_analyze_service.py`

## 변경 내용

### Before (순차 처리)

```python
image_paths["house"] = s3_service.download_image(request.images.houseImageKey)
image_paths["tree"] = s3_service.download_image(request.images.treeImageKey)
image_paths["person"] = s3_service.download_image(request.images.personImageKey)

image_urls = {
    "house": s3_service.generate_presigned_url(request.images.houseImageKey),
    "tree": s3_service.generate_presigned_url(request.images.treeImageKey),
    "person": s3_service.generate_presigned_url(request.images.personImageKey),
}
```

S3 다운로드 3회 + presigned URL 생성 3회가 **순차로 실행**되어 네트워크 지연이 누적됨.

### After (병렬 처리)

```python
from concurrent.futures import ThreadPoolExecutor

with ThreadPoolExecutor(max_workers=3) as pool:
    download_futures = {
        key: pool.submit(s3_service.download_image, s3_keys[key])
        for key in _IMAGE_KEYS
    }
    url_futures = {
        key: pool.submit(s3_service.generate_presigned_url, s3_keys[key])
        for key in _IMAGE_KEYS
    }
    image_paths = {key: f.result() for key, f in download_futures.items()}
    image_urls = {key: f.result() for key, f in url_futures.items()}
```

3개 스레드로 S3 다운로드와 presigned URL 생성을 **동시에 실행**.

### 추가 개선: 상수 추출

매 요청마다 재계산하던 YOLO 모델 경로를 모듈 레벨 상수로 추출.

```python
_IMAGE_KEYS = ("house", "tree", "person")
_BASE_DIR = Path(__file__).resolve().parents[2]
_YOLO_MODELS_DIR = (_BASE_DIR / "yolo_models").resolve()
_MODEL_PATHS = {
    "house": str(_YOLO_MODELS_DIR / "house_640.pt"),
    "tree": str(_YOLO_MODELS_DIR / "tree_640.pt"),
    "person": str(_YOLO_MODELS_DIR / "person_640.pt"),
}
```

## 벤치마크 결과

| 항목 | 시간 |
|------|------|
| 순차 다운로드 (3장) | 0.715s |
| **병렬 다운로드 (3장)** | **0.465s** |
| **개선율** | **35%** |

## YOLO/CV는 순차 유지

YOLO 추론과 CV Feature 추출은 CPU/GPU 연산이기 때문에 병렬화 시 리소스 경합이 발생할 수 있어 순차 처리를 유지했습니다.

## 전체 파이프라인 소요 시간

| 단계 | 소요 시간 (약) |
|------|---------------|
| S3 다운로드 + presigned URL (병렬) | 0.5s |
| YOLO 추론 x3 | 1.0s |
| CV Feature 추출 x3 | 0.2s |
| LLM (GPT-4o) 호출 | 8.0s |
| **합계** | **~9.7s** |

LLM 호출이 전체의 약 80%를 차지하며, S3 다운로드 병렬화는 나머지 20% 구간에서의 최적화입니다.
