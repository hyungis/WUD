package com.woojudraw.domain.daily.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.woojudraw.domain.daily.entity.Daily;

public interface DailyRepository extends JpaRepository<Daily, Long> {

	boolean existsByUser_IdAndEntryDateAndDeletedAtIsNull(Long userId, LocalDate entryDate);

	List<Daily> findAllByUser_IdAndDeletedAtIsNullOrderByEntryDateDescIdDesc(Long userId);

	List<Daily> findAllByUser_IdAndDeletedAtIsNullAndEntryDateBetweenOrderByEntryDateDescIdDesc(
		Long userId,
		LocalDate startDate,
		LocalDate endDate
	);
}
