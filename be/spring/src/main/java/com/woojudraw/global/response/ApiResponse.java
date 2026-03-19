package com.woojudraw.global.response;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * [성공 응답]
 *  - success=true
 *  - data 존재
 *
 * [실패 응답]
 *  - success=false
 *  - error 존재(code/message/details)
 *
 * Controller는 성공 시:
 *   return ApiResponse.ok(data);
 *
 */

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(
	boolean success,
	T data,
	ErrorBody error
) {

	/** 성공(데이터 있음) **/
	public static <T> ApiResponse<T> ok(T data){
		return new ApiResponse<>(true, data, null);
	}

	/** 성공(데이터 없음) **/
	public static ApiResponse<Void> ok(){
		return new ApiResponse<>(true, null, null);
	}

	/** 실패(에러 응담) - 전역 예외 처리기에서 사용 **/
	public static ApiResponse<Void> fail(String code, String message, Object details){
		return new ApiResponse<>(false, null, new ErrorBody(code, message, details));
	}


	@JsonInclude(JsonInclude.Include.NON_NULL)
	public record ErrorBody(
		String code,
		String message,
		Object details
	){}

}
