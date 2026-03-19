package com.woojudraw.domain.daily.api.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.woojudraw.domain.daily.api.dto.req.CreateDailyReq;
import com.woojudraw.domain.daily.api.dto.req.DailyListPeriod;
import com.woojudraw.domain.daily.api.dto.req.UpdateDailyReq;
import com.woojudraw.domain.daily.api.dto.resp.CreateDailyResp;
import com.woojudraw.domain.daily.api.dto.resp.DailyDetailResp;
import com.woojudraw.domain.daily.api.dto.resp.DailyListItemResp;
import com.woojudraw.domain.daily.api.dto.resp.UpdateDailyResp;
import com.woojudraw.domain.daily.application.DailyService;
import com.woojudraw.global.exception.BusinessException;
import com.woojudraw.global.exception.ResponseCode;
import com.woojudraw.global.response.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/dailies")
public class DailyController {

	private final DailyService dailyService;

	@PostMapping
	@Operation(security = @SecurityRequirement(name = "bearerAuth"))
	public ApiResponse<CreateDailyResp> createDaily(
		Authentication authentication,
		@Valid @RequestBody CreateDailyReq request
	) {
		return ApiResponse.ok(dailyService.createDaily(resolveMemberId(authentication), request));
	}

	@GetMapping
	@Operation(security = @SecurityRequirement(name = "bearerAuth"))
	public ApiResponse<List<DailyListItemResp>> getDailies(
		Authentication authentication,
		@RequestParam(required = false) DailyListPeriod period,
		@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
	) {
		return ApiResponse.ok(dailyService.getDailies(resolveMemberId(authentication), period, date));
	}

	@GetMapping("/{dailyId}")
	@Operation(security = @SecurityRequirement(name = "bearerAuth"))
	public ApiResponse<DailyDetailResp> getDaily(
		Authentication authentication,
		@PathVariable Long dailyId
	) {
		return ApiResponse.ok(dailyService.getDaily(resolveMemberId(authentication), dailyId));
	}

	@PutMapping("/{dailyId}")
	@Operation(security = @SecurityRequirement(name = "bearerAuth"))
	public ApiResponse<UpdateDailyResp> updateDaily(
		Authentication authentication,
		@PathVariable Long dailyId,
		@Valid @RequestBody UpdateDailyReq request
	) {
		return ApiResponse.ok(dailyService.updateDaily(resolveMemberId(authentication), dailyId, request));
	}

	@DeleteMapping("/{dailyId}")
	@Operation(security = @SecurityRequirement(name = "bearerAuth"))
	public ApiResponse<Void> deleteDaily(
		Authentication authentication,
		@PathVariable Long dailyId
	) {
		dailyService.deleteDaily(resolveMemberId(authentication), dailyId);
		return ApiResponse.ok();
	}

	private Long resolveMemberId(Authentication authentication) {
		if (authentication == null || !(authentication.getPrincipal() instanceof Long memberId)) {
			throw new BusinessException(ResponseCode.LOGIN_REQUIRED);
		}
		return memberId;
	}
}
