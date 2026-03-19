package com.woojudraw.global.exception;

import com.woojudraw.global.response.ApiResponse;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

/**
 * GlobalExceptionHandler 구성 원칙
 *
 * 1) BusinessException (의도된 비즈니스 에러) -> ResponseCode 그대로 내려줌
 * 2) Validation/Binding/Parsing 등 요청 문제 -> 400 계열로 통일
 * 3) DB 무결성/DB 접근 -> 409 or 500
 * 4) 스프링 기본 예외들(Method/MediaType/TypeMismatch) 추가
 * 5) 마지막에 Exception으로 500 처리
 *
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

	/* =========================================================
	 * 1) 비즈니스 예외 (서비스에서 의도적으로 던짐)
	 * ========================================================= */
	@ExceptionHandler(BusinessException.class)
	public ResponseEntity<ApiResponse<Void>> handleBusiness(BusinessException e) {
		ResponseCode rc = e.getResponseCode();
		return ResponseEntity
			.status(rc.httpStatus())
			.body(ApiResponse.fail(rc.code(), rc.message(), e.getDetails()));
	}

	/* =========================================================
	 * 2) Validation(@Valid) / Binding 에러
	 * ========================================================= */
	@ExceptionHandler({MethodArgumentNotValidException.class, BindException.class})
	public ResponseEntity<ApiResponse<Void>> handleValidation(Exception e) {
		Map<String, String> fieldErrors = new HashMap<>();

		var bindingResult = (e instanceof MethodArgumentNotValidException manv)
			? manv.getBindingResult()
			: ((BindException) e).getBindingResult();

		bindingResult.getFieldErrors().forEach(fe ->
			fieldErrors.put(fe.getField(), fe.getDefaultMessage())
		);

		ResponseCode rc = ResponseCode.VALIDATION_FAILED;
		return ResponseEntity
			.status(rc.httpStatus())
			.body(ApiResponse.fail(rc.code(), rc.message(), fieldErrors));
	}

	/* =========================================================
	 * 3) PathVariable/RequestParam 타입 변환 실패
	 *  ex) /users/abc (Long 자리에 String)
	 * ========================================================= */
	@ExceptionHandler({MethodArgumentTypeMismatchException.class})
	public ResponseEntity<ApiResponse<Void>> handleTypeMismatch(MethodArgumentTypeMismatchException e) {
		ResponseCode rc = ResponseCode.TYPE_MISMATCH;

		Map<String, Object> details = Map.of(
			"param", e.getName(),
			"value", e.getValue()
		);

		return ResponseEntity
			.status(rc.httpStatus())
			.body(ApiResponse.fail(rc.code(), rc.message(), details));
	}

	/* =========================================================
	 * 4) JSON 파싱 실패 / Body 읽기 실패
	 * ========================================================= */
	@ExceptionHandler(HttpMessageNotReadableException.class)
	public ResponseEntity<ApiResponse<Void>> handleNotReadable(HttpMessageNotReadableException e) {
		ResponseCode rc = ResponseCode.MESSAGE_NOT_READABLE;
		return ResponseEntity
			.status(rc.httpStatus())
			.body(ApiResponse.fail(rc.code(), rc.message(), null));
	}

	/* =========================================================
	 * 5) 지원하지 않는 HTTP Method
	 * ========================================================= */
	@ExceptionHandler(HttpRequestMethodNotSupportedException.class)
	public ResponseEntity<ApiResponse<Void>> handleMethodNotAllowed(HttpRequestMethodNotSupportedException e) {
		ResponseCode rc = ResponseCode.METHOD_NOT_ALLOWED;
		return ResponseEntity
			.status(rc.httpStatus())
			.body(ApiResponse.fail(rc.code(), rc.message(), null));
	}

	/* =========================================================
	 * 6) 지원하지 않는 Content-Type
	 * ========================================================= */
	@ExceptionHandler(HttpMediaTypeNotSupportedException.class)
	public ResponseEntity<ApiResponse<Void>> handleUnsupportedMediaType(HttpMediaTypeNotSupportedException e) {
		ResponseCode rc = ResponseCode.UNSUPPORTED_MEDIA_TYPE;
		return ResponseEntity
			.status(rc.httpStatus())
			.body(ApiResponse.fail(rc.code(), rc.message(), null));
	}

	/* =========================================================
	 * 7) DB 무결성(UNIQUE/FK 등) 위반 -> 보통 409
	 * ========================================================= */
	@ExceptionHandler(DataIntegrityViolationException.class)
	public ResponseEntity<ApiResponse<Void>> handleIntegrityViolation(DataIntegrityViolationException e) {
		ResponseCode rc = ResponseCode.DB_INTEGRITY_VIOLATION;
		return ResponseEntity
			.status(rc.httpStatus())
			.body(ApiResponse.fail(rc.code(), rc.message(), null));
	}

	/* =========================================================
	 * 8) DB 접근 오류 전체 -> 보통 500
	 * ========================================================= */
	@ExceptionHandler(DataAccessException.class)
	public ResponseEntity<ApiResponse<Void>> handleDataAccess(DataAccessException e) {
		ResponseCode rc = ResponseCode.DATA_ACCESS_ERROR;
		return ResponseEntity
			.status(rc.httpStatus())
			.body(ApiResponse.fail(rc.code(), rc.message(), null));
	}

	/* =========================================================
	 * 9) 예상 못한 에러 -> 500
	 * ========================================================= */
	@ExceptionHandler(Exception.class)
	public ResponseEntity<ApiResponse<Void>> handleUnexpected(Exception e) {
		ResponseCode rc = ResponseCode.INTERNAL_ERROR;
		return ResponseEntity
			.status(rc.httpStatus())
			.body(ApiResponse.fail(rc.code(), rc.message(), null));
	}
}