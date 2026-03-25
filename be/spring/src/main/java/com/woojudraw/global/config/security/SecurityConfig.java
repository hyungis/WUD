package com.woojudraw.global.config.security;

import java.io.IOException;
import java.util.Arrays;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.woojudraw.global.exception.ResponseCode;
import com.woojudraw.global.response.ApiResponse;
import com.woojudraw.global.security.jwt.JwtAuthenticationFilter;
import com.woojudraw.global.security.jwt.JwtTokenProvider;
import com.woojudraw.global.security.jwt.RedisTokenStore;
import com.woojudraw.global.security.oauth2.CustomOAuth2UserService;
import com.woojudraw.global.security.oauth2.OAuth2AuthenticationFailureHandler;
import com.woojudraw.global.security.oauth2.OAuth2AuthenticationSuccessHandler;

import lombok.RequiredArgsConstructor;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

	private final JwtTokenProvider jwtTokenProvider;
	private final RedisTokenStore redisTokenStore;
	private final CustomOAuth2UserService customOAuth2UserService;
	private final OAuth2AuthenticationSuccessHandler oauth2AuthenticationSuccessHandler;
	private final OAuth2AuthenticationFailureHandler oauth2AuthenticationFailureHandler;
	private final ObjectMapper objectMapper = new ObjectMapper();

	@Value("${app.cors.allowed-origins:http://localhost:5173,http://127.0.0.1:5173}")
	private String allowedOrigins;

	private static final String[] PERMIT_ALL = {
			"/health",
			"/actuator/health",
			"/actuator/prometheus",
			"/actuator/metrics",
			"/swagger-ui/**",
			"/v3/api-docs/**",
			"/rabbitmq/**",
			"/auth/signup",
			"/auth/login",
			"/auth/refresh",
			"/oauth2/**",
			"/login/oauth2/**"
	};

	@Bean
	public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
		http
				.cors(cors -> cors.configurationSource(corsConfigurationSource()))
				.csrf(csrf -> csrf.disable())
				.sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.formLogin(form -> form.disable())
				.httpBasic(basic -> basic.disable())
				.exceptionHandling(ex -> ex
						.authenticationEntryPoint((request, response, authException) -> writeErrorResponse(response,
								ResponseCode.LOGIN_REQUIRED))
						.accessDeniedHandler((request, response, accessDeniedException) -> writeErrorResponse(response,
								ResponseCode.FORBIDDEN)))
				.addFilterBefore(new JwtAuthenticationFilter(jwtTokenProvider, redisTokenStore),
						UsernamePasswordAuthenticationFilter.class)
				.authorizeHttpRequests(auth -> auth
						.requestMatchers(PERMIT_ALL).permitAll()
						.anyRequest().authenticated())
				.oauth2Login(oauth2 -> oauth2
						.userInfoEndpoint(userInfo -> userInfo.userService(customOAuth2UserService))
						.successHandler(oauth2AuthenticationSuccessHandler)
						.failureHandler(oauth2AuthenticationFailureHandler));

		return http.build();
	}

	@Bean
	public CorsConfigurationSource corsConfigurationSource() {
		CorsConfiguration configuration = new CorsConfiguration();
		// 프론트엔드의 주소 허용 (환경 변수로 관리 가능)
		configuration.setAllowedOrigins(Arrays.asList(allowedOrigins.split(",")));
		// 허용할 HTTP 메서드
		configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
		// 허용할 HTTP 헤더
		configuration.setAllowedHeaders(Arrays.asList("*"));
		// 프론트엔드가 응답 헤더(예: JWT 토큰)를 읽을 수 있도록 허용
		configuration.setExposedHeaders(Arrays.asList("Authorization", "Authorization-refresh"));
		// 쿠키를 포함한 요청 허용 (토큰이나 세션 사용 시 필수)
		configuration.setAllowCredentials(true);
		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		// 모든 경로(/**)에 대해 위 CORS 설정을 적용
		source.registerCorsConfiguration("/**", configuration);
		return source;
	}

	@Bean
	public PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

	private void writeErrorResponse(HttpServletResponse response, ResponseCode responseCode) throws IOException {
		response.setStatus(responseCode.httpStatus().value());
		response.setContentType("application/json;charset=UTF-8");
		response.getWriter().write(
				objectMapper.writeValueAsString(ApiResponse.fail(responseCode.code(), responseCode.message(), null)));
	}
}
