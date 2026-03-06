package com.woojudraw.domain.image.api.controller;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.woojudraw.domain.image.api.dto.req.ImageCreateReq;
import com.woojudraw.domain.image.api.dto.req.ImagePresignedUrlReq;
import com.woojudraw.domain.image.api.dto.resp.ImageCreateResp;
import com.woojudraw.domain.image.api.dto.resp.ImagePresignedUrlResp;
import com.woojudraw.domain.image.application.ImageService;
import com.woojudraw.global.exception.BusinessException;
import com.woojudraw.global.exception.ResponseCode;
import com.woojudraw.global.response.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/images")
public class ImageController {

	private final ImageService imageService;

	@PostMapping("/presigned-url")
	@Operation(security = @SecurityRequirement(name = "bearerAuth"))
	public ApiResponse<ImagePresignedUrlResp> issuePresignedUrl(
		Authentication authentication,
		@Valid @RequestBody ImagePresignedUrlReq req
	) {
		return ApiResponse.ok(imageService.issuePresignedUrl(resolveMemberId(authentication), req));
	}

	@PostMapping
	@Operation(security = @SecurityRequirement(name = "bearerAuth"))
	public ApiResponse<ImageCreateResp> createImage(
		Authentication authentication,
		@Valid @RequestBody ImageCreateReq req
	) {
		return ApiResponse.ok(imageService.createImage(resolveMemberId(authentication), req));
	}

	private Long resolveMemberId(Authentication authentication) {
		if (authentication == null || !(authentication.getPrincipal() instanceof Long memberId)) {
			throw new BusinessException(ResponseCode.LOGIN_REQUIRED);
		}
		return memberId;
	}
}
