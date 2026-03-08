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

@Configuration
public class RabbitMqConfig {

	@Bean
	public Queue testQueue() {
		return QueueBuilder.durable(RabbitMqConstants.TEST_QUEUE).build();
	}

	@Bean
	public DirectExchange testExchange() {
		return ExchangeBuilder
			.directExchange(RabbitMqConstants.TEST_EXCHANGE)
			.durable(true)
			.build();
	}

	@Bean
	public Binding testBinding(Queue testQueue, DirectExchange testExchange) {
		return BindingBuilder
			.bind(testQueue)
			.to(testExchange)
			.with(RabbitMqConstants.TEST_ROUTING_KEY);
	}

	@Bean
	public MessageConverter rabbitMessageConverter() {
		return new Jackson2JsonMessageConverter();
	}
}
