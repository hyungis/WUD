package com.woojudraw.global.security.oauth2;

import java.util.Collections;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.woojudraw.domain.user.entity.AuthProvider;
import com.woojudraw.domain.user.entity.User;
import com.woojudraw.domain.user.repository.AuthProviderRepository;
import com.woojudraw.domain.user.repository.UserRepository;
import com.woojudraw.global.exception.ResponseCode;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

	private final UserRepository userRepository;
	private final AuthProviderRepository authProviderRepository;

	@Override
	@Transactional
	public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
		OAuth2UserService<OAuth2UserRequest, OAuth2User> delegate = new DefaultOAuth2UserService();
		OAuth2User oAuth2User = delegate.loadUser(userRequest);

		String registrationId = userRequest.getClientRegistration().getRegistrationId();
		String userNameAttributeName = userRequest.getClientRegistration()
			.getProviderDetails()
			.getUserInfoEndpoint()
			.getUserNameAttributeName();

		Map<String, Object> attributes = oAuth2User.getAttributes();

		String providerUserId = (String)attributes.get(userNameAttributeName);
		String email = (String)attributes.get("email");
		String name = (String)attributes.get("name");

		if (email == null) {
			throw new OAuth2AuthenticationException(ResponseCode.INVALID_LOGIN.message());
		}

		processOAuth2User(registrationId, providerUserId, email, name);

		return new DefaultOAuth2User(
			Collections.singleton(new SimpleGrantedAuthority("ROLE_USER")),
			attributes,
			userNameAttributeName
		);
	}

	private void processOAuth2User(String provider, String providerUserId, String email, String name) {
		Optional<AuthProvider> authProviderOptional = authProviderRepository.findByProviderAndProviderUserId(provider,
			providerUserId);

		if (authProviderOptional.isPresent()) {
			AuthProvider authProvider = authProviderOptional.get();
			User user = authProvider.getUser();
			user.updateLastLogin();
			return;
		}

		// 해당 제공자의 식별정보가 없으면 이메일로 기존 유저 확인
		User user = userRepository.findByEmail(email)
			.orElseGet(() -> {
				User newUser = User.builder()
					.email(email)
					.nickname(name != null ? name : "USER_" + UUID.randomUUID().toString().substring(0, 8))
					.password(UUID.randomUUID().toString())
					.build();
				newUser.updateLastLogin();
				return userRepository.save(newUser);
			});

		// 새로운 인증 제공자 정보 저장
		AuthProvider newAuthProvider = AuthProvider.builder()
			.user(user)
			.provider(provider)
			.providerUserId(providerUserId)
			.providerEmail(email)
			.build();
		authProviderRepository.save(newAuthProvider);

		user.updateLastLogin();
	}}