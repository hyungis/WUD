package com.woojudraw.domain.deep.application.impl;

import static java.util.stream.Collectors.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.woojudraw.domain.deep.api.dto.req.AiAnalyzeReq;
import com.woojudraw.domain.deep.api.dto.req.CreateDeepSessionReq;
import com.woojudraw.domain.deep.api.dto.req.HtpImagesAnalyzeReq;
import com.woojudraw.domain.deep.api.dto.req.SpaneAnalyzeReq;
import com.woojudraw.domain.deep.api.dto.req.SubmitDeepSubmissionsReq;
import com.woojudraw.domain.deep.api.dto.req.SubmitHtpReq;
import com.woojudraw.domain.deep.api.dto.req.SubmitSpaneReq;
import com.woojudraw.domain.deep.api.dto.req.SubmitWho5Req;
import com.woojudraw.domain.deep.api.dto.req.Who5AnalyzeReq;
import com.woojudraw.domain.deep.api.dto.resp.CreateDeepSessionResp;
import com.woojudraw.domain.deep.api.dto.resp.DeepAiResultResp;
import com.woojudraw.domain.deep.api.dto.resp.DeepPsychAssessmentItemResp;
import com.woojudraw.domain.deep.api.dto.resp.DeepResultResp;
import com.woojudraw.domain.deep.api.dto.resp.DeepSessionListItemResp;
import com.woojudraw.domain.deep.api.dto.resp.DeepSessionStatusResp;
import com.woojudraw.domain.deep.api.dto.resp.DeepSubmissionItemResp;
import com.woojudraw.domain.deep.api.dto.resp.SubmitDeepSubmissionResp;
import com.woojudraw.domain.deep.api.dto.resp.SubmitSpaneResp;
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
import com.woojudraw.domain.image.application.ImageService;
import com.woojudraw.domain.image.entity.Image;
import com.woojudraw.domain.image.entity.ImageStatus;
import com.woojudraw.domain.image.repository.ImageRepository;
import com.woojudraw.domain.user.entity.User;
import com.woojudraw.domain.user.repository.UserRepository;
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
	private final ImageService imageService;
	private final ObjectMapper objectMapper;
	private final DeepAiService deepAiService;
	private final DeepResultRepository deepResultRepository;
	private final UserRepository userRepository;

	@Override
	public CreateDeepSessionResp createDeepSession(Long userId, CreateDeepSessionReq request) {
		User user = userRepository.findById(userId)
			.orElseThrow(() -> new BusinessException(ResponseCode.USER_NOT_FOUND));
		DeepSession deepSession = DeepSession.create(user);
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

		if (!deepSession.isOwnedBy(userId)) {
			throw new BusinessException(ResponseCode.DEEP_SESSION_ACCESS_DENIED);
		}

		validateWho5Answers(request);


		LocalDate weekStartDate = getWeekStartDate(deepSession.getCreatedAt().toLocalDate());

		DeepPsychAssessment assessment = DeepPsychAssessment.createWho5(
				deepSession,
				deepSession.getUser(),
				request.getAnswers(),
				weekStartDate,
				objectMapper);
		deepSession.addPsychAssessment(assessment);

		DeepPsychAssessment saved = deepPsychAssessmentRepository.save(assessment);

		return SubmitWho5Resp.builder()
				.assessmentId(saved.getId())
				.scoreTotal(saved.getScoreTotal())
				.build();
	}

	@Override
	public SubmitSpaneResp submitSpane(Long userId, Long sessionId, SubmitSpaneReq request) {
		DeepSession deepSession = deepSessionRepository.findById(sessionId)
			.orElseThrow(() -> new BusinessException(ResponseCode.DEEP_SESSION_NOT_FOUND));

		if (!deepSession.isOwnedBy(userId)) {
			throw new BusinessException(ResponseCode.DEEP_SESSION_ACCESS_DENIED);
		}

		validateSpaneAnswers(request);


		LocalDate weekStartDate = getWeekStartDate(deepSession.getCreatedAt().toLocalDate());

		DeepPsychAssessment assessment = DeepPsychAssessment.createSpane(
			deepSession,
			deepSession.getUser(),
			request.getAnswers(),
			weekStartDate,
			objectMapper);
		deepSession.addPsychAssessment(assessment);

		DeepPsychAssessment saved = deepPsychAssessmentRepository.save(assessment);

		return SubmitSpaneResp.builder()
			.assessmentId(saved.getId())
			.scorePositive(saved.getScorePositive())
			.scoreNegative(saved.getScoreNegative())
			.scoreBalance(saved.getScoreBalance())
			.build();
	}

	@Override
	public SubmitDeepSubmissionResp submitHtp(Long userId, Long sessionId, SubmitHtpReq request) {
		DeepSession deepSession = deepSessionRepository.findById(sessionId)
				.orElseThrow(() -> new BusinessException(ResponseCode.DEEP_SESSION_NOT_FOUND));

		if (!deepSession.isOwnedBy(userId)) {
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

		validateImagesAreReady(houseImage, treeImage, personImage);

		DeepPsychAssessment who5Assessment = deepPsychAssessmentRepository
				.findByDeepSession_IdAndTestCode(sessionId, PsychTestCode.WHO5)
				.orElseThrow(() -> new BusinessException(ResponseCode.WHO5_NOT_FOUND));

		DeepPsychAssessment spaneAssessment = deepPsychAssessmentRepository
				.findByDeepSession_IdAndTestCode(sessionId, PsychTestCode.SPANE)
			    .orElseThrow(() -> new BusinessException(ResponseCode.SPANE_NOT_FOUND));

		DeepSubmission houseSubmission = DeepSubmission.create(deepSession, houseImage, SubmissionType.HOUSE);
		DeepSubmission treeSubmission = DeepSubmission.create(deepSession, treeImage, SubmissionType.TREE);
		DeepSubmission personSubmission = DeepSubmission.create(deepSession, personImage, SubmissionType.PERSON);
		deepSession.addSubmission(houseSubmission);
		deepSession.addSubmission(treeSubmission);
		deepSession.addSubmission(personSubmission);
		deepSubmissionRepository.save(houseSubmission);
		deepSubmissionRepository.save(treeSubmission);
		deepSubmissionRepository.save(personSubmission);

		deepSession.updateDeepType(DeepType.HTP);
		deepSession.markSubmitted();
		deepSession.changeStatus(DeepStatus.ANALYZING);

		Map<String, String> imageMap = new HashMap<>(); // import java.util.Map, java.util.HashMap;
		imageMap.put("houseImageKey", houseImage.getImageKey());
		imageMap.put("treeImageKey", treeImage.getImageKey());
		imageMap.put("personImageKey", personImage.getImageKey());

		try {
			AiAnalyzeReq aiRequest = AiAnalyzeReq.builder()
					.sessionId(sessionId)
					.deepType("HTP")
					.who5(
							Who5AnalyzeReq.builder()
									.scoreTotal(who5Assessment.getScoreTotal())
									.raw(convertWho5Raw(who5Assessment))
									.build())
					.spane(
						SpaneAnalyzeReq.builder()
							.scorePositive(spaneAssessment.getScorePositive())
							.scoreNegative(spaneAssessment.getScoreNegative())
							.scoreBalance(spaneAssessment.getScoreBalance())
							.raw(convertSpaneRaw(spaneAssessment)) // 아래 유틸 메서드 필요
							.build())
					.images(imageMap)
					.build();

			// 비동기 전송만 수행하고 즉시 반환한다.
			// 실제 AI 결과 반영(DONE/FAILED)은 RabbitMQ 결과 consumer에서 처리한다.
			deepAiService.requestHtpAnalysis(aiRequest);
		} catch (BusinessException e) {
			deepSession.changeStatus(DeepStatus.FAILED);
			throw e;
		} catch (Exception e) {
			e.printStackTrace();
			deepSession.changeStatus(DeepStatus.FAILED);
			throw new BusinessException(ResponseCode.AI_ANALYSIS_FAILED);
		}

		return SubmitDeepSubmissionResp.builder()
				.sessionId(deepSession.getId())
				.status(deepSession.getStatus())
				.build();
	}

	@Override
	public SubmitDeepSubmissionResp submitDeepSubmissions(Long userId, Long sessionId,
		SubmitDeepSubmissionsReq request) {
		DeepSession deepSession = deepSessionRepository.findById(sessionId)
			.orElseThrow(() -> new BusinessException(ResponseCode.DEEP_SESSION_NOT_FOUND));

		if (!deepSession.isOwnedBy(userId)) {
			throw new BusinessException(ResponseCode.DEEP_SESSION_ACCESS_DENIED);
		}
		validateSubmittableSession(deepSession);

		Image image = getOwnedImageOrThrow(request.getImageId(), userId);
		validateImagesAreReady(image);

		DeepPsychAssessment who5Assessment = deepPsychAssessmentRepository
			.findByDeepSession_IdAndTestCode(sessionId, PsychTestCode.WHO5)
			.orElseThrow(() -> new BusinessException(ResponseCode.WHO5_NOT_FOUND));
		DeepPsychAssessment spaneAssessment = deepPsychAssessmentRepository
			.findByDeepSession_IdAndTestCode(sessionId, PsychTestCode.SPANE)
			.orElseThrow(() -> new BusinessException(ResponseCode.SPANE_NOT_FOUND));

		DeepSubmission submission = DeepSubmission.create(deepSession, image, request.getType());
		deepSession.addSubmission(submission);
		deepSubmissionRepository.save(submission);
		deepSession.markSubmitted();
		deepSession.changeStatus(DeepStatus.ANALYZING);

		Map<String, String> imageMap = new HashMap<>();
		String key = (request.getType() == SubmissionType.RAIN_PERSON)
			? "rainPersonImageKey" : "starWaveImageKey";
		imageMap.put(key, image.getImageKey());

		try {
			AiAnalyzeReq aiRequest = AiAnalyzeReq.builder()
				.sessionId(sessionId)
				.deepType(deepSession.getDeepType().name())
				.who5(
					Who5AnalyzeReq.builder()
						.scoreTotal(who5Assessment.getScoreTotal())
						.raw(convertWho5Raw(who5Assessment))
						.build())
				.spane(
					SpaneAnalyzeReq.builder()
						.scorePositive(spaneAssessment.getScorePositive())
						.scoreNegative(spaneAssessment.getScoreNegative())
						.scoreBalance(spaneAssessment.getScoreBalance())
						.raw(convertSpaneRaw(spaneAssessment))
						.build())
				.images(imageMap) // 위에서 구성한 범용 Map 주입
				.build();
			deepAiService.requestHtpAnalysis(aiRequest);
		} catch (BusinessException e) {
			deepSession.changeStatus(DeepStatus.FAILED);
			throw e;
		} catch (Exception e) {
			deepSession.changeStatus(DeepStatus.FAILED);
			throw new BusinessException(ResponseCode.AI_ANALYSIS_FAILED);
		}

		return SubmitDeepSubmissionResp.builder()
			.sessionId(sessionId)
			.status(deepSession.getStatus())
			.build();
	}

	@Override
	public DeepSessionStatusResp getDeepSessionStatus(Long userId, Long sessionId) {
		DeepSession deepSession = deepSessionRepository.findByIdAndUser_Id(sessionId, userId)
				.orElseThrow(() -> new BusinessException(ResponseCode.DEEP_SESSION_NOT_FOUND));

		return DeepSessionStatusResp.builder()
				.sessionId(deepSession.getId())
				.status(deepSession.getStatus())
				.build();
	}

	@Override
	public DeepResultResp getDeepResult(Long userId, Long sessionId) {
		DeepSession deepSession = deepSessionRepository.findById(sessionId)
			.orElseThrow(() -> new BusinessException(ResponseCode.DEEP_SESSION_NOT_FOUND));

		if (!deepSession.isOwnedBy(userId)) {
			throw new BusinessException(ResponseCode.DEEP_SESSION_ACCESS_DENIED);
		}

		DeepResult deepResult = deepResultRepository.findByDeepSession_Id(sessionId)
			.orElseThrow(() -> new BusinessException(ResponseCode.DEEP_RESULT_NOT_FOUND));

		List<DeepSubmission> submissions = deepSubmissionRepository
			.findAllByDeepSession_IdOrderByIdAsc(sessionId);
		List<DeepPsychAssessment> assessments = deepPsychAssessmentRepository
			.findAllByDeepSession_IdOrderByIdAsc(sessionId);

		Map<String, Object> parsedRaw = parseDeepResultRaw(deepResult.getRaw());
		List<String> questions = extractQuestions(parsedRaw);
		Map<String, Object> rawOnly = extractRaw(parsedRaw);

		List<DeepSubmissionItemResp> submissionResponses = submissions.stream()
			.map(submission -> {
				Image image = submission.getImage();
				return DeepSubmissionItemResp.builder()
					.type(submission.getType())
					.imageId(image.getId())
					.imageKey(image.getImageKey())
					.imageUrl(imageService.generatePresignedGetUrl(image.getImageKey()))
					.build();
			})
			.toList();

		List<DeepPsychAssessmentItemResp> assessmentResponses = assessments.stream()
			.map(assessment -> DeepPsychAssessmentItemResp.builder()
				.testCode(assessment.getTestCode())
				.scoreTotal(assessment.getScoreTotal())
				.raw(parseAssessmentRaw(assessment.getRaw()))
				.build())
			.toList();

		return DeepResultResp.builder()
			.sessionId(deepSession.getId())
			.deepType(deepSession.getDeepType())
			.status(deepSession.getStatus())
			.submissions(submissionResponses)
			.questions(questions)
			.aiResult(
				DeepAiResultResp.builder()
					.result(deepResult.getResult())
					.raw(rawOnly)
					.build()
			)
			.psychAssessments(assessmentResponses)
			.build();
	}

	@Override
	public List<DeepSessionListItemResp> getDeepSessions(Long userId) {
		List<DeepSession> deepSessions = deepSessionRepository
			.findAllByUser_IdOrderByCreatedAtDesc(userId);

		List<Long> sessionIds = deepSessions.stream()
			.map(DeepSession::getId)
			.toList();
		Map<Long, DeepResult> resultMap = deepResultRepository
			.findAllByDeepSession_IdIn(sessionIds)
			.stream()
			.collect(toMap(
				DeepResult::getDeepSessionId,
				deepResult -> deepResult
			));

		return deepSessions.stream()
			.map(session -> {
				DeepResult deepResult = resultMap.get(session.getId());

				return DeepSessionListItemResp.builder()
					.sessionId(session.getId())
					.deepType(session.getDeepType())
					.status(session.getStatus())
					.resultSummary(deepResult != null ? deepResult.getResult() : null)
					.createdAt(session.getCreatedAt())
					.build();
			})
			.toList();
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

		if (!image.isOwnedBy(userId)) {
			throw new BusinessException(ResponseCode.FILE_ACCESS_DENIED);
		}

		return image;
	}

	private void validateImagesAreReady(Image... images) {
		for (Image image : images) {
			if (image.getStatus() != ImageStatus.READY) {
				throw new BusinessException(ResponseCode.IMAGE_NOT_READY);
			}
		}
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

	private Map<String, Integer> convertSpaneRaw(DeepPsychAssessment assessment) {
		try {
			Map<String, Object> rawMap = objectMapper.readValue(
				assessment.getRaw(),
				new TypeReference<Map<String, Object>>() {});
			List<Integer> answers = (List<Integer>) rawMap.get("answers");
			Map<String, Integer> result = new HashMap<>();
			for (int i = 0; i < answers.size(); i++) {
				result.put("q" + (i + 1), answers.get(i));
			}
			return result;
		} catch (Exception e) {
			throw new BusinessException(ResponseCode.INVALID_REQUEST);
		}
	}

	private Map<String, Object> parseDeepResultRaw(String raw) {
		try {
			if (raw == null || raw.isBlank()) {
				return new java.util.HashMap<>();
			}

			return objectMapper.readValue(
				raw,
				new TypeReference<Map<String, Object>>() {}
			);
		} catch (Exception e) {
			e.printStackTrace();
			throw new BusinessException(ResponseCode.INVALID_REQUEST);
		}
	}

	@SuppressWarnings("unchecked")
	private java.util.List<String> extractQuestions(Map<String, Object> parsedRaw) {
		Object questionsObj = parsedRaw.get("questions");

		if (questionsObj == null) {
			return java.util.Collections.emptyList();
		}

		return (java.util.List<String>) questionsObj;
	}

	@SuppressWarnings("unchecked")
	private Map<String, Object> extractRaw(Map<String, Object> parsedRaw) {
		Object rawObj = parsedRaw.get("raw");

		if (rawObj == null) {
			return new java.util.HashMap<>();
		}

		return (Map<String, Object>) rawObj;
	}

	private Map<String, Object> parseAssessmentRaw(String raw) {
		try {
			if (raw == null || raw.isBlank()) {
				return new java.util.HashMap<>();
			}

			return objectMapper.readValue(
				raw,
				new TypeReference<Map<String, Object>>() {}
			);
		} catch (Exception e) {
			e.printStackTrace();
			throw new BusinessException(ResponseCode.INVALID_REQUEST);
		}
	}

	private void validateSpaneAnswers(SubmitSpaneReq request){
		boolean invalid = request.getAnswers().stream()
			.anyMatch(answer -> answer == null || answer < 1 || answer > 5);

		if(invalid){
			throw new BusinessException(ResponseCode.SPANE_INVALID_ANSWER);
		}
	}

	private String convertTypeToKey(SubmissionType type) {
		String name = type.name().toLowerCase();
		StringBuilder sb = new StringBuilder();
		boolean nextUpper = false;
		for (char c : name.toCharArray()) {
			if (c == '_') {
				nextUpper = true;
			} else {
				sb.append(nextUpper ? Character.toUpperCase(c) : c);
				nextUpper = false;
			}
		}
		return sb.toString() + "ImageKey";
	}

	private LocalDate getWeekStartDate(LocalDate date) {
		return date.with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.SUNDAY));
	}

}
