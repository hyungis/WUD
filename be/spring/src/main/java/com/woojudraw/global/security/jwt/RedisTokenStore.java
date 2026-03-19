package com.woojudraw.global.security.jwt;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class RedisTokenStore {

	private static final String REFRESH_TOKEN_KEY_PREFIX = "auth:refresh:";
	private static final String ACCESS_TOKEN_BLACKLIST_KEY_PREFIX = "auth:blacklist:";

	private final StringRedisTemplate redisTemplate;

	public void saveRefreshToken(Long memberId, String sessionId, String refreshToken, long ttlSeconds) {
		if (ttlSeconds <= 0L) {
			return;
		}
		if (sessionId == null || sessionId.isBlank()) {
			return;
		}

		redisTemplate.opsForValue().set(
			refreshTokenKey(memberId, sessionId),
			hashToken(refreshToken),
			Duration.ofSeconds(ttlSeconds)
		);
	}

	public boolean isRefreshTokenMatched(Long memberId, String sessionId, String refreshToken) {
		if (sessionId == null || sessionId.isBlank()) {
			return false;
		}

		String savedHash = redisTemplate.opsForValue().get(refreshTokenKey(memberId, sessionId));
		return savedHash != null && savedHash.equals(hashToken(refreshToken));
	}

	public void deleteRefreshToken(Long memberId, String sessionId) {
		if (sessionId == null || sessionId.isBlank()) {
			return;
		}

		redisTemplate.delete(refreshTokenKey(memberId, sessionId));
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

	private String refreshTokenKey(Long memberId, String sessionId) {
		return REFRESH_TOKEN_KEY_PREFIX + memberId + ":" + sessionId;
	}

	private String blacklistedAccessTokenKey(String accessToken) {
		return ACCESS_TOKEN_BLACKLIST_KEY_PREFIX + accessToken;
	}

	private String hashToken(String token) {
		try {
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
			byte[] hashedBytes = digest.digest(token.getBytes(StandardCharsets.UTF_8));
			return HexFormat.of().formatHex(hashedBytes);
		} catch (NoSuchAlgorithmException e) {
			throw new IllegalStateException("SHA-256 algorithm is unavailable", e);
		}
	}
}
