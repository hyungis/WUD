# DEEP Async Pipeline

기준 브랜치: `feat/fe/deep-async-pipeline`
기준 범위: `fe`, `docs`

## 1. 시스템 아키텍처

프론트엔드는 아래 순서의 비동기 파이프라인으로 심층 분석을 수행한다.

1. 심층 세션 생성 (`POST /deep-sessions`)
2. WHO-5 설문 제출 (`POST /deep-sessions/{sessionId}/psych-assessments/who5`)
3. 이미지 3종 업로드
: `POST /images/presigned-url` -> S3 `PUT` -> `POST /images`
4. HTP 제출 (`POST /deep-sessions/{sessionId}/submissions` 우선, 실패 시 `/submissions/htp` 호환)
5. 분석 상태 폴링 (`GET /deep-sessions/{sessionId}/status`)
6. DONE 시 상세 결과 조회 (`GET /deep-sessions/{sessionId}/result`)
7. 질문 응답 저장 시도 (`POST /deep-sessions/{sessionId}/answers`)

## 2. API 연동 구현 현황

- 세션 시작: 구현 완료
- WHO-5 제출: 구현 완료
- 심층 콘텐츠 목록/가이드 조회: 구현 완료 (`/deep-tests`, `/deep-tests/{type}/guide`)
- presigned URL 발급/업로드/등록 확정: 구현 완료
- 심층 제출: 구현 완료 (명세 경로 우선 + 백엔드 경로 호환)
- 상태 폴링: 구현 완료 (4초 간격, 최대 30회)
- 결과 상세 조회: 구현 완료
- 질문 응답 저장: 프론트 호출 구현 완료

주의:
- 현재 백엔드 라우팅이 `/submissions/htp`만 제공하는 환경이 있어 호환 경로를 포함했다.
- `/answers`는 서버 미구현일 수 있어 실패 시 사용자에게 안내 메시지를 표시한다.

## 3. 성능/안정성 설계

- 분산 업로드: 이미지 본문은 S3로 직접 전송해 백엔드 트래픽을 절감한다.
- 비동기 분석: 제출 후 폴링으로 상태를 추적해 요청 타임아웃을 피한다.
- 데이터 정합성: `imageId` 3개 확보 후에만 최종 제출을 트리거한다.

## 4. 타입 모델

```ts
interface HtpSubmission {
  houseImageId: number;
  treeImageId: number;
  personImageId: number;
}

type AnalysisStatus = "DRAFT" | "ANALYZING" | "DONE" | "FAILED";

interface AnalysisResult {
  aiResult: {
    resultSummary?: string;
    questions?: string[];
  };
  psychAssessments: Array<{
    testCode: string;
    scoreTotal: number;
  }>;
}
```

## 5. 실무 주의사항

- CORS: S3 버킷 PUT 허용과 `Content-Type` 헤더 허용이 필요하다.
- 폴링 간격: 기본 4초, 과도한 호출 방지를 위해 3~5초 유지 권장.
- 순서 보장: `sessionId` -> `imageId` -> submit -> polling 순서를 엄격히 준수해야 한다.
