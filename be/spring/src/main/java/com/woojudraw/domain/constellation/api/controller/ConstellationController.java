package com.woojudraw.domain.constellation.api.controller;

import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.woojudraw.domain.constellation.api.dto.req.UpdateCenterStarReq;
import com.woojudraw.domain.constellation.api.dto.resp.GetCenterStarResp;
import com.woojudraw.domain.constellation.api.dto.resp.GetStarMapResp;
import com.woojudraw.domain.constellation.api.dto.resp.GetWeeklyConstellationResp;
import com.woojudraw.domain.constellation.application.ConstellationService;
import com.woojudraw.global.exception.BusinessException;
import com.woojudraw.global.exception.ResponseCode;
import com.woojudraw.global.response.ApiResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class ConstellationController {

	private final ConstellationService constellationService;

	@GetMapping("/star-map")
	public ApiResponse<GetStarMapResp> getStarMap(
		Authentication authentication
	){
		Long userId = resolveMemberId(authentication);
		return ApiResponse.ok(constellationService.getStarMap(userId));
	}

	@GetMapping("/center-star")
	public ApiResponse<GetCenterStarResp> getCenterStar(
		Authentication authentication
	) {
		Long userId = resolveMemberId(authentication);
		return ApiResponse.ok(constellationService.getCenterStar(userId));
	}

	@PutMapping("/center-star")
	public ApiResponse<Void> updateCenterStar(
		Authentication authentication,
		@Valid @RequestBody UpdateCenterStarReq req
	) {
		Long userId = resolveMemberId(authentication);
		constellationService.updateCenterStar(userId, req);
		return ApiResponse.ok();
	}

	@GetMapping("/constellations")
	public ApiResponse<GetWeeklyConstellationResp> getWeeklyConstellations(
		Authentication authentication
	){
		Long userId = resolveMemberId(authentication);
		return ApiResponse.ok(constellationService.getWeeklyConstellations(userId));
	}

	private Long resolveMemberId(Authentication authentication) {
		if (authentication == null || !(authentication.getPrincipal() instanceof Long memberId)) {
			throw new BusinessException(ResponseCode.LOGIN_REQUIRED);
		}
		return memberId;
	}
}
