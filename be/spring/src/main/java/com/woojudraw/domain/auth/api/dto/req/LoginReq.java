package com.woojudraw.domain.auth.api.dto.req;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class LoginReq {

	@Email
	@NotBlank
	private String email;

	@NotBlank
	private String password;
}