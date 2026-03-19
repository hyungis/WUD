package com.woojudraw.global.messaging.rabbitmq;

import java.util.UUID;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import com.woojudraw.global.config.rabbitmq.RabbitMqConstants;
import com.woojudraw.global.messaging.rabbitmq.dto.RabbitTestMessage;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RabbitMqMessageProducer {

	private final RabbitTemplate rabbitTemplate;

	public String sendTestMessage(String content) {
		String traceId = UUID.randomUUID().toString();
		RabbitTestMessage message = new RabbitTestMessage(traceId, content);

		rabbitTemplate.convertAndSend(
			RabbitMqConstants.TEST_EXCHANGE,
			RabbitMqConstants.TEST_ROUTING_KEY,
			message
		);

		return traceId;
	}
}
