package com.woojudraw.domain.deep.application.impl;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.woojudraw.domain.deep.api.dto.req.AiAnalyzeReq;
import com.woojudraw.domain.deep.api.dto.req.CreateDeepSessionReq;
import com.woojudraw.domain.deep.api.dto.req.HtpImagesAnalyzeReq;
import com.woojudraw.domain.deep.api.dto.req.SubmitHtpReq;
import com.woojudraw.domain.deep.api.dto.req.SubmitWho5Req;
import com.woojudraw.domain.deep.api.dto.req.Who5AnalyzeReq;
import com.woojudraw.domain.deep.api.dto.resp.AiAnalyzeResp;
import com.woojudraw.domain.deep.api.dto.resp.CreateDeepSessionResp;
import com.woojudraw.domain.deep.api.dto.resp.DeepSessionStatusResp;
import com.woojudraw.domain.deep.api.dto.resp.SubmitHtpResp;
import com.woojudraw.domain.deep.api.dto.resp.SubmitWho5Resp;
import com.woojudraw.domain.deep.application.DeepAiService;
import com.woojudraw.domain.deep.application.DeepSessionService;
import com.woojudraw.domain.deep.entity.DeepPsychAssessment;
import com.woojudraw.domain.deep.entity.DeepResult;
import com.woojudraw.domain.deep.entity.DeepSession;
import com.woojudraw.domain.deep.entity.DeepStatus;
import com.woojudraw.domain.deep.entity.DeepSubmission;
import com.woojudraw.domain.deep.entity.DeepType;
import com.woojudraw.domain.deep.entity.PsychTestCode;
import com.woojudraw.domain.deep.entity.SubmissionType;
import com.woojudraw.domain.deep.repository.DeepPsychAssessmentRepository;
import com.woojudraw.domain.deep.repository.DeepResultRepository;
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
	private final DeepAiService deepAiService;
	private final DeepResultRepository deepResultRepository;

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

		if (!deepSession.getUserId().equals(userId)) {
			throw new BusinessException(ResponseCode.DEEP_SESSION_ACCESS_DENIED);
		}

		validateWho5Answers(request);

		LocalDate weekStartDate = deepSession.getCreatedAt().toLocalDate();

		DeepPsychAssessment assessment = DeepPsychAssessment.createWho5(
				deepSession.getId(),
				userId,
				request.getAnswers(),
				weekStartDate,
				objectMapper);

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

		DeepPsychAssessment who5Assessment = deepPsychAssessmentRepository
				.findByDeepSessionIdAndTestCode(sessionId, PsychTestCode.WHO5)
				.orElseThrow(() -> new BusinessException(ResponseCode.DEEP_SESSION_NOT_FOUND));

		deepSubmissionRepository.save(
				DeepSubmission.create(sessionId, request.getHouseImageId(), SubmissionType.HOUSE));
		deepSubmissionRepository.save(
				DeepSubmission.create(sessionId, request.getTreeImageId(), SubmissionType.TREE));
		deepSubmissionRepository.save(
				DeepSubmission.create(sessionId, request.getPersonImageId(), SubmissionType.PERSON));

		deepSession.updateDeepType(DeepType.HTP);
		deepSession.markSubmitted();
		deepSession.changeStatus(DeepStatus.ANALYZING);

		try {
			AiAnalyzeReq aiRequest = AiAnalyzeReq.builder()
					.sessionId(sessionId)
					.deepType("HTP")
					.who5(
							Who5AnalyzeReq.builder()
									.scoreTotal(who5Assessment.getScoreTotal())
									.raw(convertWho5Raw(who5Assessment))
									.build())
					.images(
							HtpImagesAnalyzeReq.builder()
									.houseImageKey(houseImage.getImageKey())
									.treeImageKey(treeImage.getImageKey())
									.personImageKey(personImage.getImageKey())
									.build())
					.build();

			AiAnalyzeResp aiResponse = deepAiService.analyzeHtp(aiRequest);
			
			if (aiResponse == null || aiResponse.getData() == null) {
				throw new BusinessException(ResponseCode.AI_ANALYSIS_FAILED);
			}

			Map<String, Object> rawMap = new java.util.HashMap<>();
			rawMap.put("questions", aiResponse.getData().getQuestions());
			rawMap.put("raw", aiResponse.getData().getRaw());

			String rawJson = objectMapper.writeValueAsString(rawMap);

			DeepResult deepResult = DeepResult.create(
				sessionId,
				aiResponse.getData().getResultSummary(),
				rawJson
			);

			deepResultRepository.save(deepResult);

			deepSession.changeStatus(DeepStatus.DONE);
			deepSession.markCompleted();

		} catch (Exception e) {
			e.printStackTrace();
			deepSession.changeStatus(DeepStatus.FAILED);
			throw new BusinessException(ResponseCode.AI_ANALYSIS_FAILED);
		}

		return SubmitHtpResp.builder()
				.sessionId(deepSession.getId())
				.status(deepSession.getStatus())
				.build();
	}

	@Override
	public DeepSessionStatusResp getDeepSessionStatus(Long userId, Long sessionId) {
		DeepSession deepSession = deepSessionRepository.findByIdAndUserId(sessionId, userId)
				.orElseThrow(() -> new BusinessException(ResponseCode.DEEP_SESSION_NOT_FOUND));

		return DeepSessionStatusResp.builder()
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
					request.getAnswers());
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

		boolean duplicated = request.getHouseImageId().equals(request.getTreeImageId()) ||
				request.getHouseImageId().equals(request.getPersonImageId()) ||
				request.getTreeImageId().equals(request.getPersonImageId());

		if (duplicated) {
			throw new BusinessException(
					ResponseCode.DEEP_SUBMISSION_INVALID,
					"HTP 이미지는 서로 다른 이미지여야 합니다.");
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

	private Map<String, Integer> convertWho5Raw(DeepPsychAssessment assessment) {
		try {
			Map<String, Object> rawMap = objectMapper.readValue(
					assessment.getRaw(),
					new TypeReference<Map<String, Object>>() {
					});

			@SuppressWarnings("unchecked")
			java.util.List<Integer> answers = (java.util.List<Integer>) rawMap.get("answers");

			Map<String, Integer> result = new java.util.HashMap<>();
			for (int i = 0; i < answers.size(); i++) {
				result.put("q" + (i + 1), answers.get(i));
			}
			return result;
		} catch (Exception e) {
			e.printStackTrace();
			throw new BusinessException(ResponseCode.INVALID_REQUEST);
		}
	}

}
