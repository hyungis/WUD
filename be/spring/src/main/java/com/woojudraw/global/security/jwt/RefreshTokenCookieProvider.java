package com.woojudraw.global.security.jwt;

import java.time.Duration;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class RefreshTokenCookieProvider {

	@Value("${security.jwt.refresh-cookie-name:refreshToken}")
	private String cookieName;

	@Value("${security.jwt.refresh-cookie-secure:false}")
	private boolean cookieSecure;

	@Value("${security.jwt.refresh-cookie-same-site:Lax}")
	private String cookieSameSite;

	@Value("${security.jwt.refresh-cookie-path:/}")
	private String cookiePath;

	public void addRefreshTokenCookie(HttpServletResponse response, String refreshToken, long maxAgeSeconds) {
		ResponseCookie cookie = ResponseCookie.from(cookieName, refreshToken)
			.httpOnly(true)
			.secure(cookieSecure)
			.sameSite(cookieSameSite)
			.path(cookiePath)
			.maxAge(Duration.ofSeconds(Math.max(maxAgeSeconds, 0L)))
			.build();

		response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
	}

	public void expireRefreshTokenCookie(HttpServletResponse response) {
		ResponseCookie cookie = ResponseCookie.from(cookieName, "")
			.httpOnly(true)
			.secure(cookieSecure)
			.sameSite(cookieSameSite)
			.path(cookiePath)
			.maxAge(Duration.ZERO)
			.build();

		response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
	}

	public String extractRefreshToken(HttpServletRequest request) {
		Cookie[] cookies = request.getCookies();
		if (cookies == null) {
			return null;
		}

		for (Cookie cookie : cookies) {
			if (cookieName.equals(cookie.getName())) {
				return cookie.getValue();
			}
		}
		return null;
	}
}
