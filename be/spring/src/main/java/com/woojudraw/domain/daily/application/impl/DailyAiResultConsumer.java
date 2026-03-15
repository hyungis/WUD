package com.woojudraw.domain.daily.application.impl;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.woojudraw.domain.constellation.application.ConstellationService;
import com.woojudraw.domain.daily.api.dto.resp.DailyAiAnalyzeResp;
import com.woojudraw.domain.daily.entity.Daily;
import com.woojudraw.domain.daily.entity.DailyAnalysisStatus;
import com.woojudraw.domain.daily.entity.DailyResult;
import com.woojudraw.domain.daily.repository.DailyRepository;
import com.woojudraw.domain.daily.repository.DailyResultRepository;
import com.woojudraw.global.exception.ResponseCode;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class DailyAiResultConsumer {

	private static final Logger log = LoggerFactory.getLogger(DailyAiResultConsumer.class);

	private final DailyRepository dailyRepository;
	private final DailyResultRepository dailyResultRepository;
	private final ObjectMapper objectMapper;
	private final ConstellationService constellationService;

	@RabbitListener(queues = "${ai.rabbitmq.daily.result-queue:wud.daily.ai.result.queue}")
	@Transactional
	public void consumeDailyAiResult(
		DailyAiAnalyzeResp response,
		@Header(name = "traceId", required = false) String traceId
	) {
		if (response == null || response.getDailyId() == null) {
			log.warn(
				"[{}] Ignore daily AI result because dailyId is missing. traceId={}",
				ResponseCode.AI_RESPONSE_INVALID.code(),
				traceId
			);
			return;
		}

		Long dailyId = response.getDailyId();
		Daily daily = dailyRepository.findById(dailyId).orElse(null);
		if (daily == null) {
			log.warn(
				"[{}] Daily not found for AI result. dailyId={}, traceId={}",
				ResponseCode.DAILY_NOT_FOUND.code(),
				dailyId,
				traceId
			);
			return;
		}

		if (daily.isDeleted()) {
			log.info("Skip daily AI result because daily is deleted. dailyId={}, traceId={}", dailyId, traceId);
			return;
		}

		try {
			if (daily.currentAnalysisStatus() == DailyAnalysisStatus.DONE) {
				log.info("Skip duplicate daily AI result because status is DONE. dailyId={}, traceId={}", dailyId, traceId);
				return;
			}

			if (!"SUCCESS".equalsIgnoreCase(response.getStatus())) {
				daily.markAnalysisFailed();
				log.warn(
					"[{}] Mark daily analysis FAILED because AI status is not SUCCESS. dailyId={}, status={}, traceId={}",
					ResponseCode.AI_ANALYSIS_FAILED.code(),
					dailyId,
					response.getStatus(),
					traceId
				);
				return;
			}

			if (response.getData() == null
				|| response.getData().getResultSummary() == null
				|| response.getData().getResultSummary().isBlank()) {
				daily.markAnalysisFailed();
				log.warn(
					"[{}] Mark daily analysis FAILED because AI response data is invalid. dailyId={}, traceId={}",
					ResponseCode.AI_RESPONSE_INVALID.code(),
					dailyId,
					traceId
				);
				return;
			}

			String rawJson = response.getData().getRaw() == null
				? null
				: objectMapper.writeValueAsString(response.getData().getRaw());

			DailyResult dailyResult = dailyResultRepository.findByDailyEntriesId(dailyId)
				.orElseGet(() -> DailyResult.create(dailyId, response.getData().getResultSummary(), rawJson));
			dailyResult.updateResult(response.getData().getResultSummary(), rawJson);
			dailyResultRepository.save(dailyResult);

			daily.markAnalysisDone();
			constellationService.createDailyStarIfNeeded(daily);
			log.info("Daily AI result applied. dailyId={}, traceId={}", dailyId, traceId);
		} catch (Exception e) {
			daily.markAnalysisFailed();
			log.error(
				"[{}] Failed to apply daily AI result. dailyId={}, traceId={}",
				ResponseCode.AI_ANALYSIS_FAILED.code(),
				dailyId,
				traceId,
				e
			);
		}
	}
}
