package com.woojudraw.domain.auth.api.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.woojudraw.domain.auth.api.dto.req.LoginReq;
import com.woojudraw.domain.auth.api.dto.req.SignupReq;
import com.woojudraw.domain.auth.api.dto.resp.LoginResp;
import com.woojudraw.domain.auth.application.AuthService;
import com.woojudraw.domain.auth.application.dto.IssuedTokens;
import com.woojudraw.global.exception.BusinessException;
import com.woojudraw.global.exception.ResponseCode;
import com.woojudraw.global.response.ApiResponse;
import com.woojudraw.global.security.jwt.RefreshTokenCookieProvider;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

	@Mock
	private AuthService authService;
	@Mock
	private RefreshTokenCookieProvider refreshTokenCookieProvider;

	private AuthController authController;
	private ObjectMapper objectMapper;

	@BeforeEach
	void setUp() {
		authController = new AuthController(authService, refreshTokenCookieProvider);
		objectMapper = new ObjectMapper();
	}

	@Test
	void signupDelegatesToService() {
		SignupReq req = new SignupReq();
		ReflectionTestUtils.setField(req, "email", "test@example.com");
		ReflectionTestUtils.setField(req, "password", "password1234");
		ReflectionTestUtils.setField(req, "nickname", "tester");

		ApiResponse<Void> response = authController.signup(req);

		assertThat(response.success()).isTrue();
		verify(authService).signup(req);
	}

	@Test
	void loginReturnsAccessTokenOnlyAndSetsRefreshCookie() throws Exception {
		LoginReq req = new LoginReq();
		ReflectionTestUtils.setField(req, "email", "test@example.com");
		ReflectionTestUtils.setField(req, "password", "password1234");
		MockHttpServletResponse servletResponse = new MockHttpServletResponse();

		IssuedTokens issuedTokens = IssuedTokens.builder()
			.accessToken("access-token")
			.refreshToken("refresh-token")
			.accessTokenExpiresInSec(1800L)
			.refreshTokenExpiresInSec(1209600L)
			.tutorialCompleted(false)
			.build();
		when(authService.login(req)).thenReturn(issuedTokens);

		ApiResponse<LoginResp> response = authController.login(req, servletResponse);
		String json = objectMapper.writeValueAsString(response);

		assertThat(response.success()).isTrue();
		assertThat(response.data().getAccessToken()).isEqualTo("access-token");
		assertThat(response.data().getExpiresInSec()).isEqualTo(1800L);
		assertThat(response.data().isTutorialCompleted()).isFalse();
		assertThat(json).doesNotContain("refreshToken");
		verify(refreshTokenCookieProvider).addRefreshTokenCookie(servletResponse, "refresh-token", 1209600L);
	}

	@Test
	void refreshUsesCookieAndReturnsAccessTokenOnly() {
		MockHttpServletRequest servletRequest = new MockHttpServletRequest();
		MockHttpServletResponse servletResponse = new MockHttpServletResponse();
		when(refreshTokenCookieProvider.extractRefreshToken(servletRequest)).thenReturn("refresh-token");

		IssuedTokens issuedTokens = IssuedTokens.builder()
			.accessToken("new-access-token")
			.refreshToken("new-refresh-token")
			.accessTokenExpiresInSec(1800L)
			.refreshTokenExpiresInSec(1209600L)
			.tutorialCompleted(true)
			.build();
		when(authService.refresh("refresh-token")).thenReturn(issuedTokens);

		ApiResponse<LoginResp> response = authController.refresh(servletRequest, servletResponse);

		assertThat(response.success()).isTrue();
		assertThat(response.data().getAccessToken()).isEqualTo("new-access-token");
		assertThat(response.data().isTutorialCompleted()).isTrue();
		verify(refreshTokenCookieProvider).addRefreshTokenCookie(servletResponse, "new-refresh-token", 1209600L);
	}

	@Test
	void logoutDelegatesAndExpiresRefreshCookie() {
		MockHttpServletRequest servletRequest = new MockHttpServletRequest();
		MockHttpServletResponse servletResponse = new MockHttpServletResponse();
		servletRequest.addHeader("Authorization", "Bearer access-token");

		ApiResponse<Void> response = authController.logout(servletRequest, servletResponse);

		assertThat(response.success()).isTrue();
		verify(authService).logout("access-token");
		verify(refreshTokenCookieProvider).expireRefreshTokenCookie(servletResponse);
	}

	@Test
	void logoutThrowsWhenAuthorizationHeaderMissing() {
		MockHttpServletRequest servletRequest = new MockHttpServletRequest();
		MockHttpServletResponse servletResponse = new MockHttpServletResponse();

		assertThatThrownBy(() -> authController.logout(servletRequest, servletResponse))
			.isInstanceOf(BusinessException.class)
			.extracting("responseCode")
			.isEqualTo(ResponseCode.TOKEN_MISSING);
	}
}
