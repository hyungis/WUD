package com.woojudraw.global.security.oauth2;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationFailureHandler extends SimpleUrlAuthenticationFailureHandler {

	@Value("${app.oauth2.authorized-redirect-uri:http://localhost:5173/oauth/success}")
	private String redirectUri;

	@Override
	public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response,
		AuthenticationException exception) throws IOException {

		log.error("OAuth2 Authentication Failed: {}", exception.getMessage());

		// 프론트엔드 로그인 페이지로 리다이렉트 (예: http://localhost:5173/login)
		// 성공 시 주소가 /oauth/success 이므로, 실패 시에는 /login 또는 /oauth/failure 등으로 조절 가능
		// 여기서는 /login?error=... 형태로 보냅니다.
		String targetUrl = UriComponentsBuilder.fromUriString(redirectUri)
			.replacePath("/login") // /oauth/success 대신 /login 으로 변경
			.queryParam("error", URLEncoder.encode(exception.getMessage(), StandardCharsets.UTF_8))
			.build().toUriString();

		getRedirectStrategy().sendRedirect(request, response, targetUrl);
	}
}
