package com.woojudraw.domain.auth.application.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
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
import com.woojudraw.domain.auth.api.dto.resp.LoginResp;
import com.woojudraw.domain.user.entity.User;
import com.woojudraw.domain.user.repository.UserRepository;
import com.woojudraw.global.exception.BusinessException;
import com.woojudraw.global.exception.ResponseCode;
import com.woojudraw.global.security.jwt.JwtTokenProvider;
import com.woojudraw.global.security.jwt.RedisTokenStore;

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
		when(jwtTokenProvider.createAccessToken(1L, "ROLE_USER")).thenReturn("access-token");
		when(jwtTokenProvider.createRefreshToken(1L)).thenReturn("refresh-token");
		when(jwtTokenProvider.getAccessTokenExpiresInSec()).thenReturn(1800L);
		when(jwtTokenProvider.getRefreshTokenExpiresInSec()).thenReturn(1209600L);

		LoginResp response = authService.login(req);

		assertThat(response.getAccessToken()).isEqualTo("access-token");
		assertThat(response.getRefreshToken()).isEqualTo("refresh-token");
		assertThat(response.getExpiresInSec()).isEqualTo(1800L);
		verify(redisTokenStore).saveRefreshToken(1L, "refresh-token", 1209600L);
	}

	@Test
	void logoutBlacklistsAccessTokenAndDeletesRefreshToken() {
		when(jwtTokenProvider.getMemberId("access-token")).thenReturn(1L);
		when(jwtTokenProvider.getRemainingValidityInSec("access-token")).thenReturn(900L);

		authService.logout("access-token");

		verify(redisTokenStore).blacklistAccessToken("access-token", 900L);
		verify(redisTokenStore).deleteRefreshToken(1L);
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
		verify(jwtTokenProvider, never()).createAccessToken(anyLong(), anyString());
	}
}
