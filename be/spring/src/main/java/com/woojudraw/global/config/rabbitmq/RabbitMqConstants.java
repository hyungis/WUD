package com.woojudraw.global.config.rabbitmq;

public final class RabbitMqConstants {

	public static final String TEST_EXCHANGE = "wud.test.exchange";
	public static final String TEST_QUEUE = "wud.test.queue";
	public static final String TEST_ROUTING_KEY = "wud.test.routing-key";
	public static final String DEEP_AI_EXCHANGE = "wud.deep.ai.exchange";
	public static final String DEEP_AI_REQUEST_QUEUE = "wud.deep.ai.request.queue";
	public static final String DEEP_AI_REQUEST_ROUTING_KEY = "wud.deep.ai.request.routing-key";
	public static final String DEEP_AI_RESULT_QUEUE = "wud.deep.ai.result.queue";
	public static final String DEEP_AI_RESULT_ROUTING_KEY = "wud.deep.ai.result.routing-key";
	public static final String DAILY_AI_EXCHANGE = "wud.daily.ai.exchange";
	public static final String DAILY_AI_REQUEST_QUEUE = "wud.daily.ai.request.queue";
	public static final String DAILY_AI_REQUEST_ROUTING_KEY = "wud.daily.ai.request.routing-key";
	public static final String DAILY_AI_RESULT_QUEUE = "wud.daily.ai.result.queue";
	public static final String DAILY_AI_RESULT_ROUTING_KEY = "wud.daily.ai.result.routing-key";

	private RabbitMqConstants() {
	}
}
