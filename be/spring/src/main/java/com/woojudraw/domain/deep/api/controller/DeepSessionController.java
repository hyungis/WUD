package com.woojudraw.domain.deep.api.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.woojudraw.domain.deep.api.dto.req.CreateDeepSessionReq;
import com.woojudraw.domain.deep.api.dto.resp.CreateDeepSessionResp;
import com.woojudraw.domain.deep.application.DeepSessionService;
import com.woojudraw.global.response.ApiResponse;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/deep-sessions")
@RequiredArgsConstructor
public class DeepSessionController {

	private final DeepSessionService deepSessionService;

	@PostMapping
	public ApiResponse<CreateDeepSessionResp> createDeepSession(
		@RequestBody(required=false)CreateDeepSessionReq request
	){
		//TODO: 인증 붙으면 로그인 유저 정보에서 꺼내기
		Long userId = 1L;

		CreateDeepSessionReq actualRequest = (request == null) ? new CreateDeepSessionReq() : request;
		CreateDeepSessionResp response = deepSessionService.createDeepSession(userId, actualRequest);

		return ApiResponse.ok(response);
	}
}
