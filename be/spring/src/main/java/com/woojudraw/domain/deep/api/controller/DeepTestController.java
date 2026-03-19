package com.woojudraw.domain.deep.api.controller;

import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.woojudraw.domain.deep.api.dto.resp.DeepTestGuideResp;
import com.woojudraw.domain.deep.api.dto.resp.DeepTestListItemResp;
import com.woojudraw.domain.deep.application.DeepTestService;
import com.woojudraw.global.exception.BusinessException;
import com.woojudraw.global.exception.ResponseCode;
import com.woojudraw.global.response.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/deep-tests")
public class DeepTestController {

	private final DeepTestService deepTestService;

	@GetMapping
	@Operation(security = @SecurityRequirement(name = "bearerAuth"))
	public ApiResponse<List<DeepTestListItemResp>> getDeepTests(
		Authentication authentication
	){
		return ApiResponse.ok(deepTestService.getDeepTests(resolveMemberId(authentication)));
	}

	@GetMapping("/{type}/guide")
	@Operation(security = @SecurityRequirement(name = "bearerAuth"))
	public ApiResponse<DeepTestGuideResp> getGuide(
		@PathVariable String type
	){
		return ApiResponse.ok(deepTestService.getDeepTestGuide(type));
	}

	private Long resolveMemberId(Authentication authentication) {
		if (authentication == null || !(authentication.getPrincipal() instanceof Long memberId)) {
			throw new BusinessException(ResponseCode.LOGIN_REQUIRED);
		}
		return memberId;
	}
}
