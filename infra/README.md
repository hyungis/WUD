# WoojuDraw 인프라 가이드

## 1. 아키텍처 개요

```
Client (HTTPS)
  │
  ▼ :443
┌─────────────────────────────────────┐
│  nginx (SSL 종료 + 리버스 프록시)     │
│  - HTTPS 처리                       │
│  - HTTP → HTTPS 리다이렉트 (:80)     │
│  - Let's Encrypt 자동 갱신           │
└──────┬──────────────┬───────────────┘
       │              │
    / 경로         /api/ 경로
       │              │
       ▼              ▼
┌────────────┐   ┌──────────────┐
│  frontend  │   │   backend    │
│  (nginx)   │   │ (Spring Boot)│
│  :80 내부   │   │  :8081 내부   │
│  정적파일    │   └──────┬───────┘
└────────────┘          │
                   ┌────┴────┐
                   │         │
                   ▼         ▼
              ┌────────┐ ┌──────────┐
              │ redis  │ │ rabbitmq │
              └────────┘ └────┬─────┘
                              │
                              ▼
                         ┌─────────┐
                         │   ai    │
                         │(Python) │
                         └─────────┘
```

### 서비스 구성

| 서비스 | 이미지 | 포트 | 역할 |
|--------|--------|------|------|
| nginx | nginx:alpine | 80, 443 (외부) | SSL 종료, 리버스 프록시 |
| frontend | node → nginx (multi-stage) | 80 (내부) | React SPA 정적 파일 서빙 |
| backend | eclipse-temurin:17 | 8081 (내부) | Spring Boot API 서버 |
| redis | redis:alpine | 6379 (내부) | 세션/토큰 저장 |
| rabbitmq | rabbitmq:3-management-alpine | 5672 (내부), 15672 (localhost) | 메시지 큐 (AI 연동) |
| ai | python:3.10-slim | 8000 (내부) | AI 분석 서비스 |
| certbot | certbot/certbot | - | SSL 인증서 자동 갱신 |

### 외부 노출 포트

- `:80` → HTTPS로 리다이렉트
- `:443` → HTTPS 서비스
- `:15672` → RabbitMQ 관리 UI (127.0.0.1만, SSH 터널링 필요)

---

## 2. 디렉토리 구조

```
infra/
├── docker-compose.yml          # 전체 서비스 정의
├── .env                        # 환경 변수 (git 제외)
├── .gitignore                  # .env, certbot/ 제외
├── init-letsencrypt.sh         # SSL 인증서 초기 발급 스크립트
├── nginx/
│   └── default.conf.template   # nginx HTTPS 설정 템플릿
├── certbot/                    # (런타임 생성, git 제외)
│   ├── conf/                   # SSL 인증서 저장
│   └── www/                    # ACME challenge 파일
└── README.md
```

---

## 3. 사전 준비

### 필수 요건

- EC2 인스턴스에 Docker, Docker Compose 설치
- 도메인이 EC2 퍼블릭 IP로 DNS 연결 완료
- 80, 443 포트 보안 그룹에서 열려있을 것

### 환경 변수 설정

`infra/.env` 파일을 생성하고 아래 값을 설정합니다:

```env
# DB
DB_URL=jdbc:postgresql://your-rds-endpoint:5432/your_db
DB_USERNAME=your_user
DB_PASSWORD=your_password

# RabbitMQ
RABBITMQ_USER=admin
RABBITMQ_PASS=admin

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# AWS S3
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=your-bucket
AWS_S3_PRESIGNED_URL_EXP_MIN=5
AWS_ACCESS_KEY=your-access-key
AWS_SECRET_KEY=your-secret-key
AWS_S3_PHOTO_PATH=photos

# HTTPS (실제 값으로 변경 필수)
DOMAIN=your-domain
CERTBOT_EMAIL=your-email@example.com
```

---

## 4. 배포 절차

모든 명령은 `infra/` 폴더에서 실행합니다.

```bash
cd infra
```

### 4-1. 최초 배포 (HTTPS 포함)

