package com.woojudraw.global.security.jwt;

import java.io.IOException;
import java.util.List;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.woojudraw.global.exception.ResponseCode;
import com.woojudraw.global.response.ApiResponse;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

	private static final String AUTHORIZATION_HEADER = "Authorization";
	private static final String BEARER_PREFIX = "Bearer ";

	private final JwtTokenProvider jwtTokenProvider;
	private final ObjectMapper objectMapper = new ObjectMapper();

	@Override
	protected void doFilterInternal(
		HttpServletRequest request,
		HttpServletResponse response,
		FilterChain filterChain
	) throws ServletException, IOException {
		String token = resolveBearerToken(request);
		if (token == null) {
			filterChain.doFilter(request, response);
			return;
		}

		try {
			Claims claims = jwtTokenProvider.parseClaims(token);
			Long memberId = Long.valueOf(claims.getSubject());
			String role = claims.get("role", String.class);

			UsernamePasswordAuthenticationToken authentication =
				new UsernamePasswordAuthenticationToken(memberId, null, toAuthorities(role));
			SecurityContextHolder.getContext().setAuthentication(authentication);
		} catch (JwtException | IllegalArgumentException exception) {
			SecurityContextHolder.clearContext();
			writeErrorResponse(response, ResponseCode.INVALID_TOKEN);
			return;
		}

		filterChain.doFilter(request, response);
	}

	private List<SimpleGrantedAuthority> toAuthorities(String role) {
		if (role == null || role.isBlank()) {
			return List.of();
		}

		String authority = role.startsWith("ROLE_") ? role : "ROLE_" + role;
		return List.of(new SimpleGrantedAuthority(authority));
	}

	private String resolveBearerToken(HttpServletRequest request) {
		String authorization = request.getHeader(AUTHORIZATION_HEADER);
		if (authorization == null || !authorization.startsWith(BEARER_PREFIX)) {
			return null;
		}

		return authorization.substring(BEARER_PREFIX.length());
	}

	private void writeErrorResponse(HttpServletResponse response, ResponseCode responseCode) throws IOException {
		response.setStatus(responseCode.httpStatus().value());
		response.setContentType("application/json;charset=UTF-8");
		response.getWriter().write(
			objectMapper.writeValueAsString(ApiResponse.fail(responseCode.code(), responseCode.message(), null))
		);
	}
}
