## infra 폴더에서 Docker 실행 가이드

이 문서는 `infra` 폴더에 있는 `docker-compose.yml`로 전체 서비스를 실행하는 방법을 정리한 것입니다.

### 1. 사전 준비

- **Docker / Docker Desktop**이 설치되어 있어야 합니다.
- 프로젝트 구조(중요 부분)  
  - `infra/docker-compose.yml`  
  - `infra/.env` (선택, 공통 환경 변수)  
  - `ai/.env` (`ai` 서비스 전용 환경 변수 – compose에서 `../ai/.env`로 참조)  

환경 변수 사용 규칙:

- `backend`, `redis`, `rabbitmq`, `frontend` 서비스는
  - `infra` 폴더에서 실행 시 `infra/.env` 파일이 있다면 이 파일을 자동으로 사용합니다.
  - 또는 시스템(호스트) 환경 변수에서 값을 읽습니다.
- `ai` 서비스는 `env_file: ../ai/.env` 설정으로 `ai` 폴더 안의 `.env`를 사용합니다.

### 2. 실행 위치

아래 명령들은 **프로젝트 루트가 아니라 `infra` 폴더에서** 실행한다고 가정합니다.

```bash
cd infra
```

Windows PowerShell에서도 동일하게:

```powershell
cd infra
```

### 3. 컨테이너 빌드 & 실행

#### 3-1. 백그라운드(detached) 실행

```bash
docker compose up -d --build
```

- **역할**
  - `be/spring`의 `Dockerfile`로 `backend` 이미지를 빌드
  - `fe`의 `Dockerfile`로 `frontend` 이미지를 빌드
  - `ai`의 `Dockerfile`로 `ai` 이미지를 빌드
  - `redis`, `rabbitmq` 컨테이너 생성 및 실행
- `-d` 옵션: 백그라운드로 컨테이너 실행
- `--build` 옵션: 변경 사항이 있을 경우 이미지를 다시 빌드

#### 3-2. 포그라운드 실행 (로그 실시간 확인)

```bash
docker compose up --build
```

- 터미널에 각 서비스 로그가 실시간으로 출력됩니다.
- 중지하려면 `Ctrl + C` 입력.

### 4. 컨테이너/네트워크 중지 및 정리

#### 4-1. 컨테이너 중지

```bash
docker compose down
```

- `infra/docker-compose.yml`로 띄운 컨테이너와 네트워크(`app-network`)를 종료합니다.

#### 4-2. 볼륨까지 모두 삭제(데이터도 삭제)

**주의: DB 데이터 등 볼륨에 저장된 모든 데이터가 삭제됩니다.**

```bash
docker compose down -v
```

### 5. 로그 확인

특정 서비스 로그만 보고 싶을 때:

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f redis
docker compose logs -f rabbitmq
docker compose logs -f ai
```

- `-f` 옵션: 실시간으로 로그 follow

### 6. 환경 변수 예시

`infra/.env` 예시 (실제 값은 프로젝트 환경에 맞게 설정):

```env
SPRING_DATASOURCE_URL=jdbc:postgresql://your-rds-endpoint:5432/your_db
SPRING_DATASOURCE_USERNAME=your_user
SPRING_DATASOURCE_PASSWORD=your_password
RABBITMQ_USER=admin
RABBITMQ_PASS=admin
```

`ai/.env`는 이미 설정된 값을 그대로 사용하되, 필요한 값이 있다면 같은 형식으로 추가합니다.

### 7. 자주 쓰는 명령 요약

- **빌드 + 백그라운드 실행**  

```bash
cd infra
docker compose up -d --build
```

- **컨테이너 중지 및 정리**  

```bash
cd infra
docker compose down
```

- **특정 서비스 로그 실시간 확인**  

```bash
cd infra
docker compose logs -f backend
```

이 문서를 기반으로 `infra` 폴더에서 언제든지 손쉽게 전체 인프라를 올리고 내릴 수 있습니다.


