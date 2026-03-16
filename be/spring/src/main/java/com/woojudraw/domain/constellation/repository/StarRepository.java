package com.woojudraw.domain.constellation.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.woojudraw.domain.constellation.entity.Star;
import com.woojudraw.domain.constellation.entity.StarKind;

public interface StarRepository extends JpaRepository<Star, Long> {
	boolean existsByDeepSessionId(Long deepSessionId);

	boolean existsByDailyEntryId(Long dailyEntryId);

	boolean existsByConstellation_IdAndKind(Long constellationId, StarKind kind);

	@Query("select s from Star s join fetch s.constellation c where s.userId = :userId order by s.createdAt asc")
	List<Star> findAllByUserIdWithConstellation(Long userId);

	@Query("select s from Star s join fetch s.constellation c where s.constellation.id in :constellationIds order by s.createdAt asc")
	List<Star> findAllByConstellationIds(List<Long> constellationIds);

}
