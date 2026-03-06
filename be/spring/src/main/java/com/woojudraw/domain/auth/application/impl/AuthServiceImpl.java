package com.woojudraw.domain.auth.application.impl;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.woojudraw.domain.auth.api.dto.req.LoginReq;
import com.woojudraw.domain.auth.api.dto.req.SignupReq;
import com.woojudraw.domain.auth.api.dto.resp.LoginResp;
import com.woojudraw.domain.auth.application.AuthService;
import com.woojudraw.domain.user.entity.User;
import com.woojudraw.domain.user.repository.UserRepository;
import com.woojudraw.global.exception.BusinessException;
import com.woojudraw.global.exception.ResponseCode;
import com.woojudraw.global.security.jwt.JwtTokenProvider;
import com.woojudraw.global.security.jwt.RedisTokenStore;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthServiceImpl implements AuthService {

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final JwtTokenProvider jwtTokenProvider;
	private final RedisTokenStore redisTokenStore;

	@Override
	public void signup(SignupReq req) {

		if (userRepository.existsByEmail(req.getEmail())) {
			throw new BusinessException(ResponseCode.DUPLICATE_EMAIL);
		}

		User user = User.builder()
			.email(req.getEmail())
			.password(passwordEncoder.encode(req.getPassword()))
			.nickname(req.getNickname())
			.build();

		userRepository.save(user);
	}

	@Override
	public LoginResp login(LoginReq req) {

		User user = userRepository.findByEmail(req.getEmail())
			.orElseThrow(() -> new BusinessException(ResponseCode.INVALID_LOGIN));

		if (!passwordEncoder.matches(req.getPassword(), user.getPassword())) {
			throw new BusinessException(ResponseCode.INVALID_LOGIN);
		}

		user.updateLastLogin();

		String accessToken = jwtTokenProvider.createAccessToken(
			user.getId(),
			"ROLE_USER"
		);
		String refreshToken = jwtTokenProvider.createRefreshToken(user.getId());
		redisTokenStore.saveRefreshToken(user.getId(), refreshToken, jwtTokenProvider.getRefreshTokenExpiresInSec());

		return LoginResp.builder()
			.accessToken(accessToken)
			.refreshToken(refreshToken)
			.expiresInSec(jwtTokenProvider.getAccessTokenExpiresInSec())
			.build();
	}

	@Override
	public void logout(String accessToken) {
		Long memberId = jwtTokenProvider.getMemberId(accessToken);
		long remainingValidityInSec = jwtTokenProvider.getRemainingValidityInSec(accessToken);

		redisTokenStore.blacklistAccessToken(accessToken, remainingValidityInSec);
		redisTokenStore.deleteRefreshToken(memberId);
	}
}
