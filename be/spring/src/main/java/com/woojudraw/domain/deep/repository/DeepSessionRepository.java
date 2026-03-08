package com.woojudraw.domain.deep.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.woojudraw.domain.deep.entity.DeepSession;
import com.woojudraw.domain.deep.entity.DeepSubmission;

public interface DeepSessionRepository extends JpaRepository<DeepSession, Long> {

	Optional<DeepSession> findByIdAndUserId(Long id, Long userId);
}
