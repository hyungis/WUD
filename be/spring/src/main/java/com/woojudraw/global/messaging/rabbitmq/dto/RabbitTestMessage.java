package com.woojudraw.global.messaging.rabbitmq.dto;

public record RabbitTestMessage(
	String traceId,
	String content
) {
}
