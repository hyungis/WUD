package com.woojudraw.domain.test;

import com.woojudraw.global.exception.BusinessException;
import com.woojudraw.global.exception.ResponseCode;
import com.woojudraw.global.response.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/test")
public class TestController {

	// 1) 정상 응답 테스트
	@GetMapping("/ok")
	public ApiResponse<Map<String, Object>> ok() {
		return ApiResponse.ok(Map.of("hello", "world"));
	}

	// 2) BusinessException 테스트
	@GetMapping("/biz")
	public ApiResponse<Void> biz() {
		throw new BusinessException(ResponseCode.USER_NOT_FOUND);
	}

	// 3) BusinessException + details 테스트
	@GetMapping("/biz-details")
	public ApiResponse<Void> bizDetails() {
		throw new BusinessException(
			ResponseCode.EMAIL_ALREADY_EXISTS,
			Map.of("email", "test@gmail.com")
		);
	}

	// 4) Validation 테스트(@Valid)
	@PostMapping("/valid")
	public ApiResponse<Void> valid(@Valid @RequestBody CreateReq req) {
		return ApiResponse.ok();
	}

	// Validation용 DTO (테스트 전용)
	public record CreateReq(
		@NotBlank(message = "name은 필수입니다.")
		@Size(max = 5, message = "name은 5자 이하여야 합니다.")
		String name
	) {}
}