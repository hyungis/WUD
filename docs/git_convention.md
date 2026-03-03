# 📚 Git Convention

본 문서는 프로젝트에서 사용하는 **Branch 전략과 Commit Message 규칙**을 정의한다.

---

# 🌿 Branch Strategy

본 프로젝트는 **Frontend / Backend 작업을 구분하되 하나의 개발 브랜치(dev)에서 통합하는 방식**을 사용한다.

프론트엔드와 백엔드 작업 구분을 위해 브랜치 이름에  
**fe / be prefix**를 사용한다.

---

# 📂 Branch Structure


master (또는 main) - 배포 브랜치
dev - 개발 통합 브랜치

feat/fe/*
feat/be/*

fix/fe/*
fix/be/*

hotfix/*
docs/*


---

# 📌 Branch 역할

| 브랜치 | 설명 |
|------|------|
| master | 최종 배포 브랜치 |
| dev | 개발 통합 브랜치 |
| feat | 새로운 기능 개발 |
| fix | 버그 수정 |
| hotfix | 긴급 버그 수정 |
| docs | 문서 작업 |

---

# 🏷 Branch Naming Rule

Frontend와 Backend 작업을 구분하기 위해  
브랜치 이름에 **fe 또는 be**를 포함한다.

### 형식


feat/fe/기능명
feat/be/기능명

fix/fe/이슈명
fix/be/이슈명


### 예시


feat/fe/login-ui
feat/fe/emotion-canvas

feat/be/auth-api
feat/be/drawing-upload

fix/fe/canvas-touch-bug
fix/be/jwt-refresh-error

docs/git-convention
docs/api-spec


---

# 🔄 Branch Workflow

## 1️⃣ dev 브랜치에서 작업 브랜치 생성


git checkout dev
git pull origin dev
git checkout -b feat/fe/기능명


또는


git checkout -b feat/be/기능명


---

## 2️⃣ 기능 개발 진행

---

## 3️⃣ 작업 완료 후 commit


git add .
git commit -m "FEAT : auth/login 로그인 API 구현"


---

## 4️⃣ 원격 저장소 push


git push origin feat/fe/기능명


---

## 5️⃣ Pull Request 생성

- **feature → dev 브랜치로 PR 생성**
- 코드 리뷰 후 merge

---

# 🚨 Branch 규칙

- 직접 **dev 브랜치 push 금지**
- 모든 작업은 **feature 브랜치에서 진행**
- PR을 통해서만 merge
- 코드 리뷰 후 merge

---

# 📝 Commit Convention

## 📌 Commit Type

| Type 키워드 | 사용 시점 |
|-------------|-----------|
| CREATE | 프로젝트 최초 생성 |
| ADD | 새로운 파일 추가 |
| DELETE | 파일 삭제 |
| FEAT | 새로운 기능 추가 / 기존 기능 요구사항에 맞게 수정 |
| FIX | 기능 버그 수정 |
| BUILD | 빌드 관련 수정 |
| CHORE | 패키지 매니저 수정, 기타 설정 수정 (.gitignore 등) |
| DOCS | 문서 수정 |
| STYLE | 코드 스타일, 포맷팅 수정 |
| REFACTOR | 기능 변화 없는 코드 리팩터링 |
| TEST | 테스트 코드 추가 / 수정 |
| RELEASE | 버전 릴리즈 |
| RENAME | 파일 / 폴더 이름 변경 |
| COMMENT | 주석 추가 / 수정 |

---

# 📌 Commit Message 작성 규칙

- Commit Message는 **최대한 구체적으로 작성**
- **영어로 작성**
- **어떤 기능 / 어떤 위치 / 어떤 변경인지 명확하게 작성**

### 작성 형식

TYPE : (위치/기능) + 설명

### 예시


FEAT : auth/login 로그인 API 구현
FEAT : canvas/drawing 감정 드로잉 캔버스 기능 구현

FIX : auth/jwt 토큰 만료 처리 오류 수정
FIX : websocket/connection 소켓 연결 끊김 문제 해결

ADD : common/exception 전역 예외 처리 클래스 추가

REFACTOR : user/service 변수명 및 로직 정리

DOCS : API 명세서 업데이트

STYLE : 코드 포맷팅 수정

COMMENT : login controller 주석 추가
