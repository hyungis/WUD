# HTTPS 구성 가이드

WoojuDraw 프로젝트의 HTTPS(SSL/TLS) 구성 과정과 이슈 해결을 정리한 문서입니다.

---

## 1. 아키텍처

### 변경 전 (HTTP only)

```
Client :80 → frontend(nginx) → React SPA + /api/ proxy → backend
```

- frontend 컨테이너가 nginx를 내장하여 정적 파일 서빙 + API 프록시를 동시에 담당
- 포트 80만 외부 노출

### 변경 후 (HTTPS)

```
Client
  │
  ├─ :80  → nginx → 301 redirect → :443
  │
  └─ :443 → nginx (SSL 종료)
               ├─ /          → frontend:80 (React SPA)
               └─ /api/      → backend:8081 (Spring Boot)
```

- **nginx 컨테이너** (독립): SSL 종료 + 리버스 프록시 전담
- **frontend 컨테이너**: 정적 파일 서빙만 담당 (API 프록시 제거)
- **certbot 컨테이너**: Let's Encrypt 인증서 자동 갱신

---

## 2. 변경된 파일

| 파일 | 변경 |
|------|------|
| `infra/docker-compose.yml` | nginx, certbot 서비스 추가. frontend `ports` → `expose`로 변경. redis/rabbitmq healthcheck 추가 |
| `infra/init-letsencrypt.sh` | SSL 인증서 초기 발급 스크립트 (신규) |
| `infra/.gitignore` | `.env`, `certbot/`, `nginx/conf.d/` 제외 |
| `fe/nginx.conf` | `/api/` 프록시 location 제거 (외부 nginx가 담당) |

### 런타임 생성 파일 (git 미추적)

| 파일 | 설명 |
|------|------|
| `infra/nginx/conf.d/default.conf` | init 스크립트가 생성하는 nginx 설정 |
| `infra/certbot/conf/` | SSL 인증서 저장 |
| `infra/certbot/www/` | ACME challenge 파일 |

---

## 3. 핵심 설계 결정

### nginx 2중 구조

```
nginx (infra) → SSL 종료, 라우팅     ← 외부 노출 (:80, :443)
nginx (fe)    → React 정적파일 서빙   ← 내부 전용 (:80)
```

- **분리 이유**: SSL 설정 변경 시 프론트 재빌드 불필요, 프론트 코드 변경 시 SSL nginx 재빌드 불필요
- **성능 영향**: 내부 네트워크 hop 1회 추가 (무시 가능한 수준)

### template 방식 대신 heredoc 직접 생성

init 스크립트가 shell heredoc으로 `nginx/conf.d/default.conf`를 직접 생성합니다.

이유는 아래 이슈 섹션에서 설명합니다.

---

## 4. 이슈 및 해결

### 이슈: nginx template 방식에서 ACME challenge 404

#### 증상

```
Certbot failed to authenticate some domains
Detail: Invalid response from
  http://j14d207.p.ssafy.io/.well-known/acme-challenge/...: 404
```

- nginx는 정상 동작 (응답 반환)
- ACME challenge 파일은 컨테이너 내부에 존재 확인
- nginx 에러 로그는 비어있음

#### 원인: nginx 이미지의 docker-entrypoint.sh 충돌

처음에는 `envsubst`로 template 파일을 처리하는 방식을 사용했습니다:

```yaml
# 문제가 된 설정
nginx:
  volumes:
    - ./nginx/default.conf.template:/etc/nginx/templates/default.conf.template:ro
  command: "envsubst '$$DOMAIN' < /etc/nginx/templates/... > /etc/nginx/conf.d/default.conf && nginx ..."
```

**문제**: `nginx:alpine` 이미지의 `docker-entrypoint.sh`가 `/etc/nginx/templates/` 경로의 `*.template` 파일을 **자체적으로 envsubst 처리**합니다. 우리 command보다 먼저 실행되어 설정이 충돌했습니다.

