#!/bin/bash
set -e

# .env 파일에서 환경 변수 로드
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep -v '^\s*$' | xargs)
fi

if [ -z "$DOMAIN" ]; then
  echo "Error: DOMAIN is not set in .env"
  exit 1
fi

if [ -z "$CERTBOT_EMAIL" ]; then
  echo "Error: CERTBOT_EMAIL is not set in .env"
  exit 1
fi

data_path="./certbot"
staging=0  # 테스트 시 1로 변경

echo "=== Let's Encrypt 초기 설정 시작: $DOMAIN ==="

# 1. 디렉토리 생성
echo "### 디렉토리 생성 ..."
mkdir -p "$data_path/conf"
mkdir -p "$data_path/www/.well-known/acme-challenge"

# 2. 추천 TLS 파라미터 다운로드
if [ ! -e "$data_path/conf/options-ssl-nginx.conf" ] || [ ! -e "$data_path/conf/ssl-dhparams.pem" ]; then
  echo "### TLS 파라미터 다운로드 ..."
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > "$data_path/conf/options-ssl-nginx.conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > "$data_path/conf/ssl-dhparams.pem"
fi

# 3. 기존 인프라 정리
echo "### 기존 컨테이너 정리 ..."
docker compose down

# 4. nginx를 HTTP only 설정으로 시작 (443 블록 없이 → 인증서 불필요)
echo "### nginx 시작 (HTTP only) ..."

# http-only 템플릿을 conf.d에 직접 렌더링해서 올리기 위해
# 임시로 nginx만 http-only 설정으로 실행
DOMAIN=$DOMAIN docker compose run --rm \
  -v "$(pwd)/nginx/http-only.conf.template:/etc/nginx/templates/http-only.conf.template:ro" \
  --entrypoint "/bin/sh -c \
    \"envsubst '\$\$DOMAIN' \
    < /etc/nginx/templates/http-only.conf.template \
    > /etc/nginx/conf.d/default.conf \
    && nginx -g 'daemon off;'\"" \
  nginx &

NGINX_PID=$!
sleep 5

# 5. 인증서 발급
echo "### Let's Encrypt 인증서 발급 요청 ..."
staging_arg=""
if [ "$staging" != "0" ]; then staging_arg="--staging"; fi

docker compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $staging_arg \
    --email $CERTBOT_EMAIL \
    -d $DOMAIN \
    --rsa-key-size 4096 \
    --agree-tos \
    --no-eff-email \
    --force-renewal" certbot

# 6. 임시 nginx 종료
echo "### 임시 nginx 종료 ..."
kill $NGINX_PID 2>/dev/null || true
docker compose down

# 7. 전체 스택 시작 (HTTPS 포함)
echo "### 전체 스택 시작 (HTTPS) ..."
docker compose up --force-recreate -d

echo ""
echo "=== 완료! $DOMAIN HTTPS 설정이 완료되었습니다 ==="
echo "=== https://$DOMAIN 으로 접속해보세요 ==="