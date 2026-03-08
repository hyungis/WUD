package com.woojudraw.domain.deep.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.woojudraw.domain.deep.entity.DeepPsychAssessment;
import com.woojudraw.domain.deep.entity.PsychTestCode;

public interface DeepPsychAssessmentRepository extends JpaRepository<DeepPsychAssessment, Long> {
	Optional<DeepPsychAssessment> findByDeepSessionIdAndTestCode(Long deepSessionId, PsychTestCode testCode);
}
