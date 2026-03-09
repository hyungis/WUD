package com.woojudraw.domain.constellation.application.impl;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;

import org.springframework.stereotype.Service;

import com.woojudraw.domain.constellation.application.ConstellationService;
import com.woojudraw.domain.constellation.entity.Constellation;
import com.woojudraw.domain.constellation.entity.Star;
import com.woojudraw.domain.constellation.entity.StarKind;
import com.woojudraw.domain.constellation.repository.ConstellationRepository;
import com.woojudraw.domain.constellation.repository.StarRepository;
import com.woojudraw.domain.deep.entity.DeepSession;
import com.woojudraw.domain.deep.entity.DeepStatus;
import com.woojudraw.global.exception.BusinessException;
import com.woojudraw.global.exception.ResponseCode;

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

		LocalDateTime now = LocalDateTime.now();

		Star deepStar = Star.createDeepStar(
			deepSession.getUserId(),
			constellation,
			deepSession.getId(),
			now
		);

		starRepository.save(deepStar);



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

	private LocalDate getIsoWeekStartDate(LocalDate date) {
		return date.with(DayOfWeek.MONDAY);
	}
}
