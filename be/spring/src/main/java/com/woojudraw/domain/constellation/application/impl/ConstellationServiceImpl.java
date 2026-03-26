package com.woojudraw.domain.constellation.application.impl;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.woojudraw.domain.constellation.application.ConstellationService;
import com.woojudraw.domain.constellation.api.dto.req.UpdateCenterStarReq;
import com.woojudraw.domain.constellation.api.dto.resp.GetCenterStarResp;
import com.woojudraw.domain.constellation.entity.CenterStar;
import com.woojudraw.domain.constellation.entity.Constellation;
import com.woojudraw.domain.constellation.api.dto.resp.GetStarMapResp;
import com.woojudraw.domain.constellation.api.dto.resp.GetWeeklyConstellationResp;
import com.woojudraw.domain.constellation.entity.Star;
import com.woojudraw.domain.constellation.entity.StarKind;
import com.woojudraw.domain.constellation.repository.CenterStarRepository;
import com.woojudraw.domain.constellation.repository.ConstellationRepository;
import com.woojudraw.domain.constellation.repository.StarRepository;
import com.woojudraw.domain.daily.entity.Daily;
import com.woojudraw.domain.deep.entity.DeepSession;
import com.woojudraw.domain.deep.entity.DeepStatus;
import com.woojudraw.domain.user.entity.User;
import com.woojudraw.domain.user.repository.UserRepository;
import com.woojudraw.global.exception.BusinessException;
import com.woojudraw.global.exception.ResponseCode;
import com.woojudraw.global.time.AppTime;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class ConstellationServiceImpl implements ConstellationService {

	private final UserRepository userRepository;
	private final CenterStarRepository centerStarRepository;
	private final ConstellationRepository constellationRepository;
	private final StarRepository starRepository;

	@Override
	public void createDeepStarIfNeeded(DeepSession deepSession) {
		validateDeepSessionForStarCreation(deepSession);

		if (starRepository.existsByDeepSession_Id(deepSession.getId())) {
			return;
		}

		LocalDate completedDate = deepSession.getCompletedAt().toLocalDate();
		LocalDate weekStartDate = getIsoWeekStartDate(completedDate);
		LocalDate weekEndDate = weekStartDate.plusDays(6);

		Constellation constellation = constellationRepository
			.findByUser_IdAndWeekStartDate(deepSession.getUserId(), weekStartDate)
			.orElseGet(() -> constellationRepository.save(
				Constellation.builder()
					.user(deepSession.getUser())
					.weekStartDate(weekStartDate)
					.weekEndDate(weekEndDate)
					.build()
			));

		// 같은 주차에는 DEEP 별 1개만 허용
		if (starRepository.existsByConstellation_IdAndKind(constellation.getId(), StarKind.DEEP)) {
			return;
		}

		Star deepStar = Star.createDeepStar(
			deepSession.getUser(),
			constellation,
			deepSession,
			AppTime.nowKst()
		);
		constellation.addStar(deepStar);

		starRepository.save(deepStar);
	}

	@Override
	public void createDailyStarIfNeeded(Daily daily) {
		validateDailyForStarCreation(daily);

		if (starRepository.existsByDailyEntry_Id(daily.getId())) {
			return;
		}

		LocalDate weekStartDate = getIsoWeekStartDate(daily.getEntryDate());
		LocalDate weekEndDate = weekStartDate.plusDays(6);

		Constellation constellation = constellationRepository
			.findByUser_IdAndWeekStartDate(daily.getUserId(), weekStartDate)
			.orElseGet(() -> constellationRepository.save(
				Constellation.builder()
					.user(daily.getUser())
					.weekStartDate(weekStartDate)
					.weekEndDate(weekEndDate)
					.build()
			));

		Star dailyStar = Star.createDailyStar(
			daily.getUser(),
			constellation,
			daily,
			daily.getEmotionColor(),
			AppTime.nowKst()
		);
		constellation.addStar(dailyStar);

		starRepository.save(dailyStar);
	}

	@Override
	public void deleteDeepStarIfExists(Long deepSessionId) {
		starRepository.findByDeepSession_Id(deepSessionId)
			.ifPresent(this::deleteStarAndEmptyConstellationIfNeeded);
	}

	@Override
	public void reassignOrDeleteDeepStar(Long deepSessionId, DeepSession fallbackSession) {
		starRepository.findByDeepSession_Id(deepSessionId).ifPresent(star -> {
			if (fallbackSession != null) {
				star.reassignDeepSession(fallbackSession);
			} else {
				deleteStarAndEmptyConstellationIfNeeded(star);
			}
		});
	}

	@Override
	public void deleteDailyStarIfExists(Long dailyId) {
		starRepository.findByDailyEntry_Id(dailyId)
			.ifPresent(this::deleteStarAndEmptyConstellationIfNeeded);
	}

	@Override
	@Transactional(readOnly = true)
	public GetCenterStarResp getCenterStar(Long userId) {
		return centerStarRepository.findByUser_Id(userId)
			.map(this::toCenterStarResp)
			.orElseGet(this::defaultCenterStarResp);
	}

	@Override
	public void updateCenterStar(Long userId, UpdateCenterStarReq req) {
		centerStarRepository.findByUser_Id(userId)
			.ifPresentOrElse(
				centerStar -> centerStar.updateCustomization(req.getShapeType(), req.getColor()),
				() -> createCenterStar(userId, req)
			);
	}

	@Override
	@Transactional(readOnly = true)
	public GetStarMapResp getStarMap(Long userId) {
		List<Star> stars = starRepository.findAllByUserIdWithConstellation(userId);

		List<GetStarMapResp.StarItem> starItems = stars.stream()
			.map(this::toStarItem)
			.toList();

		return GetStarMapResp.builder()
			.centerStar(getCenterStar(userId))
			.stars(starItems)
			.build();
	}

	@Override
	@Transactional(readOnly = true)
	public GetWeeklyConstellationResp getWeeklyConstellations(Long userId) {
		List<Constellation> constellations = constellationRepository.findAllByUser_IdOrderByWeekStartDateAsc(userId);

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
			.createdAt(star.getCreatedAt())
			.build();
	}

	private GetCenterStarResp toCenterStarResp(CenterStar centerStar) {
		return GetCenterStarResp.builder()
			.shapeType(centerStar.getShapeType().getValue())
			.color(centerStar.getColor())
			.build();
	}

	private GetCenterStarResp defaultCenterStarResp() {
		return GetCenterStarResp.builder()
			.shapeType(CenterStar.DEFAULT_SHAPE_TYPE.getValue())
			.color(CenterStar.DEFAULT_COLOR)
			.build();
	}

	private Long getTargetId(Star star) {
		if (star.getKind() == StarKind.DAILY) {
			return star.getDailyEntryId();
		}
		return star.getDeepSessionId();
	}

	private void createCenterStar(Long userId, UpdateCenterStarReq req) {
		User user = userRepository.findById(userId)
			.orElseThrow(() -> new BusinessException(ResponseCode.USER_NOT_FOUND));

		OffsetDateTime now = AppTime.nowKst();
		CenterStar centerStar = CenterStar.create(user, req.getShapeType(), req.getColor(), now);
		centerStarRepository.save(centerStar);
	}

	private void deleteStarAndEmptyConstellationIfNeeded(Star star) {
		Long constellationId = star.getConstellation().getId();
		starRepository.delete(star);
		starRepository.flush();

		if (!starRepository.existsByConstellation_Id(constellationId)) {
			constellationRepository.deleteById(constellationId);
		}
	}
}
