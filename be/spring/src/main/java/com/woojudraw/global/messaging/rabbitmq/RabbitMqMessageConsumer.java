package com.woojudraw.global.messaging.rabbitmq;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import com.woojudraw.global.config.rabbitmq.RabbitMqConstants;
import com.woojudraw.global.messaging.rabbitmq.dto.RabbitTestMessage;

@Component
public class RabbitMqMessageConsumer {

	private static final Logger log = LoggerFactory.getLogger(RabbitMqMessageConsumer.class);

	@RabbitListener(queues = RabbitMqConstants.TEST_QUEUE)
	public void consumeTestMessage(RabbitTestMessage message) {
		log.info(
			"RabbitMQ consume success - traceId: {}, content: {}",
			message.traceId(),
			message.content()
		);
	}
}
