# HTP 분석 AI 파이프라인 가이드

## 1. 파이프라인 개요

HTP(House-Tree-Person) 그림 분석 파이프라인은 S3에 저장된 집·나무·사람 이미지 3장을 받아, YOLO로 요소를 감지하고, 문서 기반 가이드 + GPT-4o 멀티모달로 심층 해석을 수행한 뒤 백엔드로 결과를 반환합니다.

---

## 2. 파이프라인 단계별 설명

### 2-1. 요청 수신 및 이미지 다운로드

| 항목 | 내용 |
|------|------|
| 입력 | `AiAnalyzeReq`: sessionId, deepType, who5, images(house/tree/person S3 키 3개) |
| 처리 | `s3_service.download_image(key)`로 S3에서 이미지 3장 다운로드 → `/tmp/ai_images/` 저장 |
| 출력 | 이미지 3장의 로컬 경로 |

---

### 2-2. YOLO 추론 (객체/요소 감지)

| 항목 | 내용 |
|------|------|
| 입력 | 위에서 다운로드한 이미지 3장 경로 |
| 모델 | `ai/yolo_models/house.pt`, `tree.pt`, `person.pt` (각 이미지 타입별 전용) |
| 처리 | `YoloService.classify_image()` → `summarize_detections()` 로 counts, bestConfidence 요약 |
| 출력 | house/tree/person 각각 `{counts, bestConfidence, total}` |

**YOLO 클래스 예시**
- house: 집전체, 지붕, 문, 창문굴뚝, 연기, 길, 울타리, 잔디, 꽃, 태양, 산, 연못
- tree: 나무전체, 가지, 나뭇잎, 뿌리, 수관, 열매, 꽃, 구름, 달, 별, 새, 동물
- person: 사람전체, 얼굴, 머리, 머리카락, 눈, 코, 입, 귀, 목, 상체, 팔, 손, 다리, 발, 옷세부, 신발

---

### 2-3. HTP 가이드 컨텍스트 생성

| 항목 | 내용 |
|------|------|
| 소스 | `ai/app/resources/htp_guide.txt` |
| 처리 | `htp_guide_service.build_prompt_context()` → 키워드 기반 단락 추출, 금지어 필터링 |
| 금지어 | HTP, 투사검사, 진단, 정신분열 등 (LLM refusal 방지) |
| 출력 | 최대 4500자 프롬프트용 문서 텍스트 |

---

### 2-4. S3 Presigned URL 생성

| 항목 | 내용 |
|------|------|
| 처리 | `s3_service.generate_presigned_url(key)` (만료 10분) |
| 용도 | LLM에 base64 대신 URL로 이미지 전달 → 요청 바디 크기 축소, GMS 통과 용이 |

---

### 2-5. LLM(GPT-4o) 멀티모달 분석

| 항목 | 내용 |
|------|------|
| 엔드포인트 | SSAFY GMS (OpenAI 호환) |
| 모델 | gpt-4o |
| 입력 | developer_prompt, guide, wellbeing_survey, YOLO 결과, 이미지 3장(URL) |
| 출력 스키마 | resultSummary, strengths, questions, raw(observations, wellbeing) |
| refusal 시 | 1회 자동 재시도 (문서·wellbeing raw 제거한 단순 프롬프트) |

---

### 2-6. 응답 정규화 및 매핑

| 항목 | 내용 |
|------|------|
| 처리 | `deep_analyze_service`에서 LLM JSON → `AiAnalysisData` 형태로 변환 |
| resultSummary | LLM 출력 또는 observations/interpretation 등에서 fallback 추출 |
| strengths | `raw.strengths`에 포함 |
| questions | LLM 출력 또는 기본 3개 fallback |

---

### 2-7. 결과 반환 / RabbitMQ 발행

| 경로 | 설명 |
|------|------|
| HTTP 직접 호출 | `AiAnalyzeResp` JSON 반환 |
| RabbitMQ | `wud.deep.ai.result.routing-key`로 결과 발행 → Spring Consumer 수신 → DB 저장, status=DONE |

---

## 3. RabbitMQ와 FastAPI 흐름

### 3-1. 전체 아키텍처

```
[Spring Backend]                    [RabbitMQ]                      [FastAPI AI]
      |                                  |                                  |
      | 1. publish AiAnalyzeReq          |                                  |
      | ------------------------------->|  request queue                   |
      |                                 |  (wud.deep.ai.request.queue)     |
      |                                 | --------------------------------->| 2. consume
      |                                 |                                    | 3. S3/YOLO/LLM 처리
      |                                 |  result exchange                   |
      |                                 |  (wud.deep.ai.exchange)            |
      |                                 |  routing: wud.deep.ai.result...    |
      |                                 | <---------------------------------| 4. publish AiAnalyzeResp
      |                                 |                                    |
      | 5. consume AiAnalyzeResp        |  result queue                      |
      | <-------------------------------|  (wud.deep.ai.result.queue)       |
      | 6. DB 저장, status=DONE         |                                    |
```

