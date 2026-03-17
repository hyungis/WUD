package com.woojudraw.domain.auth.application.impl;

import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.woojudraw.domain.auth.api.dto.req.LoginReq;
import com.woojudraw.domain.auth.api.dto.req.SignupReq;
import com.woojudraw.domain.auth.application.AuthService;
import com.woojudraw.domain.auth.application.dto.IssuedTokens;
import com.woojudraw.domain.user.entity.User;
import com.woojudraw.domain.user.entity.UserStatus;
import com.woojudraw.domain.user.repository.UserRepository;
import com.woojudraw.global.exception.BusinessException;
import com.woojudraw.global.exception.ResponseCode;
import com.woojudraw.global.security.jwt.JwtTokenProvider;
import com.woojudraw.global.security.jwt.RedisTokenStore;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthServiceImpl implements AuthService {

	private static final String DEFAULT_ROLE = "ROLE_USER";
	private static final String SESSION_ID_CLAIM = "sid";

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
	public IssuedTokens login(LoginReq req) {

		User user = userRepository.findByEmail(req.getEmail())
			.orElseThrow(() -> new BusinessException(ResponseCode.INVALID_LOGIN));

		if(user.getStatus() == UserStatus.DELETED){
			throw new BusinessException(ResponseCode.USER_DELETED);
		}

		if (!passwordEncoder.matches(req.getPassword(), user.getPassword())) {
			throw new BusinessException(ResponseCode.INVALID_LOGIN);
		}

		user.updateLastLogin();
		String sessionId = UUID.randomUUID().toString();
		return issueTokens(user.getId(), sessionId);
	}

	@Override
	public IssuedTokens refresh(String refreshToken) {
		if (refreshToken == null || refreshToken.isBlank()) {
			throw new BusinessException(ResponseCode.TOKEN_MISSING);
		}

		Claims claims = parseRefreshClaims(refreshToken);
		Long memberId = parseMemberId(claims.getSubject());
		String sessionId = claims.get(SESSION_ID_CLAIM, String.class);

		if (sessionId == null || sessionId.isBlank()) {
			throw new BusinessException(ResponseCode.INVALID_TOKEN);
		}

		boolean matched = redisTokenStore.isRefreshTokenMatched(memberId, sessionId, refreshToken);
		if (!matched) {
			throw new BusinessException(ResponseCode.INVALID_TOKEN);
		}

		return issueTokens(memberId, sessionId);
	}

	@Override
	public void logout(String accessToken) {
		Long memberId = jwtTokenProvider.getMemberId(accessToken);
		String sessionId = jwtTokenProvider.getSessionId(accessToken);
		long remainingValidityInSec = jwtTokenProvider.getRemainingValidityInSec(accessToken);

		redisTokenStore.blacklistAccessToken(accessToken, remainingValidityInSec);
		redisTokenStore.deleteRefreshToken(memberId, sessionId);
	}

	private Claims parseRefreshClaims(String refreshToken) {
		try {
			return jwtTokenProvider.parseClaims(refreshToken);
		} catch (ExpiredJwtException exception) {
			throw new BusinessException(ResponseCode.EXPIRED_TOKEN);
		} catch (JwtException | IllegalArgumentException exception) {
			throw new BusinessException(ResponseCode.INVALID_TOKEN);
		}
	}

	private Long parseMemberId(String subject) {
		try {
			return Long.valueOf(subject);
		} catch (NumberFormatException exception) {
			throw new BusinessException(ResponseCode.INVALID_TOKEN);
		}
	}

	private IssuedTokens issueTokens(Long memberId, String sessionId) {
		String accessToken = jwtTokenProvider.createAccessToken(memberId, DEFAULT_ROLE, sessionId);
		String refreshToken = jwtTokenProvider.createRefreshToken(memberId, sessionId);
		long accessTokenExpiresInSec = jwtTokenProvider.getAccessTokenExpiresInSec();
		long refreshTokenExpiresInSec = jwtTokenProvider.getRefreshTokenExpiresInSec();

		redisTokenStore.saveRefreshToken(memberId, sessionId, refreshToken, refreshTokenExpiresInSec);

		return IssuedTokens.builder()
			.accessToken(accessToken)
			.refreshToken(refreshToken)
			.accessTokenExpiresInSec(accessTokenExpiresInSec)
			.refreshTokenExpiresInSec(refreshTokenExpiresInSec)
			.build();
	}
}
