package com.woojudraw.domain.deep.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.woojudraw.domain.deep.entity.DeepSubmission;

public interface DeepSubmissionRepository extends JpaRepository<DeepSubmission, Long> {

	List<DeepSubmission> findAllByDeepSession_IdOrderByIdAsc(Long deepSessionId);
}
