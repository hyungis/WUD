package com.woojudraw.domain.user.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.woojudraw.domain.user.entity.AuthProvider;

public interface AuthProviderRepository extends JpaRepository<AuthProvider, Long> {

	Optional<AuthProvider> findByProviderAndProviderUserId(String provider, String providerUserId);

	Optional<AuthProvider> findByProviderAndProviderUserIdAndUnlinkedAtIsNull(String provider, String providerUserId);

	boolean existsByProviderAndProviderUserId(String provider, String providerUserId);

	java.util.List<AuthProvider> findByUserId(Long userId);
}
