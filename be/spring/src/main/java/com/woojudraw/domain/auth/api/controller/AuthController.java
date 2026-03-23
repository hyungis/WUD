package com.woojudraw.domain.auth.api.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.woojudraw.domain.auth.api.dto.req.LoginReq;
import com.woojudraw.domain.auth.api.dto.req.SignupReq;
import com.woojudraw.domain.auth.api.dto.resp.LoginResp;
import com.woojudraw.domain.auth.application.AuthService;
import com.woojudraw.domain.auth.application.dto.IssuedTokens;
import com.woojudraw.global.exception.BusinessException;
import com.woojudraw.global.exception.ResponseCode;
import com.woojudraw.global.response.ApiResponse;
import com.woojudraw.global.security.jwt.RefreshTokenCookieProvider;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/auth")
public class AuthController {

	private static final String BEARER_PREFIX = "Bearer ";

	private final AuthService authService;
	private final RefreshTokenCookieProvider refreshTokenCookieProvider;

	@PostMapping("/signup")
	public ApiResponse<Void> signup(@Valid @RequestBody SignupReq req) {
		authService.signup(req);
		return ApiResponse.ok();
	}

	@PostMapping("/login")
	public ApiResponse<LoginResp> login(@Valid @RequestBody LoginReq req, HttpServletResponse response) {
		IssuedTokens issuedTokens = authService.login(req);
		refreshTokenCookieProvider.addRefreshTokenCookie(
			response,
			issuedTokens.getRefreshToken(),
			issuedTokens.getRefreshTokenExpiresInSec()
		);
		return ApiResponse.ok(toLoginResp(issuedTokens));
	}

	@PostMapping("/refresh")
	public ApiResponse<LoginResp> refresh(HttpServletRequest request, HttpServletResponse response) {
		String refreshToken = refreshTokenCookieProvider.extractRefreshToken(request);
		IssuedTokens issuedTokens = authService.refresh(refreshToken);
		refreshTokenCookieProvider.addRefreshTokenCookie(
			response,
			issuedTokens.getRefreshToken(),
			issuedTokens.getRefreshTokenExpiresInSec()
		);
		return ApiResponse.ok(toLoginResp(issuedTokens));
	}

	@PostMapping("/logout")
	@Operation(security = @SecurityRequirement(name = "bearerAuth"))
	public ApiResponse<Void> logout(HttpServletRequest request, HttpServletResponse response) {
		authService.logout(extractAccessToken(request.getHeader("Authorization")));
		refreshTokenCookieProvider.expireRefreshTokenCookie(response);
		return ApiResponse.ok();
	}

	private LoginResp toLoginResp(IssuedTokens issuedTokens) {
		return LoginResp.builder()
			.accessToken(issuedTokens.getAccessToken())
			.expiresInSec(issuedTokens.getAccessTokenExpiresInSec())
			.tutorialCompleted(issuedTokens.isTutorialCompleted())
			.build();
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
