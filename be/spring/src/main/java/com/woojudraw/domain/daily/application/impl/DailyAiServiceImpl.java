package com.woojudraw.domain.daily.application.impl;

import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.woojudraw.domain.daily.api.dto.req.DailyAiAnalyzeReq;
import com.woojudraw.domain.daily.application.DailyAiService;
import com.woojudraw.global.exception.BusinessException;
import com.woojudraw.global.exception.ResponseCode;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DailyAiServiceImpl implements DailyAiService {

	private static final Logger log = LoggerFactory.getLogger(DailyAiServiceImpl.class);

	private final RabbitTemplate rabbitTemplate;

	@Value("${ai.rabbitmq.daily.exchange}")
	private String dailyExchange;

	@Value("${ai.rabbitmq.daily.routing-key}")
	private String dailyRoutingKey;

	@Override
	public void requestDailyAnalysis(DailyAiAnalyzeReq request) {
		String traceId = UUID.randomUUID().toString();

		try {
			rabbitTemplate.convertAndSend(
				dailyExchange,
				dailyRoutingKey,
				request,
				message -> {
					message.getMessageProperties().setHeader("traceId", traceId);
					message.getMessageProperties().setHeader("dailyId", request.getDailyId());
					return message;
				}
			);
			log.info("Daily AI request published. traceId={}, dailyId={}", traceId, request.getDailyId());
		} catch (AmqpException e) {
			log.error(
				"Daily AI publish failed. traceId={}, dailyId={}",
				traceId,
				request.getDailyId(),
				e
			);
			throw new BusinessException(ResponseCode.AI_SERVER_UNAVAILABLE);
		}
	}
}
