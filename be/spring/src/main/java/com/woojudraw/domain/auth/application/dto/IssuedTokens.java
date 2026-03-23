package com.woojudraw.domain.auth.application.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class IssuedTokens {
	private final String accessToken;
	private final String refreshToken;
	private final long accessTokenExpiresInSec;
	private final long refreshTokenExpiresInSec;
	private final boolean tutorialCompleted;
}
