# Spring Boot Actuator + Micrometer + Prometheus + Grafana 모니터링 연동 가이드

## 최종 아키텍처

```
Spring Boot (Actuator) → /actuator/prometheus
        ↓
   Prometheus (scrape 15s)
        ↓
   Grafana Dashboard (Spring Boot 2.1 System Monitor)
```

---

## 변경된 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `be/spring/build.gradle` | micrometer-registry-prometheus 의존성 추가 |
| `be/spring/src/main/resources/application.yaml` | management 엔드포인트 설정 추가 |
| `be/spring/src/main/java/.../SecurityConfig.java` | actuator 엔드포인트 Security 허용 |
| `infra/monitoring/prometheus/prometheus.yml` | spring-boot scrape job 추가 |

---

## Step 1. build.gradle — Micrometer 의존성 추가

**문제**: `spring-boot-starter-actuator`는 있었지만 Prometheus 레지스트리가 없어서 `/actuator/prometheus` 엔드포인트가 생성되지 않음

**수정**: `be/spring/build.gradle`

```gradle
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-actuator'
    runtimeOnly 'io.micrometer:micrometer-registry-prometheus'  // 추가
    ...
}
```

---

## Step 2. application.yaml — Actuator 엔드포인트 노출

**문제**: 기본값으로는 `/actuator/health`만 노출되고 `/actuator/prometheus`는 비활성화 상태

**수정**: `be/spring/src/main/resources/application.yaml`

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,prometheus,metrics
  endpoint:
    health:
      show-details: always
    prometheus:
      enabled: true
  metrics:
    export:
      prometheus:
        enabled: true
    tags:
      application: ${spring.application.name}  # Grafana 드롭다운 label용
```

> `tags.application` 이 없으면 Grafana 대시보드의 Application 드롭다운이 비어서 데이터가 표시되지 않음

---

## Step 3. SecurityConfig.java — actuator 경로 허용

**문제**: Spring Security가 `/actuator/prometheus`를 인증 필요 경로로 막아서 `HTTP 401` 응답

**오류 메시지**:
```
wget: server returned error: HTTP/1.1 401
```

**수정**: `be/spring/src/main/java/com/woojudraw/global/config/security/SecurityConfig.java`

```java
private static final String[] PERMIT_ALL = {
    "/health",
    "/actuator/health",
    "/actuator/prometheus",  // 추가
    "/actuator/metrics",     // 추가
    "/swagger-ui/**",
    ...
};
```

---

## Step 4. prometheus.yml — Spring Boot 스크래핑 대상 추가

**문제**: Prometheus가 cAdvisor, Node-Exporter만 수집하고 Spring Boot 앱은 수집하지 않음

**수정**: `infra/monitoring/prometheus/prometheus.yml`

```yaml
scrape_configs:
  - job_name: 'cadvisor'
    ...

  - job_name: 'node-exporter'
    ...

  - job_name: 'spring-boot'        # 추가
    metrics_path: '/actuator/prometheus'
    static_configs:
      - targets: ['backend:8081']
        labels:
          instance: 'woojudraw-backend'
```

---

## Step 5. 배포

```bash
cd /home/ubuntu/S14P21D207/infra

# 백엔드 재빌드 (의존성/설정 변경 반영)
docker compose up -d --build backend

# 모니터링 스택 재시작 (prometheus.yml 변경 반영)
docker compose -f docker-compose.monitoring.yml up -d
```

---

## Step 6. 동작 확인

### Actuator 메트릭 수집 확인
```bash
# curl 없는 컨테이너이므로 wget 사용
docker exec infra-backend-1 wget -qO- http://localhost:8081/actuator/prometheus | head -20
```

정상 응답:
```
# HELP application_ready_time_seconds Time taken for the application to be ready to service requests
# TYPE application_ready_time_seconds gauge
application_ready_time_seconds{...} 15.134
...
```

### Prometheus scrape 상태 확인
```bash
docker exec infra-prometheus-1 wget -qO- "http://localhost:9090/api/v1/targets" \
  | grep -o '"health":"[^"]*"\|"job":"[^"]*"'