### 3-2. 요청 흐름 (Backend → AI)

1. `DeepSessionServiceImpl.submitHtp()` → HTP 제출 시 `AiAnalyzeReq` 생성
2. `DeepAiServiceImpl.requestHtpAnalysis()` → `rabbitTemplate.convertAndSend(exchange, routingKey, request)`
3. 메시지가 `wud.deep.ai.request.queue`에 적재
4. FastAPI `DeepAiRabbitRpcConsumer`가 큐에서 메시지 수신
5. `analyze_deep_session_request(request)` 호출 → S3/YOLO/LLM 처리

### 3-3. 응답 흐름 (AI → Backend)

1. FastAPI가 `AiAnalyzeResp` 생성 후 `channel.basic_publish(exchange, result_routing_key, body)`
2. `wud.deep.ai.exchange` + `wud.deep.ai.result.routing-key`로 발행
3. 바인딩된 `wud.deep.ai.result.queue`에 메시지 도착
4. Spring `DeepAiResultConsumer.consumeAiResult()`가 수신
5. `status == "SUCCESS"`이면 `DeepResult` 저장, `DeepSession.status = DONE`

### 3-4. 주요 설정값

| 구분 | Exchange | Request Queue | Request Routing Key | Result Queue | Result Routing Key |
|------|----------|---------------|---------------------|--------------|---------------------|
| 값 | wud.deep.ai.exchange | wud.deep.ai.request.queue | wud.deep.ai.request.routing-key | wud.deep.ai.result.queue | wud.deep.ai.result.routing-key |

---

## 4. Docker로 테스트하는 방법

### 4-1. 전체 서비스 빌드 및 실행

```powershell
cd C:\ssafy\specialization_pjt\S14P21D207
docker compose -f .\infra\docker-compose.yml up -d --build
```

### 4-2. AI 서버만 빌드 및 실행

```powershell
cd C:\ssafy\specialization_pjt\S14P21D207
docker compose -f .\infra\docker-compose.yml up -d --build ai
```

### 4-3. HTP 로컬 플로우 테스트 (test_flow_htp_local.py)

`ai/test_image/` 폴더의 집.jpg, 나무.jpg, 사람.jpg 사용.

```powershell
# 이미지 포함 (YOLO + LLM 전체)
docker compose -f .\infra\docker-compose.yml exec ai python /app/test_flow_htp_local.py

# 이미지 제외, 텍스트만 (YOLO 결과 + LLM)
docker compose -f .\infra\docker-compose.yml exec -e SKIP_IMAGES=1 ai python /app/test_flow_htp_local.py
```

### 4-4. /deep/analyze 엔드포인트 직접 호출 (S3 이미지 사용)

```powershell
docker compose -f .\infra\docker-compose.yml exec ai python -c "
import requests
url = 'http://127.0.0.1:8000/internal/ai/deep/analyze'
payload = {
  'sessionId': 123,
  'deepType': 'HTP',
  'who5': {'scoreTotal': 10, 'raw': {'q1': 2, 'q2': 2, 'q3': 2, 'q4': 2, 'q5': 2}},
  'images': {
    'houseImageKey': 'photos/test/집.jpg',
    'treeImageKey':  'photos/test/나무.jpg',
    'personImageKey': 'photos/test/사람.jpg'
  }
}
r = requests.post(url, json=payload, timeout=300)
print(r.status_code)
print(r.text)
"
```

### 4-5. 서버 기동 대기 후 테스트

컨테이너 재시작 직후에는 서버가 아직 준비되지 않았을 수 있으므로, 아래처럼 대기 후 호출합니다.

```powershell
Start-Sleep -Seconds 5
docker compose -f .\infra\docker-compose.yml exec ai python /app/test_flow_htp_local.py
```

---

## 5. 필수 환경 변수

### ai/.env

| 변수 | 설명 |
|------|------|
| AWS_ACCESS_KEY_ID | AWS 자격 증명 |
| AWS_SECRET_ACCESS_KEY | AWS 자격 증명 |
| AWS_REGION_NAME | ap-northeast-2 등 |
| S3_BUCKET_NAME | 이미지 버킷 이름 |
| GMS_KEY | SSAFY GMS API 키 |
| GMS_MODEL | gpt-4o (기본) |

### infra/.env (docker-compose용)

| 변수 | 설명 |
|------|------|
| RABBITMQ_USER | RabbitMQ 사용자 |
| RABBITMQ_PASS | RabbitMQ 비밀번호 |
