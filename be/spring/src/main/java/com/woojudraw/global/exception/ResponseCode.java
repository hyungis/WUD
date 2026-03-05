package com.woojudraw.global.exception;

import org.springframework.http.HttpStatus;

/**
 *
 * [코드 규칙]
 * - Sxxx: 성공
 * - Cxxx: 공통(파라미터/검증/서버오류 등)
 * - Axxx: 인증/인가(JWT 등)
 * - Oxxx: OAuth(구글 로그인 과정)
 * - Uxxx: 사용자
 * - Dxxx: 데일리(기록)
 * - Rxxx: 드로잉(캔버스)
 * - Fxxx: 파일/S3
 * - Ixxx: AI 분석(FastAPI/모델/LLM)
 *
 */
public enum ResponseCode {

	/* =========================================================
	 * SUCCESS
	 * ========================================================= */

	SUCCESS(HttpStatus.OK, "S000", "요청 성공"),
	CREATED(HttpStatus.CREATED, "S001", "생성 성공"),
	NO_CONTENT(HttpStatus.NO_CONTENT, "S002", "처리 성공"),

	/* =========================================================
	 * COMMON
	 * ========================================================= */

	INVALID_REQUEST(HttpStatus.BAD_REQUEST, "C001", "잘못된 요청입니다."),
	VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "C002", "요청 값 검증에 실패했습니다."),
	MISSING_PARAMETER(HttpStatus.BAD_REQUEST, "C003", "필수 파라미터가 누락되었습니다."),
	INVALID_TYPE(HttpStatus.BAD_REQUEST, "C004", "요청 값 타입이 올바르지 않습니다."),
	METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "C005", "지원하지 않는 HTTP Method 입니다."),
	RESOURCE_NOT_FOUND(HttpStatus.NOT_FOUND, "C006", "요청한 리소스를 찾을 수 없습니다."),
	CONFLICT(HttpStatus.CONFLICT, "C007", "요청이 현재 상태와 충돌합니다."),
	TOO_MANY_REQUESTS(HttpStatus.TOO_MANY_REQUESTS, "C008", "요청이 너무 많습니다."),
	INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "C009", "서버 오류가 발생했습니다."),
	MESSAGE_NOT_READABLE(HttpStatus.BAD_REQUEST, "C010", "요청 본문(JSON)을 읽을 수 없습니다."),
	TYPE_MISMATCH(HttpStatus.BAD_REQUEST, "C011", "요청 값 타입이 올바르지 않습니다."),
	UNSUPPORTED_MEDIA_TYPE(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "C012", "지원하지 않는 Content-Type 입니다."),
	//DB
	DB_INTEGRITY_VIOLATION(HttpStatus.CONFLICT, "C020", "데이터 무결성 제약 위반입니다."),
	DATA_ACCESS_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "C021", "데이터 처리 중 오류가 발생했습니다."),
	// EXTERNAL/AI (예: FastAPI)
	EXTERNAL_SERVICE_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "C030", "외부 서비스에 연결할 수 없습니다."),
	EXTERNAL_SERVICE_TIMEOUT(HttpStatus.GATEWAY_TIMEOUT, "C031", "외부 서비스 요청이 시간 초과되었습니다."),


	/* =========================================================
	 * AUTH
	 * ========================================================= */

	UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "A001", "인증이 필요합니다."),
	FORBIDDEN(HttpStatus.FORBIDDEN, "A002", "접근 권한이 없습니다."),
	INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "A003", "토큰이 유효하지 않습니다."),
	EXPIRED_TOKEN(HttpStatus.UNAUTHORIZED, "A004", "토큰이 만료되었습니다."),
	TOKEN_MISSING(HttpStatus.UNAUTHORIZED, "A005", "토큰이 존재하지 않습니다."),
	LOGIN_REQUIRED(HttpStatus.UNAUTHORIZED, "A006", "로그인이 필요합니다."),
	INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "A007", "아이디 또는 비밀번호가 올바르지 않습니다."),
	AUTH_PROCESS_FAILED(HttpStatus.UNAUTHORIZED, "A008", "인증 처리에 실패했습니다."),
	INVALID_LOGIN(HttpStatus.UNAUTHORIZED, "A009", "로그인 정보가 올바르지 않습니다."),

	/* =========================================================
	 * OAUTH
	 * ========================================================= */

	OAUTH_CODE_MISSING(HttpStatus.BAD_REQUEST, "O001", "OAuth 인가 코드가 누락되었습니다."),
	OAUTH_STATE_INVALID(HttpStatus.BAD_REQUEST, "O002", "OAuth state 값이 올바르지 않습니다."),
	OAUTH_TOKEN_EXCHANGE_FAILED(HttpStatus.UNAUTHORIZED, "O003", "OAuth 토큰 발급에 실패했습니다."),
	OAUTH_USERINFO_FAILED(HttpStatus.UNAUTHORIZED, "O004", "OAuth 사용자 정보 조회에 실패했습니다."),
	OAUTH_PROVIDER_NOT_SUPPORTED(HttpStatus.BAD_REQUEST, "O005", "지원하지 않는 OAuth Provider 입니다."),
	OAUTH_EMAIL_NOT_FOUND(HttpStatus.BAD_REQUEST, "O006", "OAuth 사용자 이메일을 찾을 수 없습니다."),
	OAUTH_ALREADY_LINKED(HttpStatus.CONFLICT, "O007", "이미 연결된 OAuth 계정입니다."),
	OAUTH_LOGIN_FAILED(HttpStatus.UNAUTHORIZED, "O008", "OAuth 로그인에 실패했습니다."),

	/* =========================================================
	 * USER
	 * ========================================================= */

	USER_NOT_FOUND(HttpStatus.NOT_FOUND, "U001", "사용자를 찾을 수 없습니다."),
	USER_ALREADY_EXISTS(HttpStatus.CONFLICT, "U002", "이미 존재하는 사용자입니다."),
	EMAIL_ALREADY_EXISTS(HttpStatus.CONFLICT, "U003", "이미 사용 중인 이메일입니다."),
	NICKNAME_ALREADY_EXISTS(HttpStatus.CONFLICT, "U004", "이미 사용 중인 닉네임입니다."),
	INVALID_PASSWORD(HttpStatus.BAD_REQUEST, "U005", "비밀번호 형식이 올바르지 않습니다."),
	USER_DELETED(HttpStatus.FORBIDDEN, "U006", "탈퇴한 사용자입니다."),
	USER_SUSPENDED(HttpStatus.FORBIDDEN, "U007", "정지된 사용자입니다."),
	USER_UPDATE_FAILED(HttpStatus.CONFLICT, "U008", "사용자 정보 수정에 실패했습니다."),
	DUPLICATE_EMAIL(HttpStatus.CONFLICT, "U009", "이미 사용 중인 이메일입니다."),

	/* =========================================================
	 * DAILY
	 * ========================================================= */

	DAILY_NOT_FOUND(HttpStatus.NOT_FOUND, "D001", "데일리를 찾을 수 없습니다."),
	DAILY_ALREADY_EXISTS(HttpStatus.CONFLICT, "D002", "이미 작성된 데일리입니다."),
	DAILY_TYPE_INVALID(HttpStatus.BAD_REQUEST, "D003", "유효하지 않은 데일리 타입입니다."),
	DAILY_DATE_INVALID(HttpStatus.BAD_REQUEST, "D004", "유효하지 않은 날짜입니다."),
	DAILY_ACCESS_DENIED(HttpStatus.FORBIDDEN, "D005", "데일리에 접근할 권한이 없습니다."),
	DAILY_CONTENT_TOO_LONG(HttpStatus.BAD_REQUEST, "D006", "데일리 내용이 너무 깁니다."),
	DAILY_UPDATE_NOT_ALLOWED(HttpStatus.CONFLICT, "D007", "현재 상태에서는 수정할 수 없습니다."),
	DAILY_DELETE_NOT_ALLOWED(HttpStatus.CONFLICT, "D008", "현재 상태에서는 삭제할 수 없습니다."),

	/* =========================================================
	 * DRAWING
	 * ========================================================= */

	DRAWING_NOT_FOUND(HttpStatus.NOT_FOUND, "R001", "드로잉 데이터를 찾을 수 없습니다."),
	DRAWING_ACCESS_DENIED(HttpStatus.FORBIDDEN, "R002", "드로잉 데이터에 접근할 권한이 없습니다."),
	DRAWING_FORMAT_INVALID(HttpStatus.BAD_REQUEST, "R003", "드로잉 데이터 형식이 올바르지 않습니다."),
	DRAWING_TOO_LARGE(HttpStatus.PAYLOAD_TOO_LARGE, "R004", "드로잉 데이터 용량이 너무 큽니다."),
	DRAWING_SAVE_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "R005", "드로잉 저장에 실패했습니다."),

	/* =========================================================
	 * FILE / S3
	 * ========================================================= */

	FILE_MISSING(HttpStatus.BAD_REQUEST, "F001", "업로드 파일이 존재하지 않습니다."),
	FILE_TYPE_NOT_ALLOWED(HttpStatus.BAD_REQUEST, "F002", "허용되지 않는 파일 형식입니다."),
	FILE_TOO_LARGE(HttpStatus.PAYLOAD_TOO_LARGE, "F003", "파일 용량이 너무 큽니다."),
	FILE_UPLOAD_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "F004", "파일 업로드에 실패했습니다."),
	FILE_NOT_FOUND(HttpStatus.NOT_FOUND, "F005", "파일을 찾을 수 없습니다."),
	FILE_ACCESS_DENIED(HttpStatus.FORBIDDEN, "F006", "파일 접근 권한이 없습니다."),

	/* =========================================================
	 * AI
	 * ========================================================= */

	AI_REQUEST_INVALID(HttpStatus.BAD_REQUEST, "I001", "AI 분석 요청 값이 올바르지 않습니다."),
	AI_SERVER_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "I002", "AI 서버에 연결할 수 없습니다."),
	AI_TIMEOUT(HttpStatus.GATEWAY_TIMEOUT, "I003", "AI 분석 요청이 시간 초과되었습니다."),
	AI_ANALYSIS_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "I004", "AI 분석에 실패했습니다."),
	AI_RESPONSE_INVALID(HttpStatus.INTERNAL_SERVER_ERROR, "I005", "AI 서버 응답 형식이 올바르지 않습니다."),
	AI_IMAGE_REQUIRED(HttpStatus.BAD_REQUEST, "I006", "AI 분석에 필요한 이미지가 없습니다."),
	AI_IMAGE_TOO_LARGE(HttpStatus.PAYLOAD_TOO_LARGE, "I007", "AI 분석 이미지 용량이 너무 큽니다."),
	AI_MODEL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "I008", "AI 모델 처리 중 오류가 발생했습니다."),
	AI_RATE_LIMITED(HttpStatus.TOO_MANY_REQUESTS, "I009", "AI 요청이 너무 많습니다.");

	private final HttpStatus httpStatus;
	private final String code;
	private final String message;

	ResponseCode(HttpStatus httpStatus, String code, String message){
		this.httpStatus = httpStatus;
		this.code = code;
		this.message = message;
	}

	public HttpStatus httpStatus(){
		return httpStatus;
	}
	public String code() {
		return code;
	}
	public String message() {
		return message;
	}

}
