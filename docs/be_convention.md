# Backend Package Structure Guide

## 1. Base Package

백엔드의 최상위 패키지는 다음과 같이 구성한다.

```
com.woojudraw
```

예시

```
src/main/java/com/woojudraw
 ├ WoojudrawApplication.java
 ├ domain
 └ global
```

---

# 2. Package Structure Overview

프로젝트는 **DDD 스타일 기반의 Layered Architecture**로 구성한다.

```
com.woojudraw
 ├ domain
 │   └ {domain}
 │       ├ api
 │       │   ├ controller
 │       │   └ dto
 │       │       ├ req
 │       │       └ resp
 │       │
 │       ├ application
 │       │   ├ {Domain}Service
 │       │   └ impl
 │       │       └ {Domain}ServiceImpl
 │       │
 │       ├ entity
 │       │   └ {Domain}
 │       │
 │       └ repository
 │           └ {Domain}Repository
 │
 └ global
     ├ config
     ├ exception
     ├ api
     │   └ response
     └ util
```

---

# 3. Domain Layer

각 비즈니스 기능은 `domain` 하위에 위치한다.

예시

```
domain
 ├ auth
 ├ member
 ├ dailies
 ├ deep
 ├ image
 └ constellation
```

각 도메인은 다음과 같은 내부 구조를 가진다.

```
domain/member
 ├ api
 │   ├ controller
 │   │   └ MemberController
 │   │
 │   └ dto
 │       ├ req
 │       │   └ MemberCreateReq
 │       │
 │       └ resp
 │           └ MemberResponse
 │
 ├ application
 │   ├ MemberService
 │   │
 │   └ impl
 │       └ MemberServiceImpl
 │
 ├ entity
 │   └ Member
 │
 └ repository
     └ MemberRepository
```

---

# 4. Layer Responsibilities

## 4.1 api layer

외부 요청을 처리하는 계층이다.

```
api
 ├ controller
 └ dto
```

### controller

* HTTP 요청 처리
* Request DTO → Service 전달
* Service 결과 → Response DTO 반환

예시

```
MemberController
AuthController
DailyController
```

### dto

요청 및 응답 데이터 객체

```
dto
 ├ req
 └ resp
```

예시

```
CreateMemberReq
LoginReq
MemberResponse
```

---

## 4.2 application layer

비즈니스 로직을 처리하는 계층이다.

```
application
 ├ Service Interface
 └ impl
```

구조

```
MemberService
MemberServiceImpl
```

역할

* 비즈니스 로직 수행
* Repository 호출
* Entity 생성 / 수정
* Transaction 관리

---

## 4.3 entity layer

JPA Entity를 관리하는 계층이다.

```
entity
```

예시

```
Member
Daily
Constellation
DeepAnswer
Image
```

역할

* DB 테이블 매핑
* 도메인 상태 관리

---

## 4.4 repository layer

데이터 접근 계층이다.

```
repository
```

예시

```
MemberRepository
DailyRepository
ImageRepository
```

역할

* JPA Repository 정의
* 데이터 조회 / 저장

---

# 5. Global Package

프로젝트 전반에서 사용하는 공통 기능을 관리한다.

```
global
 ├ config
 ├ exception
 ├ api
 │   └ response
 └ util
```

## config

Spring 설정 관리

예시

```
SecurityConfig
JpaConfig
RedisConfig
RabbitMQConfig
CorsConfig
```

---

## exception

전역 예외 처리

예시

```
GlobalExceptionHandler
BusinessException
ErrorCode
```

---

## api/response

공통 API 응답 구조

예시

```
ApiResponse<T>
```

---

## util

공통 유틸리티

예시

```
JwtUtil
DateUtil
CookieUtil
```

---

# 6. Naming Convention

| Component    | Naming Rule           |
| ------------ | --------------------- |
| Controller   | `{Domain}Controller`  |
| Service      | `{Domain}Service`     |
| Service Impl | `{Domain}ServiceImpl` |
| Repository   | `{Domain}Repository`  |
| Entity       | `{Domain}`            |
| Request DTO  | `{Action}{Domain}Req` |
| Response DTO | `{Domain}Resp`        |

---

# 7. Example Domain Structure

예시: Member Domain

```
domain/member
 ├ api
 │   ├ controller
 │   │   └ MemberController
 │   └ dto
 │       ├ req
 │       │   └ SignupMemberReq
 │       └ resp
 │           └ MemberProfileResp
 │
 ├ application
 │   ├ MemberService
 │   └ impl
 │       └ MemberServiceImpl
 │
 ├ entity
 │   └ Member
 │
 └ repository
     └ MemberRepository
```

---

# 8. Key Principles

1. Controller는 비즈니스 로직을 포함하지 않는다.
2. 모든 비즈니스 로직은 Service Layer에서 처리한다.
3. Entity는 Persistence 모델로 사용한다.
4. Controller ↔ Service 간 데이터 전달은 DTO를 사용한다.
5. Domain 간 직접 의존을 최소화한다.
6. 공통 기능은 global 패키지에 위치한다.


---

# 9. Code Formatting (IntelliJ)

본 프로젝트는 코드 스타일 통일을 위해 **IntelliJ 공통 포맷팅 설정을 사용한다.**

모든 팀원은 동일한 Code Style 설정을 적용해야 한다.

---

## 9.1 Formatter 적용 방법

1. IntelliJ 실행
2. `File → Settings`
3. `Editor → Code Style`
4. 우측 상단 `⚙ → Import Scheme`
5. `IntelliJ IDEA code style XML` 선택
6. 프로젝트에서 제공하는 `code-style.xml` 파일 선택

---

## 9.2 코드 자동 정렬

코드 작성 후 다음 단축키로 자동 포맷팅을 수행한다.

| 기능 | 단축키 |
|-----|------|
| 코드 포맷팅 | `Ctrl + Alt + L` |
| Import 정리 | `Ctrl + Alt + O` |

---

## 9.3 Save 시 자동 포맷팅 (권장)

다음 설정을 활성화하면 저장 시 자동으로 코드가 정렬된다.

1. `Settings → Tools → Actions on Save`
2. 아래 옵션 체크


Reformat code
Optimize imports


---
