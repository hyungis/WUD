package com.woojudraw.domain.deep.application.impl;

import java.io.IOException;
import java.util.UUID;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.woojudraw.domain.deep.api.dto.req.AiAnalyzeReq;
import com.woojudraw.domain.deep.api.dto.resp.AiAnalyzeResp;
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
	private final ObjectMapper objectMapper;

	@Value("${ai.rabbitmq.exchange}")
	private String aiExchange;

	@Value("${ai.rabbitmq.routing-key}")
	private String aiRoutingKey;

	@Override
	public AiAnalyzeResp analyzeHtp(AiAnalyzeReq request) {
		String traceId = UUID.randomUUID().toString();
		try {
			Object rawResponse = rabbitTemplate.convertSendAndReceive(
				aiExchange,
				aiRoutingKey,
				request,
				message -> {
					message.getMessageProperties().setHeader("traceId", traceId);
					return message;
				}
			);

			if (rawResponse == null) {
				throw new BusinessException(ResponseCode.AI_TIMEOUT);
			}

			return parseAndValidateResponse(rawResponse);
		} catch (BusinessException e) {
			throw e;
		} catch (AmqpException e) {
			log.error("RabbitMQ AI analyze request failed. traceId={}", traceId, e);
			throw new BusinessException(ResponseCode.AI_SERVER_UNAVAILABLE);
		} catch (IOException | IllegalArgumentException e) {
			log.error("RabbitMQ AI analyze response parse failed. traceId={}", traceId, e);
			throw new BusinessException(ResponseCode.AI_RESPONSE_INVALID);
		}
	}

	private AiAnalyzeResp parseAndValidateResponse(Object rawResponse) throws IOException {
		AiAnalyzeResp aiResponse;
		if (rawResponse instanceof AiAnalyzeResp response) {
			aiResponse = response;
		} else if (rawResponse instanceof byte[] bytes) {
			aiResponse = objectMapper.readValue(bytes, AiAnalyzeResp.class);
		} else if (rawResponse instanceof String text) {
			aiResponse = objectMapper.readValue(text, AiAnalyzeResp.class);
		} else {
			aiResponse = objectMapper.convertValue(rawResponse, AiAnalyzeResp.class);
		}

		if (aiResponse == null || aiResponse.getData() == null) {
			throw new BusinessException(ResponseCode.AI_RESPONSE_INVALID);
		}
		return aiResponse;
	}
}
