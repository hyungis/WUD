package com.woojudraw.global.security.jwt;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import jakarta.annotation.PostConstruct;
import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class JwtTokenProvider {

	private static final String CLAIM_ROLE = "role";
	private static final String CLAIM_SESSION_ID = "sid";

	@Value("${security.jwt.secret}")
	private String secret;

	@Value("${security.jwt.access-token-exp-min}")
	private int accessTokenExpMin;

	@Value("${security.jwt.refresh-token-exp-day}")
	private int refreshTokenExpDay;

	private SecretKey key;

	@PostConstruct
	public void init() {
		this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
	}

	public String createAccessToken(Long memberId, String role) {
		return createAccessToken(memberId, role, null);
	}

	public String createAccessToken(Long memberId, String role, String sessionId) {
		Instant now = Instant.now();
		Instant exp = now.plusSeconds(accessTokenExpMin * 60L);
		Map<String, Object> claims = new HashMap<>();
		claims.put(CLAIM_ROLE, role);
		if (sessionId != null && !sessionId.isBlank()) {
			claims.put(CLAIM_SESSION_ID, sessionId);
		}

		return Jwts.builder()
			.subject(String.valueOf(memberId))
			.claims(claims)
			.issuedAt(Date.from(now))
			.expiration(Date.from(exp))
			.signWith(key)
			.compact();
	}

	public String createRefreshToken(Long memberId) {
		return createRefreshToken(memberId, null);
	}

	public String createRefreshToken(Long memberId, String sessionId) {
		Instant now = Instant.now();
		Instant exp = now.plusSeconds(refreshTokenExpDay * 24L * 60L * 60L);
		var builder = Jwts.builder()
			.id(UUID.randomUUID().toString())
			.subject(String.valueOf(memberId))
			.issuedAt(Date.from(now))
			.expiration(Date.from(exp));

		if (sessionId != null && !sessionId.isBlank()) {
			builder.claim(CLAIM_SESSION_ID, sessionId);
		}

		return builder
			.signWith(key)
			.compact();
	}

	public long getAccessTokenExpiresInSec() {
		return accessTokenExpMin * 60L;
	}

	public long getRefreshTokenExpiresInSec() {
		return refreshTokenExpDay * 24L * 60L * 60L;
	}

	public long getRemainingValidityInSec(String token) {
		Instant now = Instant.now();
		Instant expiration = parseClaims(token).getExpiration().toInstant();
		long remainingInSec = expiration.getEpochSecond() - now.getEpochSecond();
		return Math.max(remainingInSec, 0L);
	}

	public Claims parseClaims(String token) {
		return Jwts.parser()
			.verifyWith(key)
			.build()
			.parseSignedClaims(token)
			.getPayload();
	}

	public Long getMemberId(String token) {
		return Long.valueOf(parseClaims(token).getSubject());
	}

	public String getSessionId(String token) {
		Object sessionId = parseClaims(token).get(CLAIM_SESSION_ID);
		return sessionId == null ? null : sessionId.toString();
	}

	public String getRole(String token) {
		Object role = parseClaims(token).get(CLAIM_ROLE);
		return role == null ? null : role.toString();
	}
}
