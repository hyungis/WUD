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
staging=0  # 테스트 시 1로 변경 (Let's Encrypt 스테이징 서버 사용)

echo "=== Let's Encrypt 초기 설정 시작: $DOMAIN ==="

# 1. 디렉토리 생성
echo "### 디렉토리 생성 ..."
mkdir -p "$data_path/conf/live/$DOMAIN"
mkdir -p "$data_path/www"

# 2. 추천 TLS 파라미터 다운로드
if [ ! -e "$data_path/conf/options-ssl-nginx.conf" ] || [ ! -e "$data_path/conf/ssl-dhparams.pem" ]; then
  echo "### TLS 파라미터 다운로드 ..."
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > "$data_path/conf/options-ssl-nginx.conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > "$data_path/conf/ssl-dhparams.pem"
fi

# 3. 더미 인증서 생성 (nginx 시작용)
echo "### 더미 인증서 생성 ..."
docker compose run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout '/etc/letsencrypt/live/$DOMAIN/privkey.pem' \
    -out '/etc/letsencrypt/live/$DOMAIN/fullchain.pem' \
    -subj '/CN=localhost'" certbot

# 4. nginx 시작
echo "### nginx 시작 ..."
docker compose up --force-recreate -d nginx

# 5. 더미 인증서 삭제
echo "### 더미 인증서 삭제 ..."
docker compose run --rm --entrypoint "\
  rm -Rf /etc/letsencrypt/live/$DOMAIN && \
  rm -Rf /etc/letsencrypt/archive/$DOMAIN && \
  rm -Rf /etc/letsencrypt/renewal/$DOMAIN.conf" certbot

# 6. 실제 인증서 발급
echo "### Let's Encrypt 인증서 발급 요청 ..."
staging_arg=""
if [ $staging != "0" ]; then staging_arg="--staging"; fi

docker compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $staging_arg \
    --email $CERTBOT_EMAIL \
    -d $DOMAIN \
    --rsa-key-size 4096 \
    --agree-tos \
    --no-eff-email \
    --force-renewal" certbot

# 7. nginx 리로드
echo "### nginx 리로드 ..."
docker compose exec nginx nginx -s reload

echo ""
echo "=== 완료! $DOMAIN HTTPS 설정이 완료되었습니다 ==="
echo "=== https://$DOMAIN 으로 접속해보세요 ==="
