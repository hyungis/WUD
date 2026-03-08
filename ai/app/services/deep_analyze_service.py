from app.models.schemas import AiAnalyzeReq, AiAnalyzeResp, AiAnalysisData


def analyze_deep_session_request(request: AiAnalyzeReq) -> AiAnalyzeResp:
    """
    심층(HTP, WHO5) 분석 로직 엔트리포인트.
    현재는 Spring Boot와 RabbitMQ 연동 검증을 위한 mock 결과를 반환한다.
    """
    print(f"[FastAPI] Received Deep Analysis Request for Session: {request.sessionId}")
    print(f"[FastAPI] DeepType: {request.deepType}")

    mock_data = AiAnalysisData(
        resultSummary="그림과 설문을 종합해본 결과, 현재 안정적이고 긍정적인 심리 상태를 보이고 있습니다.",
        questions=[
            "최근에 가장 즐거웠던 기억은 무엇인가요?",
            "그림 속 집에서 가장 마음에 드는 공간은 어디인가요?",
        ],
        raw={"yolo_detections": "house: 1, tree: 2, person: 1"},
    )

    return AiAnalyzeResp(
        status="SUCCESS",
        message="분석이 정상적으로 완료되었습니다.",
        data=mock_data,
    )
