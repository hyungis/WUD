package com.woojudraw.global.security.jwt;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import jakarta.servlet.http.Cookie;

class RefreshTokenCookieProviderTest {

	private RefreshTokenCookieProvider cookieProvider;

	@BeforeEach
	void setUp() {
		cookieProvider = new RefreshTokenCookieProvider();
		ReflectionTestUtils.setField(cookieProvider, "cookieName", "refreshToken");
		ReflectionTestUtils.setField(cookieProvider, "cookieSecure", true);
		ReflectionTestUtils.setField(cookieProvider, "cookieSameSite", "None");
		ReflectionTestUtils.setField(cookieProvider, "cookiePath", "/");
	}

	@Test
	void addRefreshTokenCookieAddsHttpOnlyCookieHeader() {
		MockHttpServletResponse response = new MockHttpServletResponse();

		cookieProvider.addRefreshTokenCookie(response, "refresh-token-value", 1209600L);

		String setCookie = response.getHeader("Set-Cookie");
		assertThat(setCookie).contains("refreshToken=refresh-token-value");
		assertThat(setCookie).contains("HttpOnly");
		assertThat(setCookie).contains("Secure");
		assertThat(setCookie).contains("SameSite=None");
		assertThat(setCookie).contains("Max-Age=1209600");
	}

	@Test
	void expireRefreshTokenCookieAddsExpiredCookieHeader() {
		MockHttpServletResponse response = new MockHttpServletResponse();

		cookieProvider.expireRefreshTokenCookie(response);

		String setCookie = response.getHeader("Set-Cookie");
		assertThat(setCookie).contains("refreshToken=");
		assertThat(setCookie).contains("Max-Age=0");
		assertThat(setCookie).contains("HttpOnly");
	}

	@Test
	void extractRefreshTokenReturnsCookieValue() {
		MockHttpServletRequest request = new MockHttpServletRequest();
		request.setCookies(
			new Cookie("anotherCookie", "value"),
			new Cookie("refreshToken", "refresh-token-value")
		);

		String refreshToken = cookieProvider.extractRefreshToken(request);

		assertThat(refreshToken).isEqualTo("refresh-token-value");
	}

	@Test
	void extractRefreshTokenReturnsNullWhenCookieMissing() {
		MockHttpServletRequest request = new MockHttpServletRequest();

		String refreshToken = cookieProvider.extractRefreshToken(request);

		assertThat(refreshToken).isNull();
	}
}
