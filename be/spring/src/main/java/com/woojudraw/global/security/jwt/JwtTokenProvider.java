package com.woojudraw.global.security.jwt;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Map;

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

	public long getAccessTokenExpiresInSec() {
		return accessTokenExpMin * 60L;
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

	public String getRole(String token) {
		Object role = parseClaims(token).get("role");
		return role == null ? null : role.toString();
	}
}
