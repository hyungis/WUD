package com.woojudraw.domain.deep.repository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.woojudraw.domain.deep.entity.DeepSession;
import com.woojudraw.domain.deep.entity.DeepStatus;
import com.woojudraw.domain.deep.entity.DeepSubmission;
import com.woojudraw.domain.deep.entity.DeepType;

public interface DeepSessionRepository extends JpaRepository<DeepSession, Long> {

	Optional<DeepSession> findByIdAndUser_Id(Long id, Long userId);

	List<DeepSession> findAllByUser_IdOrderByCreatedAtDesc(Long userId);

	boolean existsByUser_IdAndDeepTypeAndStatusInAndCreatedAtAfter(
		Long userId,
		DeepType deepType,
		Collection<DeepStatus> statuses,
		OffsetDateTime after
	);
}
