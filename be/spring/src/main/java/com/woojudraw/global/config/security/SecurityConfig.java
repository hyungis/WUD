package com.woojudraw.global.config.security;

import java.io.IOException;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.woojudraw.global.exception.ResponseCode;
import com.woojudraw.global.response.ApiResponse;
import com.woojudraw.global.security.jwt.JwtAuthenticationFilter;
import com.woojudraw.global.security.jwt.JwtTokenProvider;
import com.woojudraw.global.security.jwt.RedisTokenStore;
import lombok.RequiredArgsConstructor;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

	private final JwtTokenProvider jwtTokenProvider;
	private final RedisTokenStore redisTokenStore;
	private final ObjectMapper objectMapper = new ObjectMapper();

	private static final String[] PERMIT_ALL = {
		"/health",
		"/actuator/health",
		"/swagger-ui/**",
		"/v3/api-docs/**",
		"/rabbitmq/**",
		"/auth/signup",
		"/auth/login"
	};

	@Bean
	public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
		http
			.csrf(csrf -> csrf.disable())
			.sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
			.formLogin(form -> form.disable())
			.httpBasic(basic -> basic.disable())
			.exceptionHandling(ex -> ex
				.authenticationEntryPoint((request, response, authException) ->
					writeErrorResponse(response, ResponseCode.LOGIN_REQUIRED))
				.accessDeniedHandler((request, response, accessDeniedException) ->
					writeErrorResponse(response, ResponseCode.FORBIDDEN))
			)
			.addFilterBefore(new JwtAuthenticationFilter(jwtTokenProvider, redisTokenStore), UsernamePasswordAuthenticationFilter.class)
			.authorizeHttpRequests(auth -> auth
				.requestMatchers(PERMIT_ALL).permitAll()
				.anyRequest().authenticated()
			);

		return http.build();
	}

	@Bean
	public PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

	private void writeErrorResponse(HttpServletResponse response, ResponseCode responseCode) throws IOException {
		response.setStatus(responseCode.httpStatus().value());
		response.setContentType("application/json;charset=UTF-8");
		response.getWriter().write(
			objectMapper.writeValueAsString(ApiResponse.fail(responseCode.code(), responseCode.message(), null))
		);
	}
}