- entrypoint가 template을 처리 → 별도의 envsubst 규칙으로 config 생성
- 이후 우리 command가 다시 config를 덮어쓰지만, 충돌 과정에서 nginx가 의도치 않은 config로 동작

에러 로그가 비어있던 이유: 요청이 ACME challenge location 블록에 도달하지 못하고, nginx 내부에서 다른 경로로 처리되어 file open 에러 자체가 발생하지 않음.

#### 해결: template 방식 폐기 → heredoc 직접 생성

```yaml
# 해결된 설정
nginx:
  volumes:
    - ./nginx/conf.d:/etc/nginx/conf.d:ro  # template이 아닌 완성된 config 마운트
  command: ["sh", "-c", "while :; do sleep 6h && nginx -s reload; done & nginx -g 'daemon off;'"]
```

- `/etc/nginx/templates/`에 아무것도 마운트하지 않음 → entrypoint 간섭 없음
- init 스크립트가 heredoc으로 `nginx/conf.d/default.conf`를 직접 생성
- nginx는 완성된 config 파일을 그대로 로드

---

## 5. 배포 절차

### 최초 배포 (HTTPS 설정)

```bash
cd infra

# .env에서 DOMAIN, CERTBOT_EMAIL 설정 확인
vi .env

# 인증서 발급 + 전체 서비스 시작
chmod +x init-letsencrypt.sh
./init-letsencrypt.sh
```

init 스크립트 동작 순서:

1. 디렉토리 생성 + TLS 파라미터 다운로드
2. **HTTP-only nginx 설정 생성** → `nginx/conf.d/default.conf`
3. nginx만 시작 (`--no-deps`)
4. **ACME challenge 경로 자체 테스트** (실패 시 스크립트 중단)
5. certbot으로 Let's Encrypt 인증서 발급
6. **HTTPS nginx 설정으로 교체** → `nginx/conf.d/default.conf`
7. 전체 스택 시작

### 이후 배포 (코드 업데이트)

```bash
cd infra
docker compose up -d --build
```

`nginx/conf.d/default.conf`와 `certbot/` 디렉토리가 호스트에 그대로 남아있으므로 init 스크립트를 다시 실행할 필요 없습니다.

---

## 6. SSL 인증서 관리

### 자동 갱신

| 컨테이너 | 동작 | 주기 |
|----------|------|------|
| certbot | `certbot renew` 실행 | 12시간마다 |
| nginx | `nginx -s reload` 실행 | 6시간마다 |

- Let's Encrypt 인증서 유효기간: **90일**
- certbot은 만료 30일 전부터 자동 갱신 시도
- 별도 관리 불필요

### 수동 관리 (필요 시)

```bash
# 인증서 상태 확인
docker compose run --rm certbot certificates

# 수동 갱신
docker compose run --rm certbot renew
docker compose exec nginx nginx -s reload
```

---

## 7. 사전 요구 사항 체크리스트

- [ ] EC2에 Docker, Docker Compose 설치됨
- [ ] 도메인 DNS가 EC2 퍼블릭 IP로 연결됨
- [ ] AWS 보안 그룹에서 **80, 443** 포트 인바운드 허용
- [ ] `infra/.env`에 `DOMAIN`, `CERTBOT_EMAIL` 설정됨

---

## 8. 트러블슈팅

### 인증서 발급 실패 시

```bash
# 스테이징 모드로 먼저 테스트 (rate limit 없음)
# init-letsencrypt.sh에서 staging=1로 변경 후 실행

# 인증서 디렉토리 초기화
rm -rf certbot/ nginx/conf.d/
./init-letsencrypt.sh
```

### nginx 설정 검증

```bash
docker compose exec nginx nginx -t
```

### 컨테이너 상태 확인

```bash
docker compose ps
docker compose logs nginx
docker compose logs certbot
```

### Let's Encrypt rate limit

- 같은 도메인으로 **주당 5회**까지만 인증서 발급 가능
- 테스트 시 반드시 `staging=1`로 설정할 것
