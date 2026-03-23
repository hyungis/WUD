package com.woojudraw.domain.user.application.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.woojudraw.domain.user.entity.User;
import com.woojudraw.domain.user.repository.AuthProviderRepository;
import com.woojudraw.domain.user.repository.UserRepository;
import com.woojudraw.global.exception.BusinessException;
import com.woojudraw.global.exception.ResponseCode;

@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

	@Mock
	private UserRepository userRepository;
	@Mock
	private AuthProviderRepository authProviderRepository;
	@Mock
	private PasswordEncoder passwordEncoder;

	private UserServiceImpl userService;

	@BeforeEach
	void setUp() {
		userService = new UserServiceImpl(userRepository, authProviderRepository, passwordEncoder);
	}

	@Test
	void completeTutorialMarksUserAsCompleted() {
		User user = User.builder()
			.id(1L)
			.email("test@example.com")
			.password("encoded-password")
			.nickname("tester")
			.build();

		when(userRepository.findById(1L)).thenReturn(Optional.of(user));

		userService.completeTutorial(1L);

		assertThat(user.isTutorialCompleted()).isTrue();
	}

	@Test
	void completeTutorialThrowsWhenUserMissing() {
		when(userRepository.findById(1L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> userService.completeTutorial(1L))
			.isInstanceOf(BusinessException.class)
			.extracting("responseCode")
			.isEqualTo(ResponseCode.USER_NOT_FOUND);

		verify(userRepository).findById(1L);
	}
}
