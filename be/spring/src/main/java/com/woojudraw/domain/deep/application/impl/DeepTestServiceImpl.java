package com.woojudraw.domain.deep.application.impl;

import java.time.DayOfWeek;
import java.time.OffsetDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.woojudraw.domain.deep.api.dto.resp.DeepTestGuideResp;
import com.woojudraw.domain.deep.api.dto.resp.DeepTestListItemResp;
import com.woojudraw.domain.deep.application.DeepTestService;
import com.woojudraw.domain.deep.entity.DeepStatus;
import com.woojudraw.domain.deep.entity.DeepType;
import com.woojudraw.domain.deep.repository.DeepSessionRepository;
import com.woojudraw.global.exception.BusinessException;
import com.woojudraw.global.exception.ResponseCode;
import com.woojudraw.global.time.AppTime;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DeepTestServiceImpl implements DeepTestService {

	private final DeepSessionRepository deepSessionRepository;

	@Override
	public List<DeepTestListItemResp> getDeepTests(Long userId) {
		// 1. 이번 주 일요일 00:00:00 (KST) 계산
		OffsetDateTime now = AppTime.nowKst();
		OffsetDateTime weekStart = now.with(TemporalAdjusters.previousOrSame(DayOfWeek.SUNDAY))
				.withHour(0).withMinute(0).withSecond(0).withNano(0);

		List<DeepStatus> activeStatuses = List.of(DeepStatus.ANALYZING, DeepStatus.DONE);

		boolean htpDone = deepSessionRepository.existsByUserIdAndDeepTypeAndStatusInAndCreatedAtAfter(
				userId, DeepType.HTP, activeStatuses, weekStart);

		boolean pitrDone = deepSessionRepository.existsByUserIdAndDeepTypeAndStatusInAndCreatedAtAfter(
				userId, DeepType.PERSON_IN_RAIN, activeStatuses, weekStart);

		boolean starWaveDone = deepSessionRepository.existsByUserIdAndDeepTypeAndStatusInAndCreatedAtAfter(
				userId, DeepType.STAR_WAVE, activeStatuses, weekStart);

		return List.of(
				DeepTestListItemResp.builder()
						.type(DeepType.HTP)
						.title("HTP 검사")
						.description("집, 나무, 사람을 그리며 현재 감정과 자기표현을 돌아보는 심층 컨텐츠")
						.available(!htpDone) // HTP 한 적 없으면 true
						.build(),
				DeepTestListItemResp.builder()
						.type(DeepType.PERSON_IN_RAIN)
						.title("빗속의 사람")
						.description("비와 사람의 구성을 통해 스트레스 상황에서의 감정을 돌아보는 컨텐츠")
						.available(!pitrDone) // PITR 한 적 없으면 true
						.build(),
				DeepTestListItemResp.builder()
						.type(DeepType.STAR_WAVE)
						.title("별-파도 검사")
						.description("별과 파도의 이미지를 통해 내면 상태를 표현해보는 컨텐츠")
						.available(!starWaveDone) // Star-Wave 한 적 없으면 true
						.build());
	}

	@Override
	public DeepTestGuideResp getDeepTestGuide(String type) {
		DeepType deepTestType = parseType(type);

		return switch (deepTestType) {
			case HTP -> DeepTestGuideResp.builder()
					.type(DeepType.HTP)
					.title("HTP 검사 가이드")
					.purpose("집, 나무, 사람을 그리며 현재 감정과 자기표현을 돌아보는 참고용 컨텐츠입니다.")
					.instructions(List.of(
							"집, 나무, 사람을 각각 한 장씩 그려주세요.",
							"잘 그리려고 하기보다 떠오르는 느낌대로 표현해주세요.",
							"정답은 없으며 편안하게 진행하시면 됩니다."))
					.cautions(List.of(
							"이 결과는 의학적 또는 임상적 진단이 아닙니다.",
							"현재 기분이나 상황에 따라 표현이 달라질 수 있습니다."))
					.disclaimer("본 결과는 참고용이며, 자신을 돌아보기 위한 보조 자료로만 활용해주세요.")
					.build();

			case PERSON_IN_RAIN -> DeepTestGuideResp.builder()
					.type(DeepType.PERSON_IN_RAIN)
					.title("빗속의 사람 가이드")
					.purpose("스트레스 상황을 떠올리며 현재 감정 상태를 돌아보는 참고용 컨텐츠입니다.")
					.instructions(List.of(
							"빗속에 있는 사람을 자유롭게 그려주세요.",
							"사람, 비, 주변 요소를 떠오르는 대로 표현해주세요."))
					.cautions(List.of(
							"결과는 참고용이며 진단이 아닙니다."))
					.disclaimer("본 결과는 참고용이며, 스스로를 이해하기 위한 보조 자료입니다.")
					.build();

			case STAR_WAVE -> DeepTestGuideResp.builder()
					.type(DeepType.STAR_WAVE)
					.title("별-파도 검사 가이드")
					.purpose("별과 파도를 자유롭게 표현하며 내면의 분위기를 돌아보는 참고용 컨텐츠입니다.")
					.instructions(List.of(
							"별과 파도를 자유롭게 표현해주세요.",
							"형태, 크기, 배치에 제한 없이 그려주세요."))
					.cautions(List.of(
							"결과는 참고용이며 진단이 아닙니다."))
					.disclaimer("본 결과는 참고용이며, 감정 기록을 돕기 위한 자료입니다.")
					.build();
		};
	}

	private DeepType parseType(String type) {
		try {
			return DeepType.valueOf(type.toUpperCase());
		} catch (IllegalArgumentException e) {
			throw new BusinessException(ResponseCode.UNSUPPORTED_DEEP_CONTENT_TYPE);
		}
	}
}
