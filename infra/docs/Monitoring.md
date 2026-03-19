# infra/feat/grafana 작업 정리

브랜치: `infra/feat/grafana`

## 1. 작업 목표

- **모니터링 스택 추가/정상화**
  - Prometheus / Alertmanager / Grafana / Loki / Promtail
  - Node Exporter / cAdvisor 기반 호스트·컨테이너 모니터링
- **도메인 경로로 Grafana 제공**
  - `https://<DOMAIN>/grafana/` 서브패스로 접근
- **(추가) Nginx access log를 Loki로 수집**
  - 도메인 트래픽/에러 분석 기반 마련

---

## 2. 결과(현재 가능한 것)

- **Grafana 접속**: `https://<DOMAIN>/grafana/`
- **Prometheus 타깃 수집**: `cadvisor`, `node-exporter`, `prometheus` (Up)
- **Loki 로그 수집**
  - docker SD 기반 컨테이너 라벨(`service`, `container`)로 로그 조회 가능
  - nginx access log를 `job=nginx`로 Loki에서 조회 가능(추가 작업 반영 시)
- **대시보드**
  - `Node Exporter Full(1860)` Import 후 호스트 지표 확인 가능
  - `instance` 라벨을 `ec2`로 고정해 Quick 패널 매칭 안정화

---

## 3. 주요 변경 사항(파일 단위)

### 3.1 모니터링 스택 신규 추가

- `infra/docker-compose.monitoring.yml`
- `infra/monitoring/prometheus/prometheus.yml`
- `infra/monitoring/prometheus/alert.rules.yml`
- `infra/monitoring/loki/loki.yml`
- `infra/monitoring/promtail/promtail.yml`
- `infra/monitoring/alertmanager/alertmanager.yml`

### 3.2 HTTPS 스크립트/라우팅 보정

- `infra/init-letsencrypt.sh`
  - HTTPS server 블록에 `/grafana/` 프록시 추가
  - Grafana 서브패스에서 리다이렉트 루프 방지:
    - `proxy_pass http://grafana:3000/;` → `proxy_pass http://grafana:3000;`
  - here-doc에서 nginx 변수가 bash에 의해 사라지지 않도록 `\$host` 등 이스케이프 보정
  - (옵션) 모니터링 compose 자동 기동 옵션 추가(`ENABLE_MONITORING`)
  - ACME challenge 테스트 디렉토리 생성 순서 보정

### 3.3 Prometheus 라벨 보정(대시보드 호환)

- `infra/monitoring/prometheus/prometheus.yml`
  - `cadvisor`, `node-exporter` 스크랩 타깃에 `labels.instance: ec2` 추가

### 3.4 Nginx access log → Loki 수집(최소 셋업)

- `infra/docker-compose.yml`
  - nginx에 `./nginx/logs:/var/log/nginx` 마운트 추가
- `infra/docker-compose.monitoring.yml`
  - promtail에 `./nginx/logs:/var/log/nginx:ro` 마운트 추가
- `infra/monitoring/promtail/promtail.yml`
  - `job_name: nginx`로 `/var/log/nginx/access.log` tail 수집 추가

### 3.5 문서/관리

- `infra/README.md`
  - 모니터링 실행/접속 섹션 추가
  - `/grafana/` 라우팅 안내 추가
- `infra/.gitignore`
  - monitoring 런타임 데이터 제외 규칙 보강

---

## 4. 작업 중 발생한 이슈와 해결

### 4.1 Loki 컨테이너가 계속 재시작(Restarting)

- **증상**
  - Loki 최신 이미지에서 config validation 실패 또는 권한 오류로 재시작 루프
- **원인**
  - 최신 Loki에서 structured metadata 관련 기본 검증이 강화되어 schema(v11/boltdb-shipper) 조합에서 오류 발생
  - WAL/compactor 디렉토리 권한 문제(`mkdir /wal` 또는 `/var/loki` permission denied)
- **해결**
  - `limits_config.allow_structured_metadata: false` 설정
  - `ingester.wal.dir`을 `/loki/wal`로 변경
  - `common.path_prefix: /loki`, `compactor.working_directory: /loki/compactor`로 고정

### 4.2 `/grafana/` 접속 시 301 무한 리다이렉트

- **증상**
  - `https://<DOMAIN>/grafana/`가 자기 자신으로 301 반복
- **원인**
  - nginx `proxy_pass http://grafana:3000/;` 형태(끝 슬래시)가 `/grafana/` 프리픽스를 제거(strip)해서 Grafana가 서브패스로 인식하지 못함
- **해결**
  - `proxy_pass http://grafana:3000;` (슬래시 제거)로 URI 유지
  - (추가) `/grafana/` 블록에서 nginx 변수 이스케이프(`\$host` 등) 정리

### 4.3 `.env` 변경했는데 Grafana admin 비밀번호가 안 바뀜

- **원인**
  - `GF_SECURITY_ADMIN_PASSWORD`는 “최초 초기화”에만 적용되고,
    이후에는 `grafana_data` 볼륨(내장 DB)에 저장된 비밀번호가 계속 사용됨
- **해결**
  - `grafana-cli admin reset-admin-password "<새비번>"`로 강제 변경
  - 또는 `docker compose ... down -v`로 볼륨 초기화(데이터 삭제)

### 4.4 Grafana Import에서 “Could not find a valid Grafana.com ID”

- **원인**
  - Grafana 서버가 grafana.com을 조회하지 못하는 네트워크/환경 영향
- **해결**
  - EC2에서 Grafana API로 dashboard JSON을 직접 다운로드 후 Import(JSON 업로드)
  - 예: Node Exporter Full(1860) 다운로드 후 업로드

### 4.5 Node Exporter Full 대시보드 Quick 패널만 N/A

- **원인**
  - Prometheus `instance` 라벨이 `node-exporter:9100`처럼 “서비스명”으로만 잡혀
  - 일부 Quick 패널이 기대하는 값과 매칭이 깨짐
- **해결**
  - `node-exporter`, `cadvisor` 타깃에 `labels.instance: ec2`를 강제로 부여

---

## 5. 커밋 목록(브랜치)

- `b79b9d8` FEAT : 모니터링 스택(Prometheus/Grafana/Loki) 추가
- `891cb78` FIX : init-letsencrypt HTTPS/Grafana 설정 보정
- `705a0a9` FIX : monitoring 데이터 git 제외
- `35d42ae` FEAT : 모니터링 실행/접속 문서 추가
- `ed75bd9` FIX : 이스케이프 추가
- `85d6c86` FIX : grafana 서브패스 proxy_pass 보정
- `fb251b3` FIX : Prometheus instance 라벨(ec2) 고정
- `731c330` FEAT : nginx access log Loki 수집 추가

---

## 6. 다음 작업(권장)

- **nginx access log 포맷 개선(JSON 권장)**
  - `$status`, `$request_time`, `$upstream_response_time` 등을 포함해
    Loki에서 “지연(P95)/에러율/요청량”을 그래프로 만들기 쉬운 형태로 변경
- **백엔드 메트릭 추가(Spring Actuator + Micrometer)**
  - `/actuator/prometheus` 노출 후 Prometheus scrape 대상 추가
  - API 응답시간/에러율/JVM/DB 커넥션 등 “서비스 지표” 대시보드 구성

