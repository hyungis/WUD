package com.woojudraw.domain.daily.application.impl;

import static java.util.stream.Collectors.toMap;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.woojudraw.domain.daily.api.dto.req.CreateDailyReq;
import com.woojudraw.domain.daily.api.dto.req.DailyAiAnalyzeReq;
import com.woojudraw.domain.daily.api.dto.req.DailyListPeriod;
import com.woojudraw.domain.daily.api.dto.req.UpdateDailyReq;
import com.woojudraw.domain.daily.api.dto.resp.CreateDailyResp;
import com.woojudraw.domain.daily.api.dto.resp.DailyDetailResp;
import com.woojudraw.domain.daily.api.dto.resp.DailyListItemResp;
import com.woojudraw.domain.daily.api.dto.resp.UpdateDailyResp;
import com.woojudraw.domain.constellation.application.ConstellationService;
import com.woojudraw.domain.daily.application.DailyAiService;
import com.woojudraw.domain.daily.application.DailyService;
import com.woojudraw.domain.daily.entity.Daily;
import com.woojudraw.domain.daily.entity.DailyAnalysisStatus;
import com.woojudraw.domain.daily.entity.DailyResult;
import com.woojudraw.domain.daily.entity.DailyType;
import com.woojudraw.domain.daily.entity.Emotion;
import com.woojudraw.domain.daily.repository.DailyRepository;
import com.woojudraw.domain.daily.repository.DailyResultRepository;
import com.woojudraw.domain.image.application.ImageService;
import com.woojudraw.domain.image.entity.Image;
import com.woojudraw.domain.image.entity.ImageStatus;
import com.woojudraw.domain.image.repository.ImageRepository;
import com.woojudraw.global.exception.BusinessException;
import com.woojudraw.global.exception.ResponseCode;
import com.woojudraw.global.time.AppTime;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class DailyServiceImpl implements DailyService {

	private final DailyRepository dailyRepository;
	private final DailyResultRepository dailyResultRepository;
	private final ImageRepository imageRepository;
	private final ImageService imageService;
	private final DailyAiService dailyAiService;
	private final ConstellationService constellationService;

	@Override
	public CreateDailyResp createDaily(Long userId, CreateDailyReq request) {
		validateEntryDate(request.getEntryDate());
		DailyType dailyType = parseDailyType(request.getDailyType());

		if (dailyRepository.existsByUser_IdAndEntryDateAndDeletedAtIsNull(userId, request.getEntryDate())) {
			throw new BusinessException(ResponseCode.DAILY_ALREADY_EXISTS);
		}

		Image drawingImage = getOwnedReadyImageOrThrow(request.getDrawingImageId(), userId);

		Daily saved = dailyRepository.save(
			Daily.create(
				drawingImage.getUser(),
				dailyType,
				request.getEntryDate(),
				request.getContent(),
				request.getEmotion().getValue(),
				request.getEmotion().getColor(),
				drawingImage
			)
		);
		saved.markAnalyzing();

		try {
			dailyAiService.requestDailyAnalysis(
				DailyAiAnalyzeReq.builder()
					.dailyId(saved.getId())
					.dailyType(saved.getDailyType())
					.s3ObjectKey(drawingImage.getImageKey())
					.emotion(request.getEmotion().getLabel())
					.emotionColor(request.getEmotion().getColor())
					.content(saved.getContent())
					.build()
			);
		} catch (BusinessException e) {
			saved.markAnalysisFailed();
			throw e;
		} catch (Exception e) {
			saved.markAnalysisFailed();
			throw new BusinessException(ResponseCode.AI_ANALYSIS_FAILED);
		}

		return CreateDailyResp.builder()
			.dailyId(saved.getId())
			.analysisStatus(saved.currentAnalysisStatus())
			.build();
	}

	@Override
	public List<DailyListItemResp> getDailies(Long userId, DailyListPeriod period, LocalDate date) {
		DateRange dateRange = resolveDateRange(period, date);
		List<Daily> dailies = (dateRange == null)
			? dailyRepository.findAllByUser_IdAndDeletedAtIsNullOrderByEntryDateDescIdDesc(userId)
			: dailyRepository.findAllByUser_IdAndDeletedAtIsNullAndEntryDateBetweenOrderByEntryDateDescIdDesc(
				userId,
				dateRange.startDate(),
				dateRange.endDate()
			);

		List<Long> dailyIds = dailies.stream().map(Daily::getId).toList();
		Map<Long, DailyResult> resultMap = dailyIds.isEmpty()
			? Map.of()
			: dailyResultRepository.findAllByDaily_IdIn(dailyIds)
				.stream()
				.collect(toMap(DailyResult::getDailyEntriesId, dailyResult -> dailyResult));

		return dailies.stream()
			.map(daily -> {
				DailyResult dailyResult = resultMap.get(daily.getId());
				return DailyListItemResp.builder()
					.dailyId(daily.getId())
					.dailyType(daily.getDailyType())
					.entryDate(daily.getEntryDate())
					.emotion(Emotion.labelOf(daily.getEmotionValue(), daily.getEmotionColor()))
					.emotionValue(daily.getEmotionValue())
					.emotionColor(daily.getEmotionColor())
					.drawingImageId(daily.getDrawingImageId())
					.analysisStatus(resolveAnalysisStatus(daily, dailyResult))
					.resultSummary(dailyResult != null ? dailyResult.getResult() : null)
					.build();
			})
			.toList();
	}

	@Override
	public DailyDetailResp getDaily(Long userId, Long dailyId) {
		Daily daily = dailyRepository.findById(dailyId)
			.orElseThrow(() -> new BusinessException(ResponseCode.DAILY_NOT_FOUND));

		if (daily.isDeleted()) {
			throw new BusinessException(ResponseCode.DAILY_NOT_FOUND);
		}

		if (!daily.isOwnedBy(userId)) {
			throw new BusinessException(ResponseCode.DAILY_ACCESS_DENIED);
		}

		Image drawingImage = daily.getDrawingImage();
		DailyResult dailyResult = dailyResultRepository.findByDaily_Id(dailyId).orElse(null);

		return DailyDetailResp.builder()
			.dailyId(daily.getId())
			.dailyType(daily.getDailyType())
			.entryDate(daily.getEntryDate())
			.content(daily.getContent())
			.emotion(Emotion.labelOf(daily.getEmotionValue(), daily.getEmotionColor()))
			.emotionValue(daily.getEmotionValue())
			.emotionColor(daily.getEmotionColor())
			.drawingImageId(daily.getDrawingImageId())
			.drawingImageKey(drawingImage.getImageKey())
			.drawingImageUrl(imageService.generatePresignedGetUrl(drawingImage.getImageKey()))
			.analysisStatus(resolveAnalysisStatus(daily, dailyResult))
			.analysisResult(dailyResult != null ? dailyResult.getResult() : null)
			.analysisRaw(dailyResult != null ? dailyResult.getRaw() : null)
			.createdAt(daily.getCreatedAt())
			.updatedAt(daily.getUpdatedAt())
			.build();
	}

	@Override
	public UpdateDailyResp updateDaily(Long userId, Long dailyId, UpdateDailyReq request) {
		Daily daily = dailyRepository.findById(dailyId)
			.orElseThrow(() -> new BusinessException(ResponseCode.DAILY_NOT_FOUND));

		if (daily.isDeleted()) {
			throw new BusinessException(ResponseCode.DAILY_NOT_FOUND);
		}

		if (!daily.isOwnedBy(userId)) {
			throw new BusinessException(ResponseCode.DAILY_ACCESS_DENIED);
		}

		daily.updateContentAndEmotion(request.getContent(), request.getEmotion());

		return UpdateDailyResp.builder()
			.dailyId(daily.getId())
			.emotion(request.getEmotion().getLabel())
			.emotionValue(daily.getEmotionValue())
			.emotionColor(daily.getEmotionColor())
			.updatedAt(daily.getUpdatedAt())
			.build();
	}

	@Override
	public void deleteDaily(Long userId, Long dailyId) {
		Daily daily = dailyRepository.findById(dailyId)
			.orElseThrow(() -> new BusinessException(ResponseCode.DAILY_NOT_FOUND));

		if (daily.isDeleted()) {
			throw new BusinessException(ResponseCode.DAILY_NOT_FOUND);
		}

		if (!daily.isOwnedBy(userId)) {
			throw new BusinessException(ResponseCode.DAILY_ACCESS_DENIED);
		}

		constellationService.deleteDailyStarIfExists(dailyId);
		daily.markDeleted();
	}

	private void validateEntryDate(LocalDate entryDate) {
		if (entryDate.isAfter(AppTime.todayKst())) {
			throw new BusinessException(ResponseCode.DAILY_DATE_INVALID, entryDate);
		}
	}

	private DailyType parseDailyType(String rawDailyType) {
		try {
			return DailyType.from(rawDailyType);
		} catch (IllegalArgumentException e) {
			throw new BusinessException(ResponseCode.DAILY_TYPE_INVALID, rawDailyType);
		}
	}

	private Image getOwnedReadyImageOrThrow(Long imageId, Long userId) {
		Image image = imageRepository.findById(imageId)
			.orElseThrow(() -> new BusinessException(ResponseCode.FILE_NOT_FOUND));

		if (!image.isOwnedBy(userId)) {
			throw new BusinessException(ResponseCode.FILE_ACCESS_DENIED);
		}

		if (image.getStatus() != ImageStatus.READY) {
			throw new BusinessException(ResponseCode.IMAGE_NOT_READY);
		}

		return image;
	}

	private DateRange resolveDateRange(DailyListPeriod period, LocalDate date) {
		if (period == null && date == null) {
			return null;
		}

		LocalDate anchor = date == null ? AppTime.todayKst() : date;
		if (period == null || period == DailyListPeriod.DAY) {
			return new DateRange(anchor, anchor);
		}

		if (period == DailyListPeriod.WEEK) {
			LocalDate start = anchor.with(TemporalAdjusters.previousOrSame(DayOfWeek.SUNDAY));
			LocalDate end = anchor.with(TemporalAdjusters.nextOrSame(DayOfWeek.SATURDAY));
			return new DateRange(start, end);
		}

		LocalDate start = anchor.withDayOfMonth(1);
		LocalDate end = anchor.withDayOfMonth(anchor.lengthOfMonth());
		return new DateRange(start, end);
	}

	private DailyAnalysisStatus resolveAnalysisStatus(Daily daily, DailyResult dailyResult) {
		DailyAnalysisStatus status = daily.currentAnalysisStatus();
		if (status == DailyAnalysisStatus.PENDING && dailyResult != null) {
			return DailyAnalysisStatus.DONE;
		}
		return status;
	}

	private record DateRange(LocalDate startDate, LocalDate endDate) {
	}
}
