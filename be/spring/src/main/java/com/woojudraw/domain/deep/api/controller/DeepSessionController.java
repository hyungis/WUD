package com.woojudraw.domain.deep.api.controller;

import org.springframework.security.core.Authentication;
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
import com.woojudraw.global.exception.BusinessException;
import com.woojudraw.global.exception.ResponseCode;
import com.woojudraw.global.response.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/deep-sessions")
@RequiredArgsConstructor
public class DeepSessionController {

	private final DeepSessionService deepSessionService;

	@PostMapping
	@Operation(security = @SecurityRequirement(name = "bearerAuth"))
	public ApiResponse<CreateDeepSessionResp> createDeepSession(
			Authentication authentication,
			@RequestBody(required = false) CreateDeepSessionReq request) {
		Long userId = resolveMemberId(authentication);

		CreateDeepSessionReq actualRequest = (request == null) ? new CreateDeepSessionReq() : request;
		CreateDeepSessionResp response = deepSessionService.createDeepSession(userId, actualRequest);

		return ApiResponse.ok(response);
	}

	@PostMapping("/{sessionId}/psych-assessments/who5")
	@Operation(security = @SecurityRequirement(name = "bearerAuth"))
	public ApiResponse<SubmitWho5Resp> submitWho5(
			Authentication authentication,
			@PathVariable Long sessionId,
			@Valid @RequestBody SubmitWho5Req request) {
		Long userId = resolveMemberId(authentication);
		SubmitWho5Resp response = deepSessionService.submitWho5(userId, sessionId, request);
		return ApiResponse.ok(response);
	}

	@PostMapping("/{sessionId}/submissions/htp")
	@Operation(security = @SecurityRequirement(name = "bearerAuth"))
	public ApiResponse<SubmitHtpResp> submitHtp(
			Authentication authentication,
			@PathVariable Long sessionId,
			@Valid @RequestBody SubmitHtpReq request) {
		Long userId = resolveMemberId(authentication);
		SubmitHtpResp response = deepSessionService.submitHtp(userId, sessionId, request);
		return ApiResponse.ok(response);
	}

	private Long resolveMemberId(Authentication authentication) {
		if (authentication == null || !(authentication.getPrincipal() instanceof Long memberId)) {
			throw new BusinessException(ResponseCode.LOGIN_REQUIRED);
		}
		return memberId;
	}
}
