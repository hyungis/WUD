package com.woojudraw.domain.deep.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.woojudraw.domain.deep.entity.DeepPsychAssessment;
import com.woojudraw.domain.deep.entity.PsychTestCode;

public interface DeepPsychAssessmentRepository extends JpaRepository<DeepPsychAssessment, Long> {
	Optional<DeepPsychAssessment> findByDeepSession_IdAndTestCode(Long deepSessionId, PsychTestCode testCode);

	List<DeepPsychAssessment> findAllByDeepSession_IdOrderByIdAsc(Long deepSessionId);
}
