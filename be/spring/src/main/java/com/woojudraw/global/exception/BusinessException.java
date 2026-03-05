package com.woojudraw.global.exception;

public class BusinessException extends RuntimeException{

	private final ResponseCode responseCode;
	private final Object details;

	public BusinessException(ResponseCode responseCode){
		super(responseCode.message());
		this.responseCode = responseCode;
		this.details = null;
	}

	public BusinessException(ResponseCode responseCode, Object details){
		super(responseCode.message());
		this.responseCode = responseCode;
		this.details = details;
	}

	public ResponseCode getResponseCode(){
		return responseCode;
	}

	public Object getDetails(){
		return details;
	}

}
