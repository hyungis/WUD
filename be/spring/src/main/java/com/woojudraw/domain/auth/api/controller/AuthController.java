package com.woojudraw.domain.auth.api.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.woojudraw.domain.auth.api.dto.req.LoginReq;
import com.woojudraw.domain.auth.api.dto.req.SignupReq;
import com.woojudraw.domain.auth.api.dto.resp.LoginResp;
import com.woojudraw.domain.auth.application.AuthService;
import com.woojudraw.global.response.ApiResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/auth")
public class AuthController {

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
}