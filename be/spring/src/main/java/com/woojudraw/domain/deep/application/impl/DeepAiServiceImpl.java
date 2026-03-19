package com.woojudraw.domain.deep.application.impl;

import java.util.UUID;

import com.woojudraw.domain.deep.api.dto.req.AiAnalyzeReq;
import com.woojudraw.domain.deep.application.DeepAiService;
import com.woojudraw.global.exception.BusinessException;
import com.woojudraw.global.exception.ResponseCode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DeepAiServiceImpl implements DeepAiService {

	private static final Logger log = LoggerFactory.getLogger(DeepAiServiceImpl.class);
	private final RabbitTemplate rabbitTemplate;

	@Value("${ai.rabbitmq.exchange}")
	private String aiExchange;

	@Value("${ai.rabbitmq.routing-key}")
	private String aiRoutingKey;

	@Override
	public void requestHtpAnalysis(AiAnalyzeReq request) {
		String traceId = UUID.randomUUID().toString();
		try {
			// Async fire-and-forget publish: HTTP 요청 스레드는 AI 응답을 기다리지 않는다.
			rabbitTemplate.convertAndSend(
				aiExchange,
				aiRoutingKey,
				request,
				message -> {
					message.getMessageProperties().setHeader("traceId", traceId);
					message.getMessageProperties().setHeader("sessionId", request.getSessionId());
					return message;
				}
			);
			log.info("Deep AI request published. traceId={}, sessionId={}", traceId, request.getSessionId());
		} catch (AmqpException e) {
			log.error("RabbitMQ AI analyze publish failed. traceId={}, sessionId={}", traceId, request.getSessionId(), e);
			throw new BusinessException(ResponseCode.AI_SERVER_UNAVAILABLE);
		}
	}
}
