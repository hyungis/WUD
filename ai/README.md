# AI Analysis Server Guide (FastAPI)

이 문서는 S3에 업로드된 이미지를 기반으로, YOLO를 통해 객체를 탐지하고 Upstage Solar LLM을 통해 상황을 분석하는 AI 분리 서버(FastAPI)의 실행 및 테스트 가이드입니다.

## 1. 사전 준비 (환경 변수)
`ai` 폴더 내부에 `.env` 파일을 생성하고 아래의 정보들을 입력해야 합니다.

```env
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION_NAME=ap-northeast-2
S3_BUCKET_NAME=your_s3_bucket
UPSTAGE_API_KEY=your_upstage_solar_api_key
YOLO_MODEL_PATH=yolov8n.pt
```

## 2. 도커 컨테이너 빌드 및 실행
AI 서버는 프로젝트 루트의 `docker-compose.yml`을 통해 백엔드/프론트엔드와 동일한 네트워크에서 동작합니다.

```bash
# 프로젝트 루트 경로(docker-compose.yml이 있는 곳)에서 실행
docker-compose up -d --build ai

# 실행 상태 및 로그 확인
docker logs -f s14p21d207-ai-1
```
* 서버는 내부적으로 `8000`번 포트를 사용합니다.
* `docker-compose`에 볼륨 마운트가 설정되어 있으므로, 파이썬 파일 코드를 수정하면 별도의 복사(cp) 없이 컨테이너에 즉시 적용됩니다. (가장 바깥 경로 기준 `./ai:/app`)

## 3. 테스트 스크립트 실행
백엔드 API를 연결하기 전에, AI 서버 로직만 단독으로 테스트해볼 수 있도록 `test_flow.py` 스크립트가 준비되어 있습니다.

### 테스트할 대상 이미지 변경 방법
`ai/test_flow.py` 파일 내의 `s3_key` 변수를 본인의 S3 버킷에 존재하는 파일 경로로 수정합니다.
```python
def main():
    s3_key = "photos/테스트할_이미지.jpg"  # 수정 포인트
    # ...
```

### 테스트 실행 명령어
도커 컨테이너 내부 환경에서 스크립트를 직접 실행합니다. 터미널(호스트 PC)에서 아래 명령어를 입력하세요.
```bash
docker exec s14p21d207-ai-1 python /app/test_flow.py
```

### 실행 과정 및 결과 예시
1. **S3 다운로드**: 설정된 S3 버킷과 `s3_key`를 바탕으로 이미지를 임시 폴더(`/tmp/ai_images/`)로 다운로드합니다.
2. **YOLO Classification**: `yolov8n.pt`를 통해 사진 속 객체들을 탐지합니다 (예: 사람, 동물, 사물 등).
3. **LLM Analysis**: YOLO가 뽑아낸 키워드(텍스트)를 Upstage Solar API에 전달하여 3문장 이내의 친근한 말투로 상황 분석 결과를 텍스트로 받아옵니다.

## 4. 백엔드(Spring)와 통신 엔드포인트
백엔드 연동 개발 시에는 아래의 API를 호출하시면 됩니다.
* **URL**: `POST http://ai:8000/internal/ai/daily/analyze`
* **Request Body** (JSON):
  ```json
  {
      "s3_object_key": "photos/동물가족화_동물그림01.jpg"
  }
  ```
* **Response** (JSON 예시):
  ```json
  {
      "status": "success",
      "classifications": [
          {"class": "elephant", "confidence": 0.93},
          {"class": "person", "confidence": 0.52}
      ],
      "llm_analysis": "사진 속 코끼리와 사람 등이 함께 있는 걸 보니 자연에서 즐거운 시간을 보내는 것 같아요! ...",
      "error": null
  }
  ```

---

> **참고 (Vision Model 도입 관련)**  
> * 현재 사용 중인 Upstage `solar-pro` 모델은 텍스트 전용입니다. 직접적인 이미지 인식이 불가능해 YOLO를 1차 필터로 사용하고 있습니다. 
> * 추후 OpenAI `gpt-4o` 등 Vision 전문 LLM을 도입하게 된다면 YOLO 단계를 생략하고 전용 스크립트(`test_flow_vision.py` 내 로직)를 활용하도록 API를 리팩토링할 수 있습니다.
