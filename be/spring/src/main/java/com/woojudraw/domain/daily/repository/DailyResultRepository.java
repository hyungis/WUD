package com.woojudraw.domain.daily.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.woojudraw.domain.daily.entity.DailyResult;

public interface DailyResultRepository extends JpaRepository<DailyResult, Long> {

	Optional<DailyResult> findByDaily_Id(Long dailyId);

	List<DailyResult> findAllByDaily_IdIn(List<Long> dailyIds);
}