```

정상 응답:
```
"job":"spring-boot"
"health":"up"
```

---

## Step 7. Grafana 대시보드 설정

### 데이터소스 확인
**Connections → Data sources** 에서 `prometheus (http://prometheus:9090)` 등록 확인

### 대시보드 임포트
**Dashboards → Import → ID `11378` → Load**

임포트 화면 하단 `DS_PROMETHEUS` 드롭다운에서 **prometheus** 선택 후 Import

---

## 트러블슈팅: `Datasource ${DS_PROMETHEUS} was not found`

**원인**: 대시보드 임포트 시 데이터소스 매핑이 누락됨

**해결**: Grafana API로 JSON 직접 수정

```bash
# 1. Prometheus 데이터소스 UID 확인
docker exec infra-grafana-1 wget -qO- \
  "http://admin:비밀번호@localhost:3000/api/datasources/name/prometheus" \
  | grep -o '"uid":"[^"]*"'

# 2. 대시보드 UID 확인
docker exec infra-grafana-1 wget -qO- \
  "http://admin:비밀번호@localhost:3000/api/search" \
  | grep -o '"uid":"[^"]*"\|"title":"[^"]*"'

# 3. 대시보드 JSON 가져와서 ${DS_PROMETHEUS} 교체 후 저장
docker exec infra-grafana-1 wget -qO- \
  "http://admin:비밀번호@localhost:3000/api/dashboards/uid/[대시보드UID]" \
  | sed 's/\${DS_PROMETHEUS}/[데이터소스UID]/g' > /tmp/dash_raw.json

python3 -c "
import json
with open('/tmp/dash_raw.json') as f:
    data = json.load(f)
output = {'dashboard': data['dashboard'], 'overwrite': True}
print(json.dumps(output))
" > /tmp/dash_post.json

docker cp /tmp/dash_post.json infra-grafana-1:/tmp/dash_post.json
docker exec infra-grafana-1 wget -qO- \
  --post-file=/tmp/dash_post.json \
  --header="Content-Type: application/json" \
  "http://admin:비밀번호@localhost:3000/api/dashboards/db"
```

---

---

## Step 8. Slack 알림 설정 (AlertManager + Grafana)

### 아키텍처

```
Spring Boot (Loki 로그) → Grafana Alert Rule
        ↓
   AlertManager (9093)
        ↓
   Slack DM
```

### 8-1. AlertManager Slack webhook 설정

**파일**: `infra/monitoring/alertmanager/alertmanager.yml`

```yaml
global:
  slack_api_url: 'https://hooks.slack.com/services/...'

route:
  receiver: 'slack'
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 12h

receivers:
  - name: 'slack'
    slack_configs:
      - send_resolved: true
        title: '[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:fire:{{ else }}:white_check_mark:{{ end }}] {{ .CommonAnnotations.summary }}'
        text: |
          {{ range .Alerts }}
          *상태*: {{ .Status }}
          *요약*: {{ .Annotations.summary }}
          *내용*: {{ .Annotations.description }}
          *발생시각*: {{ .StartsAt.Format "2006-01-02 15:04:05" }}
          {{ end }}
```

### 8-2. Grafana Contact Point 등록

1. **Alerting → Contact points → Add contact point**
2. Type: `Slack`
3. Webhook URL: AlertManager Slack Incoming Webhook URL 입력
4. **Test** 클릭 → Slack DM 수신 확인

### 8-3. Grafana Alert Rule 생성 (Loki 기반 ERROR 로그 감지)

1. **Alerting → Alert rules → New alert rule**
2. Data source: `Loki`
3. 쿼리:
   ```logql
   count_over_time({container="infra-backend-1"} |= "ERROR" [1m])
   ```
4. Condition: `IS ABOVE 0`
5. Evaluation interval: `1m`, Pending period: `0s`
6. Contact point: 위에서 등록한 Slack 선택
7. **Save rule and exit**

### 8-4. AlertManager 동작 확인

```bash
# AlertManager 로그 확인 (정상 시)
docker logs infra-alertmanager-1 --tail 20

# 정상 로그:
# msg="Listening on" address=0.0.0.0:9093
# msg="Configuration loaded" file=/etc/alertmanager/alertmanager.yml
```

---

## 트러블슈팅: AlertManager API 401

**원인**: 환경변수 `${GRAFANA_PASSWORD}` 미확장

**해결**: `.env` 파일에서 실제 비밀번호 값 직접 사용

```bash
# 잘못된 예 (환경변수 미확장)
wget -qO- "http://admin:${GRAFANA_PASSWORD}@localhost:3000/..."

# 올바른 예
wget -qO- "http://admin:실제비밀번호@localhost:3000/..."
```

---

## 최종 확인

Grafana 대시보드에서 확인 가능한 지표:

| 지표 | 설명 |
|------|------|
| Uptime | 앱 구동 시간 |
| Heap Used / Non-Heap Used | JVM 메모리 사용률 |
| CPU Usage | 프로세스 CPU 사용률 |
| Load Average | 서버 부하 평균 |
| G1 Eden/Old/Survivor Space | GC 영역별 메모리 |
| HikariCP Pool | DB 커넥션 풀 상태 |
| HTTP Request Rate | 요청량 및 응답 시간 |
