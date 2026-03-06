package com.woojudraw.domain.deep.api.controller;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.woojudraw.domain.deep.api.dto.req.CreateDeepSessionReq;
import com.woojudraw.domain.deep.api.dto.req.SubmitHtpReq;
import com.woojudraw.domain.deep.api.dto.req.SubmitWho5Req;
import com.woojudraw.domain.deep.api.dto.resp.CreateDeepSessionResp;
import com.woojudraw.domain.deep.api.dto.resp.SubmitHtpResp;
import com.woojudraw.domain.deep.api.dto.resp.SubmitWho5Resp;
import com.woojudraw.domain.deep.application.DeepSessionService;
import com.woojudraw.global.response.ApiResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/deep-sessions")
@RequiredArgsConstructor
public class DeepSessionController {

	private final DeepSessionService deepSessionService;

	@PostMapping
	public ApiResponse<CreateDeepSessionResp> createDeepSession(
		@RequestBody(required=false)CreateDeepSessionReq request
	){
		//TODO: 인증 붙으면 로그인 유저 정보에서 꺼내기
		Long userId = 1L;

		CreateDeepSessionReq actualRequest = (request == null) ? new CreateDeepSessionReq() : request;
		CreateDeepSessionResp response = deepSessionService.createDeepSession(userId, actualRequest);

		return ApiResponse.ok(response);
	}

	@PostMapping("/{sessionId}/psych-assessments/who5")
	public ApiResponse<SubmitWho5Resp> submitWho5(
		@PathVariable Long sessionId,
		@Valid @RequestBody SubmitWho5Req request
	){
		Long userId = 1L;
		SubmitWho5Resp response = deepSessionService.submitWho5(userId, sessionId, request);
		return ApiResponse.ok(response);
	}

	@PostMapping("/{sessionId}/submissions/htp")
	public ApiResponse<SubmitHtpResp> submitHtp(
		@PathVariable Long sessionId,
		@Valid @RequestBody SubmitHtpReq request
	){
		Long userId = 1L;
		SubmitHtpResp response = deepSessionService.submitHtp(userId, sessionId, request);
		return ApiResponse.ok(response);
	}
}
