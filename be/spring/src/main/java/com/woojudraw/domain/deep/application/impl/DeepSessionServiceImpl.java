package com.woojudraw.domain.deep.application.impl;

import java.time.DayOfWeek;
import java.time.LocalDate;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.woojudraw.domain.deep.api.dto.req.CreateDeepSessionReq;
import com.woojudraw.domain.deep.api.dto.req.SubmitWho5Req;
import com.woojudraw.domain.deep.api.dto.resp.CreateDeepSessionResp;
import com.woojudraw.domain.deep.api.dto.resp.SubmitWho5Resp;
import com.woojudraw.domain.deep.application.DeepSessionService;
import com.woojudraw.domain.deep.entity.DeepPsychAssessment;
import com.woojudraw.domain.deep.entity.DeepSession;
import com.woojudraw.domain.deep.repository.DeepPsychAssessmentRepository;
import com.woojudraw.domain.deep.repository.DeepSessionRepository;
import com.woojudraw.global.exception.BusinessException;
import com.woojudraw.global.exception.ResponseCode;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class DeepSessionServiceImpl implements DeepSessionService {

	private final DeepSessionRepository deepSessionRepository;
	private final DeepPsychAssessmentRepository deepPsychAssessmentRepository;
	private final ObjectMapper objectMapper;

	@Override
	public CreateDeepSessionResp createDeepSession(Long userId, CreateDeepSessionReq request) {
		DeepSession deepSession = DeepSession.create(userId);
		DeepSession saved = deepSessionRepository.save(deepSession);

		return CreateDeepSessionResp.builder()
			.sessionId(saved.getId())
			.status(saved.getStatus())
			.build();
	}

	@Override
	public SubmitWho5Resp submitWho5(Long userId, Long sessionId, SubmitWho5Req request) {
		DeepSession deepSession = deepSessionRepository.findById(sessionId)
			.orElseThrow(() -> new BusinessException(ResponseCode.DEEP_SESSION_NOT_FOUND));

		if (!deepSession.getUserId().equals(userId)){
			throw new BusinessException(ResponseCode.DEEP_SESSION_ACCESS_DENIED);
		}

		validateWho5Answers(request);

		LocalDate weekStartDate = deepSession.getCreatedAt().toLocalDate();

		DeepPsychAssessment assessment = DeepPsychAssessment.createWho5(
			deepSession.getId(),
			userId,
			request.getAnswers(),
			weekStartDate,
			objectMapper
		);

		DeepPsychAssessment saved = deepPsychAssessmentRepository.save(assessment);

		return SubmitWho5Resp.builder()
			.assessmentId(saved.getId())
			.scoreTotal(saved.getScoreTotal())
			.build();
	}

	private void validateWho5Answers(SubmitWho5Req request) {
		boolean invalid = request.getAnswers().stream()
			.anyMatch(answer -> answer == null || answer < 0 || answer > 5);

		if (invalid) {
			throw new BusinessException(
				ResponseCode.WHO5_INVALID_ANSWER,
				request.getAnswers()
			);
		}
	}

}
