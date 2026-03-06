package com.woojudraw.domain.deep.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.woojudraw.domain.deep.entity.DeepSubmission;

public interface DeepSubmissionRepository extends JpaRepository<DeepSubmission, Long> {
}
