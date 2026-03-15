package com.woojudraw.domain.daily.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.woojudraw.domain.daily.entity.Daily;

public interface DailyRepository extends JpaRepository<Daily, Long> {

	boolean existsByUsersIdAndEntryDateAndDeletedAtIsNull(Long usersId, LocalDate entryDate);

	List<Daily> findAllByUsersIdAndDeletedAtIsNullOrderByEntryDateDescIdDesc(Long usersId);

	List<Daily> findAllByUsersIdAndDeletedAtIsNullAndEntryDateBetweenOrderByEntryDateDescIdDesc(
		Long usersId,
		LocalDate startDate,
		LocalDate endDate
	);
}
