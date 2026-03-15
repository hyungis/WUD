package com.woojudraw.global.config.rabbitmq;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.ExchangeBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Qualifier;

@Configuration
public class RabbitMqConfig {

	@Bean
	public Queue testQueue() {
		return QueueBuilder.durable(RabbitMqConstants.TEST_QUEUE).build();
	}

	@Bean
	public Queue deepAiRequestQueue() {
		return QueueBuilder.durable(RabbitMqConstants.DEEP_AI_REQUEST_QUEUE).build();
	}

	@Bean
	public Queue deepAiResultQueue() {
		return QueueBuilder.durable(RabbitMqConstants.DEEP_AI_RESULT_QUEUE).build();
	}

	@Bean
	public Queue dailyAiRequestQueue() {
		return QueueBuilder.durable(RabbitMqConstants.DAILY_AI_REQUEST_QUEUE).build();
	}

	@Bean
	public Queue dailyAiResultQueue() {
		return QueueBuilder.durable(RabbitMqConstants.DAILY_AI_RESULT_QUEUE).build();
	}

	@Bean
	public DirectExchange testExchange() {
		return ExchangeBuilder
			.directExchange(RabbitMqConstants.TEST_EXCHANGE)
			.durable(true)
			.build();
	}

	@Bean
	public DirectExchange deepAiExchange() {
		return ExchangeBuilder
			.directExchange(RabbitMqConstants.DEEP_AI_EXCHANGE)
			.durable(true)
			.build();
	}

	@Bean
	public DirectExchange dailyAiExchange() {
		return ExchangeBuilder
			.directExchange(RabbitMqConstants.DAILY_AI_EXCHANGE)
			.durable(true)
			.build();
	}

	@Bean
	public Binding testBinding(
		@Qualifier("testQueue") Queue testQueue,
		@Qualifier("testExchange") DirectExchange testExchange
	) {
		return BindingBuilder
			.bind(testQueue)
			.to(testExchange)
			.with(RabbitMqConstants.TEST_ROUTING_KEY);
	}

	@Bean
	public Binding deepAiRequestBinding(
		@Qualifier("deepAiRequestQueue") Queue deepAiRequestQueue,
		@Qualifier("deepAiExchange") DirectExchange deepAiExchange
	) {
		return BindingBuilder
			.bind(deepAiRequestQueue)
			.to(deepAiExchange)
			.with(RabbitMqConstants.DEEP_AI_REQUEST_ROUTING_KEY);
	}

	@Bean
	public Binding deepAiResultBinding(
		@Qualifier("deepAiResultQueue") Queue deepAiResultQueue,
		@Qualifier("deepAiExchange") DirectExchange deepAiExchange
	) {
		return BindingBuilder
			.bind(deepAiResultQueue)
			.to(deepAiExchange)
			.with(RabbitMqConstants.DEEP_AI_RESULT_ROUTING_KEY);
	}

	@Bean
	public Binding dailyAiRequestBinding(
		@Qualifier("dailyAiRequestQueue") Queue dailyAiRequestQueue,
		@Qualifier("dailyAiExchange") DirectExchange dailyAiExchange
	) {
		return BindingBuilder
			.bind(dailyAiRequestQueue)
			.to(dailyAiExchange)
			.with(RabbitMqConstants.DAILY_AI_REQUEST_ROUTING_KEY);
	}

	@Bean
	public Binding dailyAiResultBinding(
		@Qualifier("dailyAiResultQueue") Queue dailyAiResultQueue,
		@Qualifier("dailyAiExchange") DirectExchange dailyAiExchange
	) {
		return BindingBuilder
			.bind(dailyAiResultQueue)
			.to(dailyAiExchange)
			.with(RabbitMqConstants.DAILY_AI_RESULT_ROUTING_KEY);
	}

	@Bean
	public MessageConverter rabbitMessageConverter() {
		return new Jackson2JsonMessageConverter();
	}
}
