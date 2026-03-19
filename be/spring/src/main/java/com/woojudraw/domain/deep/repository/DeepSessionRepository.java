package com.woojudraw.domain.deep.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.woojudraw.domain.deep.entity.DeepSession;
public interface DeepSessionRepository extends JpaRepository<DeepSession, Long> {

	Optional<DeepSession> findByIdAndUser_Id(Long id, Long userId);

	List<DeepSession> findAllByUser_IdOrderByCreatedAtDesc(Long userId);
}
