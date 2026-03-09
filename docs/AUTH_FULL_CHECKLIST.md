# AUTH FULL CHECKLIST (프론트-백엔드 연동 점검)

기준 일시: 2026-03-09
기준 브랜치: `chore/auth-flow-full-check`
검증 범위: `fe`, `docs` (백엔드 파일 미수정)

## 1) 현재 백엔드 인증 API 스펙(코드 기준)

확인 파일:
- `be/spring/src/main/java/com/woojudraw/domain/auth/api/controller/AuthController.java`
- `be/spring/src/main/java/com/woojudraw/domain/auth/api/dto/req/LoginReq.java`
- `be/spring/src/main/java/com/woojudraw/domain/auth/api/dto/req/SignupReq.java`
- `be/spring/src/main/java/com/woojudraw/domain/auth/api/dto/resp/LoginResp.java`
- `be/spring/src/main/resources/application.yaml`

확정 스펙:
- `POST /auth/signup`
: 요청 바디 `email`, `password`, `nickname` 필수. 응답 `ApiResponse<Void>`.
- `POST /auth/login`
: 요청 바디 `email`, `password` 필수. 응답 `ApiResponse<LoginResp>`.
: `LoginResp = { accessToken, refreshToken, expiresInSec }`.
- `POST /auth/logout`
: 요청 바디 없음. `Authorization: Bearer <accessToken>` 헤더 필요. 응답 `ApiResponse<Void>`.

백엔드에서 현재 확인되지 않은 엔드포인트:
- `/auth/oauth/google/token`
- `/auth/oauth/providers`
- `/auth/refresh`
- `/users/me`

## 2) 프론트 인증 흐름 연결 상태

### 동작 가능(코드 기준)
- 이메일/비밀번호 회원가입
: `SignupPage -> services/auth.register -> api/auth.signup -> POST /auth/signup` 경로로 연결됨.
- 이메일/비밀번호 로그인
: `LoginPage -> services/auth.login -> api/auth.login -> POST /auth/login` 경로로 연결됨.
- 로그인 후 보호 라우트 접근
: 로그인 성공 시 토큰 저장 후 `isAuthenticated`가 true로 반영되어 `PrivateRoute` 통과 가능.
- 로그아웃
: `services/auth.logout -> api/auth.logout -> POST /auth/logout` (헤더 기반)으로 정렬됨.

### 현재 불가능/제한됨(코드 기준)
- Google OAuth 로그인/회원가입
: 백엔드 OAuth 인증 API가 없어 실제 인증 완료 불가.
- 토큰 재발급(Refresh)
: 백엔드 `/auth/refresh` 부재로 자동 재발급 플로우 불가.
- 내 프로필 조회(fetchMe)
: `/users/me` 엔드포인트 미확인으로 현재 호출 시 실패 가능.

## 3) 이번 업데이트로 반영한 프론트 수정

- `fe/src/api/axios.ts`
: 기본 API URL을 `http://localhost:8081`로 정렬.
: 토큰 조회 키를 스토어와 동일한 `tokenStorage` 기반으로 통일.
- `fe/src/store/authStore.ts`
: 초기 `isAuthenticated` 계산 오류 수정(`!!initialAccessToken`).
- `fe/src/types/api.ts`
: 백엔드 `ApiResponse.error` 구조를 타입에 반영.
- `fe/src/types/auth.ts`
: 로그인/회원가입 요청 필수값 및 로그인 응답 구조를 백엔드 DTO와 일치시킴.
- `fe/src/api/auth.ts`
: 현재 구현된 백엔드 인증 API만 남기고 호출 시그니처 정렬.
- `fe/src/services/auth.ts`
: 로그인 응답 파싱을 실제 백엔드 응답(`accessToken`, `refreshToken`) 기준으로 수정.
: 로그아웃 요청을 헤더 기반 바디 없음으로 수정.
: 공통 에러 메시지 추출 로직 추가.
- `fe/src/features/auth/LoginPage.tsx`
: 로그인 시 토큰이 실제 저장되도록 호출 정리.
: Google 버튼 임시 외부 이동 제거, 미구현 안내 메시지로 변경.
- `fe/src/features/auth/SignupPage.tsx`
: Google 버튼 임시 외부 이동 제거, 미구현 안내 메시지로 변경.

## 4) 백엔드 미구현/미가동 항목 우회안

### A. Google OAuth 프론트 모킹
- 개발 모드 플래그 예시: `VITE_AUTH_MOCK_OAUTH=true`.
- 버튼 클릭 시 실제 OAuth 대신 mock 토큰/유저를 주입:
: `useAuthStore.setTokens("mock-access", "mock-refresh")`
: `useAuthStore.setUser({ email: "mock@local" })`
- 목적: 화면 전환/가드/후속 페이지 QA를 백엔드 없이 진행.

### B. Refresh 미구현 우회
- 만료 테스트가 필요한 경우 mock 인터셉터에서 401 발생 시 강제 재로그인 UX로 처리.
- 운영 전에는 반드시 `/auth/refresh` 구현 후 재활성화.

### C. fetchMe 우회
- 로그인 직후 email 기반 최소 사용자 상태를 저장해 UI 깨짐 방지.
- 백엔드 `GET /users/me` 구현 시 즉시 교체.

## 5) 최종 판정

- 이메일 로그인/회원가입/로그아웃: 프론트 코드 기준 연동 가능 상태.
- Google OAuth/Refresh/Profile: 백엔드 스펙 미구현으로 현재 연동 불가.
- 테스트/데모 진행 시에는 모킹 플래그 기반 우회 전략 적용 권장.
