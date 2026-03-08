package com.woojudraw.domain.deep.application.impl;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.reactive.function.client.WebClient;

import com.woojudraw.domain.deep.api.dto.req.AiAnalyzeReq;
import com.woojudraw.domain.deep.api.dto.resp.AiAnalyzeResp;
import com.woojudraw.domain.deep.application.DeepAiService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DeepAiServiceImpl implements DeepAiService {

	private final RestTemplate restTemplate = new RestTemplate();

	@Value("${ai.server.url}")
	private String aiServerUrl;

	@Override
	public AiAnalyzeResp analyzeHtp(AiAnalyzeReq request) {
		return restTemplate.postForObject(
			aiServerUrl + "/internal/ai/deep/analyze",
			request,
			AiAnalyzeResp.class
		);
	}
}
