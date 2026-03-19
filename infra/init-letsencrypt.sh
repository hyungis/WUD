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
enable_monitoring="1" # 1이면 monitoring compose도 함께 기동

echo "=== Let's Encrypt 초기 설정 시작: $DOMAIN ==="

# 1. 디렉토리 생성
echo "### 디렉토리 생성 ..."
mkdir -p "$data_path/conf"
mkdir -p "$data_path/www"
mkdir -p "./nginx/conf.d"

# 2. TLS 파라미터 다운로드
if [ ! -e "$data_path/conf/options-ssl-nginx.conf" ] || [ ! -e "$data_path/conf/ssl-dhparams.pem" ]; then
  echo "### TLS 파라미터 다운로드 ..."
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > "$data_path/conf/options-ssl-nginx.conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > "$data_path/conf/ssl-dhparams.pem"
fi

# 3. HTTP-only nginx 설정 생성 (인증서 발급용)
echo "### HTTP-only nginx 설정 생성 ..."
cat > ./nginx/conf.d/default.conf <<NGINXCONF
server {
    listen 80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'Setting up SSL...';
        add_header Content-Type text/plain;
    }
}
NGINXCONF

# 4. 기존 컨테이너 정리 후 nginx만 시작
echo "### 기존 컨테이너 정리 ..."
docker compose down 2>/dev/null || true

echo "### nginx 시작 (HTTP only) ..."
docker compose up -d --no-deps nginx
sleep 3

# 5. ACME challenge 경로 테스트
echo "### ACME challenge 경로 테스트 ..."
mkdir -p "$data_path/www/.well-known/acme-challenge"
echo "test-ok" > "$data_path/www/.well-known/acme-challenge/test-file"
TEST_RESULT=$(curl -s http://localhost/.well-known/acme-challenge/test-file)
rm -f "$data_path/www/.well-known/acme-challenge/test-file"

if [ "$TEST_RESULT" != "test-ok" ]; then
  echo "Error: ACME challenge 경로 테스트 실패 (응답: $TEST_RESULT)"
  echo "nginx 로그를 확인하세요: docker compose logs nginx"
  exit 1
fi
echo "### ACME challenge 경로 테스트 성공!"

# 6. 인증서 발급
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

# 7. HTTPS nginx 설정으로 전환
echo "### HTTPS nginx 설정 생성 ..."
cat > ./nginx/conf.d/default.conf <<NGINXCONF
server {
    listen 80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 10M;

    location /grafana/ {
        proxy_pass http://grafana:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /api/ {
        proxy_pass http://backend:8081/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Prefix /api;
    }
}
NGINXCONF

# 8. 전체 스택 시작
echo "### 전체 스택 시작 (HTTPS) ..."
docker compose up --force-recreate -d

# (선택) 모니터링 스택도 함께 기동
if [ "$enable_monitoring" = "1" ] && [ -f "./docker-compose.monitoring.yml" ]; then
  echo "### 모니터링 스택 시작 ..."
  docker compose -f docker-compose.monitoring.yml up -d
fi

echo ""
echo "=== 완료! $DOMAIN HTTPS 설정이 완료되었습니다 ==="
echo "=== https://$DOMAIN 으로 접속해보세요 ==="
