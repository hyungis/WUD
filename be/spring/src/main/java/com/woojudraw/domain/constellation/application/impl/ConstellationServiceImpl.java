package com.woojudraw.domain.constellation.application.impl;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.woojudraw.domain.constellation.application.ConstellationService;
import com.woojudraw.domain.constellation.entity.Constellation;
import com.woojudraw.domain.constellation.api.dto.resp.GetStarMapResp;
import com.woojudraw.domain.constellation.api.dto.resp.GetWeeklyConstellationResp;
import com.woojudraw.domain.constellation.entity.Star;
import com.woojudraw.domain.constellation.entity.StarKind;
import com.woojudraw.domain.constellation.repository.ConstellationRepository;
import com.woojudraw.domain.constellation.repository.StarRepository;
import com.woojudraw.domain.daily.entity.Daily;
import com.woojudraw.domain.deep.entity.DeepSession;
import com.woojudraw.domain.deep.entity.DeepStatus;
import com.woojudraw.global.exception.BusinessException;
import com.woojudraw.global.exception.ResponseCode;
import com.woojudraw.global.time.AppTime;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class ConstellationServiceImpl implements ConstellationService {

	private final ConstellationRepository constellationRepository;
	private final StarRepository starRepository;

	@Override
	public void createDeepStarIfNeeded(DeepSession deepSession) {
		validateDeepSessionForStarCreation(deepSession);

		if(starRepository.existsByDeepSessionId(deepSession.getId())){
			return;
		}

		LocalDate completedDate = deepSession.getCompletedAt().toLocalDate();
		LocalDate weekStartDate = getIsoWeekStartDate(completedDate);
		LocalDate weekEndDate = weekStartDate.plusDays(6);

		Constellation constellation = constellationRepository
			.findByUserIdAndWeekStartDate(deepSession.getUserId(), weekStartDate)
			.orElseGet(() -> constellationRepository.save(
				Constellation.builder()
					.userId(deepSession.getUserId())
					.weekStartDate(weekStartDate)
					.weekEndDate(weekEndDate)
					.build()
			));

		// 같은 주차에는 DEEP 별 1개만 허용
		if (starRepository.existsByConstellation_IdAndKind(constellation.getId(), StarKind.DEEP)) {
			return;
		}

		Star deepStar = Star.createDeepStar(
			deepSession.getUserId(),
			constellation,
			deepSession.getId(),
			AppTime.nowUtc()
		);

		starRepository.save(deepStar);
	}

	@Override
	public void createDailyStarIfNeeded(Daily daily) {
		validateDailyForStarCreation(daily);

		if (starRepository.existsByDailyEntryId(daily.getId())) {
			return;
		}

		LocalDate weekStartDate = getIsoWeekStartDate(daily.getEntryDate());
		LocalDate weekEndDate = weekStartDate.plusDays(6);

		Constellation constellation = constellationRepository
			.findByUserIdAndWeekStartDate(daily.getUsersId(), weekStartDate)
			.orElseGet(() -> constellationRepository.save(
				Constellation.builder()
					.userId(daily.getUsersId())
					.weekStartDate(weekStartDate)
					.weekEndDate(weekEndDate)
					.build()
			));

		Star dailyStar = Star.createDailyStar(
			daily.getUsersId(),
			constellation,
			daily.getId(),
			daily.getEmotionColor(),
			AppTime.nowUtc()
		);

		starRepository.save(dailyStar);
	}

	@Override
	public GetStarMapResp getStarMap(Long userId) {
		List<Star> stars = starRepository.findAllByUserIdWithConstellation(userId);

		List<GetStarMapResp.StarItem> starItems = stars.stream()
			.map(this::toStarItem)
			.toList();

		return GetStarMapResp.builder()
			.stars(starItems)
			.build();
	}

	@Override
	public GetWeeklyConstellationResp getWeeklyConstellations(Long userId) {
		List<Constellation> constellations = constellationRepository.findAllByUserIdOrderByWeekStartDateAsc(userId);

		List<Long> constellationIds = constellations.stream()
			.map(Constellation::getId)
			.toList();

		List<Star> stars = constellationIds.isEmpty()
			? List.of()
			: starRepository.findAllByConstellationIds(constellationIds);

		Map<Long, List<Long>> starIdsByConstellationId = new LinkedHashMap<>();
		for (Star star : stars){
			starIdsByConstellationId
				.computeIfAbsent(star.getConstellation().getId(), key -> new ArrayList<>())
				.add(star.getId());
		}

		List<GetWeeklyConstellationResp.ConstellationItem> items = constellations.stream()
			.map(constellation -> GetWeeklyConstellationResp.ConstellationItem.builder()
				.constellationId(constellation.getId())
				.weekStartDate(constellation.getWeekStartDate())
				.weekEndDate(constellation.getWeekEndDate())
				.starIds(starIdsByConstellationId.getOrDefault(constellation.getId(), List.of()))
				.build())
			.toList();
		return GetWeeklyConstellationResp.builder()
			.constellations(items)
			.build();
	}

	private void validateDeepSessionForStarCreation(DeepSession deepSession) {
		if (deepSession == null) {
			throw new BusinessException(ResponseCode.DEEP_SESSION_NOT_FOUND);
		}

		if (deepSession.getStatus() != DeepStatus.DONE) {
			throw new BusinessException(ResponseCode.INVALID_DEEP_SESSION_STATUS);
		}

		if (deepSession.getCompletedAt() == null) {
			throw new BusinessException(ResponseCode.INVALID_DEEP_SESSION_STATUS);
		}
	}

	private void validateDailyForStarCreation(Daily daily) {
		if (daily == null || daily.isDeleted()) {
			throw new BusinessException(ResponseCode.DAILY_NOT_FOUND);
		}

		if (daily.currentAnalysisStatus() != com.woojudraw.domain.daily.entity.DailyAnalysisStatus.DONE) {
			throw new BusinessException(ResponseCode.DAILY_UPDATE_NOT_ALLOWED);
		}
	}

	private LocalDate getIsoWeekStartDate(LocalDate date) {
		return date.with(TemporalAdjusters.previousOrSame(DayOfWeek.SUNDAY));
	}

	private GetStarMapResp.StarItem toStarItem(Star star) {
		Long targetId = getTargetId(star);

		return GetStarMapResp.StarItem.builder()
			.starId(star.getId())
			.kind(star.getKind().name())
			.color(star.getColor())
			.targetId(targetId)
			.constellationId(star.getConstellation().getId())
			.weekStartDate(star.getConstellation().getWeekStartDate())
			.weekEndDate(star.getConstellation().getWeekEndDate())
			.createdAt(AppTime.kstFromUtc(star.getCreatedAt()))
			.build();
	}

	private Long getTargetId(Star star) {
		if (star.getKind() == StarKind.DAILY) {
			return star.getDailyEntryId();
		}
		return star.getDeepSessionId();
	}
}
