package com.woojudraw.domain.auth.api.dto.resp;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LoginResp {
	private final String accessToken;
	private final String refreshToken;
	private final long expiresInSec;
}
