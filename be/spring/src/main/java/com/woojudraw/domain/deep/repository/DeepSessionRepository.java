package com.woojudraw.domain.deep.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.woojudraw.domain.deep.entity.DeepSession;

public interface DeepSessionRepository extends JpaRepository<DeepSession, Long> {
}
