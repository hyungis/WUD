package com.woojudraw.global.security.jwt;

import java.time.Duration;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class RedisTokenStore {

	private static final String REFRESH_TOKEN_KEY_PREFIX = "auth:refresh:";
	private static final String ACCESS_TOKEN_BLACKLIST_KEY_PREFIX = "auth:blacklist:";

	private final StringRedisTemplate redisTemplate;

	public void saveRefreshToken(Long memberId, String refreshToken, long ttlSeconds) {
		if (ttlSeconds <= 0L) {
			return;
		}

		redisTemplate.opsForValue().set(refreshTokenKey(memberId), refreshToken, Duration.ofSeconds(ttlSeconds));
	}

	public void deleteRefreshToken(Long memberId) {
		redisTemplate.delete(refreshTokenKey(memberId));
	}

	public void blacklistAccessToken(String accessToken, long ttlSeconds) {
		if (ttlSeconds <= 0L) {
			return;
		}

		redisTemplate.opsForValue().set(blacklistedAccessTokenKey(accessToken), "1", Duration.ofSeconds(ttlSeconds));
	}

	public boolean isBlacklisted(String accessToken) {
		Boolean exists = redisTemplate.hasKey(blacklistedAccessTokenKey(accessToken));
		return Boolean.TRUE.equals(exists);
	}

	private String refreshTokenKey(Long memberId) {
		return REFRESH_TOKEN_KEY_PREFIX + memberId;
	}

	private String blacklistedAccessTokenKey(String accessToken) {
		return ACCESS_TOKEN_BLACKLIST_KEY_PREFIX + accessToken;
	}
}
