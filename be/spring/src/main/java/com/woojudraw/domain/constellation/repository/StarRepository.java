package com.woojudraw.domain.constellation.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.woojudraw.domain.constellation.entity.Star;
import com.woojudraw.domain.constellation.entity.StarKind;

public interface StarRepository extends JpaRepository<Star, Long> {
	boolean existsByDeepSessionId(Long deepSessionId);
	boolean existsByConstellation_IdAndKind(Long constellationId, StarKind kind);
}
