package com.woojudraw.domain.constellation.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.woojudraw.domain.constellation.entity.CenterStar;

public interface CenterStarRepository extends JpaRepository<CenterStar, Long> {
	Optional<CenterStar> findByUser_Id(Long userId);
}