```bash
# 1. 전체 서비스 빌드 및 실행
docker compose up -d --build

# 2. SSL 인증서 초기 발급 (최초 1회만)
chmod +x init-letsencrypt.sh
./init-letsencrypt.sh
```

`init-letsencrypt.sh`가 하는 일:

1. TLS 파라미터 다운로드
2. 더미 인증서 생성 → nginx 시작
3. 더미 인증서 삭제 → Let's Encrypt 실제 인증서 발급
4. nginx 리로드

### 4-2. 이후 배포 (코드 업데이트)

```bash
docker compose up -d --build
```

SSL 인증서는 이미 `certbot/` 디렉토리에 저장되어 있으므로 `init-letsencrypt.sh`를 다시 실행할 필요 없습니다.

### 4-3. 서비스 중지

```bash
# 컨테이너 중지
docker compose down

# 볼륨까지 모두 삭제 (주의: 데이터 손실)
docker compose down -v
```

---

## 5. SSL 인증서 관리

### 자동 갱신

- `certbot` 컨테이너: **12시간마다** 인증서 갱신 시도
- `nginx` 컨테이너: **6시간마다** 설정 리로드하여 새 인증서 반영
- Let's Encrypt 인증서 유효기간: 90일
- 별도 관리 불필요 (자동 처리)

### 수동 갱신 (필요 시)

```bash
docker compose run --rm certbot renew
docker compose exec nginx nginx -s reload
```

### 인증서 상태 확인

```bash
docker compose run --rm certbot certificates
```

---

## 6. nginx 설정

### 설정 파일

- **템플릿**: `infra/nginx/default.conf.template`
- **환경 변수**: `$DOMAIN`이 `.env`의 값으로 자동 치환됨
- **치환 방식**: `envsubst '$DOMAIN'` (nginx 변수 `$host`, `$uri` 등은 유지)

### 동작 방식

| 경로 | 처리 |
|------|------|
| `http://도메인/*` | `https://도메인/*`로 301 리다이렉트 |
| `https://도메인/` | `frontend:80`으로 프록시 (React SPA) |
| `https://도메인/api/*` | `backend:8081/*`으로 프록시 (API prefix strip) |
| `http://도메인/.well-known/acme-challenge/` | certbot 인증서 발급용 |

### 프록시 헤더

모든 프록시 요청에 아래 헤더가 포함됩니다:

- `X-Real-IP` - 클라이언트 실제 IP
- `X-Forwarded-For` - 프록시 체인 IP
- `X-Forwarded-Proto` - 원본 프로토콜 (https)

---

## 7. Health Check

| 서비스 | 체크 방법 | 간격 | 타임아웃 | 재시도 |
|--------|----------|------|---------|--------|
| redis | `redis-cli ping` | 5초 | 3초 | 5회 |
| rabbitmq | `rabbitmq-diagnostics -q ping` | 10초 | 5초 | 5회 |

`backend`는 redis, rabbitmq가 healthy 상태가 된 후에 시작됩니다.

---

## 8. 로그 확인

```bash
# 전체 서비스 로그
docker compose logs -f

# 특정 서비스 로그
docker compose logs -f nginx
docker compose logs -f frontend
docker compose logs -f backend
docker compose logs -f ai
docker compose logs -f certbot
```

---

## 9. 트러블슈팅

### SSL 인증서 발급 실패

```bash
# 스테이징 모드로 테스트 (rate limit 없음)
# init-letsencrypt.sh 에서 staging=1 로 변경 후 실행

# 인증서 디렉토리 초기화 후 재시도
rm -rf certbot/
./init-letsencrypt.sh
```

### nginx 설정 오류 확인

```bash
docker compose exec nginx nginx -t
```

### 컨테이너 상태 확인

```bash
docker compose ps
```

### RabbitMQ 관리 UI 접속 (SSH 터널링)

```bash
ssh -L 15672:localhost:15672 ubuntu@your-ec2-ip
# 이후 브라우저에서 http://localhost:15672 접속
```
