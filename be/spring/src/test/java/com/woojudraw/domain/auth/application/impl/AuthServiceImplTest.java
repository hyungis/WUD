package com.woojudraw.domain.auth.application.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import com.woojudraw.domain.auth.api.dto.req.LoginReq;
import com.woojudraw.domain.auth.api.dto.req.SignupReq;
import com.woojudraw.domain.auth.application.dto.IssuedTokens;
import com.woojudraw.domain.user.entity.User;
import com.woojudraw.domain.user.repository.UserRepository;
import com.woojudraw.global.exception.BusinessException;
import com.woojudraw.global.exception.ResponseCode;
import com.woojudraw.global.security.jwt.JwtTokenProvider;
import com.woojudraw.global.security.jwt.RedisTokenStore;

import io.jsonwebtoken.Claims;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

	@Mock
	private UserRepository userRepository;
	@Mock
	private PasswordEncoder passwordEncoder;
	@Mock
	private JwtTokenProvider jwtTokenProvider;
	@Mock
	private RedisTokenStore redisTokenStore;

	private AuthServiceImpl authService;

	@BeforeEach
	void setUp() {
		authService = new AuthServiceImpl(userRepository, passwordEncoder, jwtTokenProvider, redisTokenStore);
	}

	@Test
	void loginStoresRefreshTokenAndReturnsTokens() {
		LoginReq req = new LoginReq();
		ReflectionTestUtils.setField(req, "email", "test@example.com");
		ReflectionTestUtils.setField(req, "password", "plain-password");

		User user = User.builder()
			.id(1L)
			.email("test@example.com")
			.password("encoded-password")
			.nickname("tester")
			.build();

		when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
		when(passwordEncoder.matches("plain-password", "encoded-password")).thenReturn(true);
		when(jwtTokenProvider.createAccessToken(eq(1L), eq("ROLE_USER"), anyString())).thenReturn("access-token");
		when(jwtTokenProvider.createRefreshToken(eq(1L), anyString())).thenReturn("refresh-token");
		when(jwtTokenProvider.getAccessTokenExpiresInSec()).thenReturn(1800L);
		when(jwtTokenProvider.getRefreshTokenExpiresInSec()).thenReturn(1209600L);

		IssuedTokens response = authService.login(req);

		assertThat(response.getAccessToken()).isEqualTo("access-token");
		assertThat(response.getRefreshToken()).isEqualTo("refresh-token");
		assertThat(response.getAccessTokenExpiresInSec()).isEqualTo(1800L);
		verify(redisTokenStore).saveRefreshToken(eq(1L), anyString(), eq("refresh-token"), eq(1209600L));
	}

	@Test
	void refreshRotatesTokensWhenRefreshTokenMatchesRedis() {
		Claims claims = mock(Claims.class);
		when(jwtTokenProvider.parseClaims("refresh-token")).thenReturn(claims);
		when(claims.getSubject()).thenReturn("1");
		when(claims.get("sid", String.class)).thenReturn("session-1");
		when(redisTokenStore.isRefreshTokenMatched(1L, "session-1", "refresh-token")).thenReturn(true);
		when(jwtTokenProvider.createAccessToken(1L, "ROLE_USER", "session-1")).thenReturn("new-access-token");
		when(jwtTokenProvider.createRefreshToken(1L, "session-1")).thenReturn("new-refresh-token");
		when(jwtTokenProvider.getAccessTokenExpiresInSec()).thenReturn(1800L);
		when(jwtTokenProvider.getRefreshTokenExpiresInSec()).thenReturn(1209600L);

		IssuedTokens response = authService.refresh("refresh-token");

		assertThat(response.getAccessToken()).isEqualTo("new-access-token");
		assertThat(response.getRefreshToken()).isEqualTo("new-refresh-token");
		verify(redisTokenStore).saveRefreshToken(1L, "session-1", "new-refresh-token", 1209600L);
	}

	@Test
	void refreshThrowsWhenRefreshTokenMissing() {
		assertThatThrownBy(() -> authService.refresh(null))
			.isInstanceOf(BusinessException.class)
			.extracting("responseCode")
			.isEqualTo(ResponseCode.TOKEN_MISSING);
	}

	@Test
	void refreshThrowsWhenRedisValueDoesNotMatch() {
		Claims claims = mock(Claims.class);
		when(jwtTokenProvider.parseClaims("refresh-token")).thenReturn(claims);
		when(claims.getSubject()).thenReturn("1");
		when(claims.get("sid", String.class)).thenReturn("session-1");
		when(redisTokenStore.isRefreshTokenMatched(1L, "session-1", "refresh-token")).thenReturn(false);

		assertThatThrownBy(() -> authService.refresh("refresh-token"))
			.isInstanceOf(BusinessException.class)
			.extracting("responseCode")
			.isEqualTo(ResponseCode.INVALID_TOKEN);
	}

	@Test
	void logoutBlacklistsAccessTokenAndDeletesRefreshToken() {
		when(jwtTokenProvider.getMemberId("access-token")).thenReturn(1L);
		when(jwtTokenProvider.getSessionId("access-token")).thenReturn("session-1");
		when(jwtTokenProvider.getRemainingValidityInSec("access-token")).thenReturn(900L);

		authService.logout("access-token");

		verify(redisTokenStore).blacklistAccessToken("access-token", 900L);
		verify(redisTokenStore).deleteRefreshToken(1L, "session-1");
	}

	@Test
	void signupThrowsWhenEmailDuplicated() {
		SignupReq req = new SignupReq();
		ReflectionTestUtils.setField(req, "email", "dup@example.com");
		ReflectionTestUtils.setField(req, "password", "password1234");
		ReflectionTestUtils.setField(req, "nickname", "dup");

		when(userRepository.existsByEmail("dup@example.com")).thenReturn(true);

		assertThatThrownBy(() -> authService.signup(req))
			.isInstanceOf(BusinessException.class)
			.extracting("responseCode")
			.isEqualTo(ResponseCode.DUPLICATE_EMAIL);

		verify(userRepository, never()).save(org.mockito.ArgumentMatchers.any(User.class));
		verify(passwordEncoder, never()).encode(anyString());
		verify(jwtTokenProvider, never()).createAccessToken(anyLong(), anyString(), anyString());
	}
}
