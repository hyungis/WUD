package com.woojudraw.global.api;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.woojudraw.global.messaging.rabbitmq.RabbitMqMessageProducer;
import com.woojudraw.global.response.ApiResponse;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/rabbitmq")
public class RabbitMqTestController {

	private final RabbitMqMessageProducer rabbitMqMessageProducer;

	@PostMapping("/test")
	public ApiResponse<String> publishTestMessage(@RequestParam(defaultValue = "hello rabbitmq") String message) {
		String traceId = rabbitMqMessageProducer.sendTestMessage(message);
		return ApiResponse.ok("published traceId=" + traceId);
	}
}
