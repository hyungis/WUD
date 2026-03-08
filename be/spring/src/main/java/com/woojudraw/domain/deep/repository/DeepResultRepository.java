package com.woojudraw.domain.deep.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.woojudraw.domain.deep.entity.DeepResult;

public interface DeepResultRepository extends JpaRepository<DeepResult, Long> {
	Optional<DeepResult> findByDeepSessionId(Long deepSessionId);
}
