package com.woojudraw.global.config.rabbitmq;

public final class RabbitMqConstants {

	public static final String TEST_EXCHANGE = "wud.test.exchange";
	public static final String TEST_QUEUE = "wud.test.queue";
	public static final String TEST_ROUTING_KEY = "wud.test.routing-key";
	public static final String DEEP_AI_EXCHANGE = "wud.deep.ai.exchange";
	public static final String DEEP_AI_REQUEST_QUEUE = "wud.deep.ai.request.queue";
	public static final String DEEP_AI_REQUEST_ROUTING_KEY = "wud.deep.ai.request.routing-key";

	private RabbitMqConstants() {
	}
}
