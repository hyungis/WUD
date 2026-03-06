package com.woojudraw.domain.deep.application.impl;

import java.time.DayOfWeek;
import java.time.LocalDate;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.woojudraw.domain.deep.api.dto.req.CreateDeepSessionReq;
import com.woojudraw.domain.deep.api.dto.req.SubmitHtpReq;
import com.woojudraw.domain.deep.api.dto.req.SubmitWho5Req;
import com.woojudraw.domain.deep.api.dto.resp.CreateDeepSessionResp;
import com.woojudraw.domain.deep.api.dto.resp.SubmitHtpResp;
import com.woojudraw.domain.deep.api.dto.resp.SubmitWho5Resp;
import com.woojudraw.domain.deep.application.DeepSessionService;
import com.woojudraw.domain.deep.entity.DeepPsychAssessment;
import com.woojudraw.domain.deep.entity.DeepSession;
import com.woojudraw.domain.deep.entity.DeepStatus;
import com.woojudraw.domain.deep.entity.DeepSubmission;
import com.woojudraw.domain.deep.entity.DeepType;
import com.woojudraw.domain.deep.entity.SubmissionType;
import com.woojudraw.domain.deep.repository.DeepPsychAssessmentRepository;
import com.woojudraw.domain.deep.repository.DeepSessionRepository;
import com.woojudraw.domain.deep.repository.DeepSubmissionRepository;
import com.woojudraw.domain.image.entity.Image;
import com.woojudraw.domain.image.repository.ImageRepository;
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
	private final DeepSubmissionRepository deepSubmissionRepository;
	private final ImageRepository imageRepository;
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

	@Override
	public SubmitHtpResp submitHtp(Long userId, Long sessionId, SubmitHtpReq request) {
		DeepSession deepSession = deepSessionRepository.findById(sessionId)
			.orElseThrow(() -> new BusinessException(ResponseCode.DEEP_SESSION_NOT_FOUND));

		if (!deepSession.getUserId().equals(userId)) {
			throw new BusinessException(ResponseCode.DEEP_SESSION_ACCESS_DENIED);
		}

		if (deepSession.getSubmittedAt() != null) {
			throw new BusinessException(ResponseCode.DEEP_ALREADY_SUBMITTED);
		}
		validateSubmittableSession(deepSession);
		validateHtpRequest(request);

		Image houseImage = getOwnedImageOrThrow(request.getHouseImageId(), userId);
		Image treeImage = getOwnedImageOrThrow(request.getTreeImageId(), userId);
		Image personImage = getOwnedImageOrThrow(request.getPersonImageId(), userId);

		deepSubmissionRepository.save(
			DeepSubmission.create(sessionId, request.getHouseImageId(), SubmissionType.HOUSE)
		);
		deepSubmissionRepository.save(
			DeepSubmission.create(sessionId, request.getTreeImageId(), SubmissionType.TREE)
		);
		deepSubmissionRepository.save(
			DeepSubmission.create(sessionId, request.getPersonImageId(), SubmissionType.PERSON)
		);

		deepSession.updateDeepType(DeepType.HTP);
		deepSession.markSubmitted();
		deepSession.changeStatus(DeepStatus.ANALYZING);

		return SubmitHtpResp.builder()
			.sessionId(deepSession.getId())
			.status(deepSession.getStatus())
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

	private void validateSubmittableSession(DeepSession deepSession) {
		if (deepSession.getSubmittedAt() != null) {
			throw new BusinessException(ResponseCode.DEEP_ALREADY_SUBMITTED);
		}

		if (deepSession.getStatus() != DeepStatus.DRAFT) {
			throw new BusinessException(ResponseCode.DEEP_ALREADY_SUBMITTED);
		}
	}

	private void validateHtpRequest(SubmitHtpReq request) {
		if (request.getHouseImageId() == null
			|| request.getTreeImageId() == null
			|| request.getPersonImageId() == null) {
			throw new BusinessException(ResponseCode.DEEP_SUBMISSION_INVALID);
		}

		boolean duplicated =
			request.getHouseImageId().equals(request.getTreeImageId()) ||
				request.getHouseImageId().equals(request.getPersonImageId()) ||
				request.getTreeImageId().equals(request.getPersonImageId());

		if (duplicated) {
			throw new BusinessException(
				ResponseCode.DEEP_SUBMISSION_INVALID,
				"HTP 이미지는 서로 다른 이미지여야 합니다."
			);
		}
	}

	private Image getOwnedImageOrThrow(Long imageId, Long userId) {
		Image image = imageRepository.findById(imageId)
			.orElseThrow(() -> new BusinessException(ResponseCode.FILE_NOT_FOUND));

		if (!image.getUser().getId().equals(userId)) {
			throw new BusinessException(ResponseCode.FILE_ACCESS_DENIED);
		}

		return image;
	}

}
