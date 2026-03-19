package com.woojudraw.domain.user.api.controller;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.woojudraw.domain.user.api.dto.req.ChangePasswordReq;
import com.woojudraw.domain.user.api.dto.req.UpdateUserProfileReq;
import com.woojudraw.domain.user.api.dto.resp.GetUserProfileResp;
import com.woojudraw.domain.user.application.UserService;
import com.woojudraw.global.exception.BusinessException;
import com.woojudraw.global.exception.ResponseCode;
import com.woojudraw.global.response.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/users")
public class UserController {
	private final UserService userService;

	@GetMapping("/me")
	@Operation(security = @SecurityRequirement(name = "bearerAuth"))
	public ApiResponse<GetUserProfileResp> getMyProfile(
		@Parameter(hidden = true) Authentication authentication
	){
		GetUserProfileResp response = userService.getUserProfile(resolveMemberId(authentication));
		return ApiResponse.ok(response);
	}

	@PutMapping("/me")
	@Operation(security = @SecurityRequirement(name = "bearerAuth"))
	public ApiResponse<Void> updateMyProfile(
		@Parameter(hidden = true) Authentication authentication,
		@Valid @RequestBody UpdateUserProfileReq req
	){
		userService.updateProfile(resolveMemberId(authentication), req);
		return ApiResponse.ok();
	}

	@PutMapping("/me/password")
	@Operation(security = @SecurityRequirement(name = "bearerAuth"))
	public ApiResponse<Void> changePassword(
		@Parameter(hidden = true) Authentication authentication,
		@Valid @RequestBody ChangePasswordReq req
	){
		userService.changePassword(resolveMemberId(authentication), req);
		return ApiResponse.ok();
	}

	@DeleteMapping("/me")
	@Operation(security = @SecurityRequirement(name = "bearerAuth"))
	public ApiResponse<Void> withdraw(
		@Parameter(hidden = true) Authentication authentication
	){
		userService.withdraw(resolveMemberId(authentication));
		return ApiResponse.ok();
	}

	private Long resolveMemberId(Authentication authentication) {
		if (authentication == null || !(authentication.getPrincipal() instanceof Long memberId)) {
			throw new BusinessException(ResponseCode.LOGIN_REQUIRED);
		}
		return memberId;
	}
}
