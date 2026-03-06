package com.woojudraw.domain.auth.api.dto.req;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;

@Getter
public class SignupReq {

	@Email
	@NotBlank
	private String email;

	@NotBlank
	@Size(min = 8, max = 64)
	private String password;

	@NotBlank
	@Size(min = 2, max = 20)
	private String nickname;
}