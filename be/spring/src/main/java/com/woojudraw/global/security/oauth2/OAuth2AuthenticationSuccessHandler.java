package com.woojudraw.global.security.oauth2;

import java.io.IOException;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import com.woojudraw.domain.user.entity.User;
import com.woojudraw.domain.user.repository.UserRepository;
import com.woojudraw.global.exception.BusinessException;
import com.woojudraw.global.exception.ResponseCode;
import com.woojudraw.global.security.jwt.JwtTokenProvider;
import com.woojudraw.global.security.jwt.RedisTokenStore;
import com.woojudraw.global.security.jwt.RefreshTokenCookieProvider;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

	private final JwtTokenProvider jwtTokenProvider;
	private final RedisTokenStore redisTokenStore;
	private final RefreshTokenCookieProvider refreshTokenCookieProvider;
	private final UserRepository userRepository;

	@Value("${app.oauth2.authorized-redirect-uri:http://localhost:5173/oauth/success}")
	private String redirectUri;

	@Override
	public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
		Authentication authentication) throws IOException {
		OAuth2User oAuth2User = (OAuth2User)authentication.getPrincipal();
		String email = oAuth2User.getAttribute("email");

		User user = userRepository.findByEmail(email)
			.orElseThrow(() -> new BusinessException(ResponseCode.USER_NOT_FOUND));

		String sessionId = UUID.randomUUID().toString();

		String refreshToken = jwtTokenProvider.createRefreshToken(user.getId(), sessionId);
		long refreshTokenExpiresInSec = jwtTokenProvider.getRefreshTokenExpiresInSec();

		redisTokenStore.saveRefreshToken(user.getId(), sessionId, refreshToken, refreshTokenExpiresInSec);

		refreshTokenCookieProvider.addRefreshTokenCookie(response, refreshToken, refreshTokenExpiresInSec);

		String targetUrl = UriComponentsBuilder.fromUriString(redirectUri)
			.build().toUriString();

		getRedirectStrategy().sendRedirect(request, response, targetUrl);
	}
}
