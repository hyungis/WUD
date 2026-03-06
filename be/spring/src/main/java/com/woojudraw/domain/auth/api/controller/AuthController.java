package com.woojudraw.domain.auth.api.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestHeader;

import com.woojudraw.domain.auth.api.dto.req.LoginReq;
import com.woojudraw.domain.auth.api.dto.req.SignupReq;
import com.woojudraw.domain.auth.api.dto.resp.LoginResp;
import com.woojudraw.domain.auth.application.AuthService;
import com.woojudraw.global.exception.BusinessException;
import com.woojudraw.global.exception.ResponseCode;
import com.woojudraw.global.response.ApiResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/auth")
public class AuthController {

	private static final String BEARER_PREFIX = "Bearer ";

	private final AuthService authService;

	@PostMapping("/signup")
	public ApiResponse<Void> signup(@Valid @RequestBody SignupReq req) {
		authService.signup(req);
		return ApiResponse.ok();
	}

	@PostMapping("/login")
	public ApiResponse<LoginResp> login(@Valid @RequestBody LoginReq req) {
		return ApiResponse.ok(authService.login(req));
	}

	@PostMapping("/logout")
	public ApiResponse<Void> logout(@RequestHeader(name = "Authorization", required = false) String authorization) {
		authService.logout(extractAccessToken(authorization));
		return ApiResponse.ok();
	}

	private String extractAccessToken(String authorization) {
		if (authorization == null || authorization.isBlank()) {
			throw new BusinessException(ResponseCode.TOKEN_MISSING);
		}

		if (!authorization.startsWith(BEARER_PREFIX) || authorization.length() <= BEARER_PREFIX.length()) {
			throw new BusinessException(ResponseCode.INVALID_TOKEN);
		}

		return authorization.substring(BEARER_PREFIX.length());
	}
}
