package com.woojudraw.domain.user.api.controller;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.woojudraw.domain.user.api.dto.resp.GetUserProfileResp;
import com.woojudraw.domain.user.application.UserService;
import com.woojudraw.global.exception.BusinessException;
import com.woojudraw.global.exception.ResponseCode;
import com.woojudraw.global.response.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/users")
public class UserController {
	private final UserService userService;

	@GetMapping("/me")
	@Operation(security = @SecurityRequirement(name = "bearerAuth"))
	public ApiResponse<GetUserProfileResp> getMyProfile(
		Authentication authentication
	){
		GetUserProfileResp response = userService.getUserProfile(resolveMemberId(authentication));
		return ApiResponse.ok(response);
	}

	private Long resolveMemberId(Authentication authentication) {
		if (authentication == null || !(authentication.getPrincipal() instanceof Long memberId)) {
			throw new BusinessException(ResponseCode.LOGIN_REQUIRED);
		}
		return memberId;
	}
}
