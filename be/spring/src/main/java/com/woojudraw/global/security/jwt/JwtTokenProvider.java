package com.woojudraw.global.security.jwt;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Map;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
@Component
public class JwtTokenProvider {

	private final SecretKey key;
	private final int accessTokenExpMin;
	private final int refreshTokenExpDay;

	public JwtTokenProvider(
		@Value("${security.jwt.secret}") String secret,
		@Value("${security.jwt.access-token-exp-min}") int accessTokenExpMin,
		@Value("${security.jwt.refresh-token-exp-day}") int refreshTokenExpDay
	) {
		this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
		this.accessTokenExpMin = accessTokenExpMin;
		this.refreshTokenExpDay = refreshTokenExpDay;
	}

	public String createAccessToken(Long memberId, String role) {
		Instant now = Instant.now();
		Instant exp = now.plusSeconds(accessTokenExpMin * 60L);

		return Jwts.builder()
			.subject(String.valueOf(memberId))
			.claims(Map.of("role", role))
			.issuedAt(Date.from(now))
			.expiration(Date.from(exp))
			.signWith(key)
			.compact();
	}

	public String createRefreshToken(Long memberId) {
		Instant now = Instant.now();
		Instant exp = now.plusSeconds(refreshTokenExpDay * 24L * 60L * 60L);

		return Jwts.builder()
			.subject(String.valueOf(memberId))
			.issuedAt(Date.from(now))
			.expiration(Date.from(exp))
			.signWith(key)
			.compact();
	}

	public Claims parseClaims(String token) {
		return (Claims)Jwts.parser()
			.verifyWith(key)
			.build()
			.parseSignedClaims(token)
			.getPayload();
	}

	public Long getMemberId(String token) {
		return Long.valueOf(parseClaims(token).getSubject());
	}

	public String getRole(String token) {
		Object role = parseClaims(token).get("role");
		return role == null ? null : role.toString();
	}
}
