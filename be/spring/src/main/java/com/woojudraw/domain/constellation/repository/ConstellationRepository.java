package com.woojudraw.domain.constellation.repository;

import java.time.LocalDate;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.woojudraw.domain.constellation.entity.Constellation;

public interface ConstellationRepository extends JpaRepository<Constellation, Long> {
	Optional<Constellation> findByUserIdAndWeekStartDate(Long userId, LocalDate weekStartDate);
}
