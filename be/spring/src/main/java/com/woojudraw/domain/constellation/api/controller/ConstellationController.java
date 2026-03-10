package com.woojudraw.domain.constellation.api.controller;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.woojudraw.domain.constellation.api.dto.resp.GetStarMapResp;
import com.woojudraw.domain.constellation.api.dto.resp.GetWeeklyConstellationResp;
import com.woojudraw.domain.constellation.application.ConstellationService;
import com.woojudraw.global.exception.BusinessException;
import com.woojudraw.global.exception.ResponseCode;
import com.woojudraw.global.response.ApiResponse;

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
