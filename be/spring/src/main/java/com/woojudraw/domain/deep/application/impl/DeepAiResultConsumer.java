package com.woojudraw.domain.deep.application.impl;

import java.util.HashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.woojudraw.domain.constellation.application.ConstellationService;
import com.woojudraw.domain.deep.api.dto.resp.AiAnalyzeResp;
import com.woojudraw.domain.deep.entity.DeepResult;
import com.woojudraw.domain.deep.entity.DeepSession;
import com.woojudraw.domain.deep.entity.DeepStatus;
import com.woojudraw.domain.deep.repository.DeepResultRepository;
import com.woojudraw.domain.deep.repository.DeepSessionRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class DeepAiResultConsumer {

	private static final Logger log = LoggerFactory.getLogger(DeepAiResultConsumer.class);

	private final DeepSessionRepository deepSessionRepository;
	private final DeepResultRepository deepResultRepository;
	private final ObjectMapper objectMapper;
	private final ConstellationService constellationService;

	@RabbitListener(queues = "${ai.rabbitmq.result-queue:wud.deep.ai.result.queue}")
	@Transactional
	public void consumeAiResult(
		AiAnalyzeResp response,
		@Header(name = "traceId", required = false) String traceId
	) {
		if (response == null || response.getSessionId() == null) {
			log.warn("Ignore AI result message because sessionId is missing. traceId={}", traceId);
			return;
		}

		Long sessionId = response.getSessionId();
		DeepSession deepSession = deepSessionRepository.findById(sessionId)
			.orElseThrow(() -> new IllegalStateException("Deep session not found for AI result. sessionId=" + sessionId));

		try {
			// 중복 전달(재시도/재전송) 대비: 이미 완료된 세션이면 결과를 다시 반영하지 않는다.
			if (deepSession.getStatus() == DeepStatus.DONE) {
				log.info("Skip duplicate AI result because session is already DONE. sessionId={}, traceId={}", sessionId, traceId);
				return;
			}

			if (!"SUCCESS".equalsIgnoreCase(response.getStatus()) || response.getData() == null) {
				deepSession.changeStatus(DeepStatus.FAILED);
				log.warn(
					"Mark session FAILED because AI status is not SUCCESS. sessionId={}, status={}, traceId={}",
					sessionId,
					response.getStatus(),
					traceId
				);
				return;
			}

			Map<String, Object> rawMap = new HashMap<>();
			rawMap.put("questions", response.getData().getQuestions());
			rawMap.put("raw", response.getData().getRaw());
			String rawJson = objectMapper.writeValueAsString(rawMap);

			DeepResult deepResult = deepResultRepository.findByDeepSession_Id(sessionId)
				.orElseGet(() -> {
					DeepResult created = DeepResult.create(deepSession, response.getData().getResultSummary(), rawJson);
					deepSession.assignDeepResult(created);
					return created;
				});
			deepResult.updateResult(response.getData().getResultSummary(), rawJson);
			deepResultRepository.save(deepResult);

			deepSession.changeStatus(DeepStatus.DONE);
			deepSession.markCompleted();

			constellationService.createDeepStarIfNeeded(deepSession);

			log.info("Deep AI result applied. sessionId={}, traceId={}", sessionId, traceId);
		} catch (Exception e) {
			// 파싱/저장 실패는 세션을 FAILED로 남겨 운영자가 후속 조치할 수 있게 한다.
			deepSession.changeStatus(DeepStatus.FAILED);
			log.error("Failed to apply AI result. sessionId={}, traceId={}", sessionId, traceId, e);
		}
	}
}
