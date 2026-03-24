package com.woojudraw.domain.constellation.application.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.woojudraw.domain.constellation.api.dto.req.UpdateCenterStarReq;
import com.woojudraw.domain.constellation.api.dto.resp.GetStarMapResp;
import com.woojudraw.domain.constellation.entity.CenterStar;
import com.woojudraw.domain.constellation.entity.CenterStarShapeType;
import com.woojudraw.domain.constellation.entity.Constellation;
import com.woojudraw.domain.constellation.entity.Star;
import com.woojudraw.domain.constellation.entity.StarKind;
import com.woojudraw.domain.constellation.repository.CenterStarRepository;
import com.woojudraw.domain.constellation.repository.ConstellationRepository;
import com.woojudraw.domain.constellation.repository.StarRepository;
import com.woojudraw.domain.deep.entity.DeepSession;
import com.woojudraw.domain.user.entity.User;
import com.woojudraw.domain.user.repository.UserRepository;

class ConstellationServiceImplTest {

	@Test
	void getStarMapReturnsCreatedAtInSeoulOffset() {
		UserRepository userRepository = mock(UserRepository.class);
		CenterStarRepository centerStarRepository = mock(CenterStarRepository.class);
		ConstellationRepository constellationRepository = mock(ConstellationRepository.class);
		StarRepository starRepository = mock(StarRepository.class);
		ConstellationServiceImpl service = new ConstellationServiceImpl(
			userRepository,
			centerStarRepository,
			constellationRepository,
			starRepository
		);
		User user = User.builder().id(1L).build();
		DeepSession deepSession = mock(DeepSession.class);
		when(deepSession.getId()).thenReturn(99L);
		CenterStar centerStar = CenterStar.builder()
			.id(21L)
			.user(user)
			.shapeType(CenterStar.DEFAULT_SHAPE_TYPE)
			.color(CenterStar.DEFAULT_COLOR)
			.createdAt(OffsetDateTime.parse("2026-03-12T09:00:00+09:00"))
			.updatedAt(OffsetDateTime.parse("2026-03-12T09:00:00+09:00"))
			.build();

		Constellation constellation = Constellation.builder()
			.id(7L)
			.user(user)
			.weekStartDate(LocalDate.of(2026, 3, 9))
			.weekEndDate(LocalDate.of(2026, 3, 15))
			.build();

		Star star = Star.builder()
			.id(11L)
			.user(user)
			.constellation(constellation)
			.deepSession(deepSession)
			.kind(StarKind.DEEP)
			.color("#4FC3F7")
			.createdAt(OffsetDateTime.parse("2026-03-12T09:15:30+09:00"))
			.updatedAt(OffsetDateTime.parse("2026-03-12T09:15:30+09:00"))
			.build();

		when(centerStarRepository.findByUser_Id(1L)).thenReturn(java.util.Optional.of(centerStar));
		when(starRepository.findAllByUserIdWithConstellation(1L)).thenReturn(List.of(star));

		GetStarMapResp response = service.getStarMap(1L);

		assertThat(response.getCenterStar().getShapeType()).isEqualTo(CenterStar.DEFAULT_SHAPE_TYPE.name());
		assertThat(response.getCenterStar().getColor()).isEqualTo(CenterStar.DEFAULT_COLOR);
		assertThat(response.getStars()).hasSize(1);
		assertThat(response.getStars().get(0).getColor()).isEqualTo("#4FC3F7");
		assertThat(response.getStars().get(0).getCreatedAt().toString()).isEqualTo("2026-03-12T09:15:30+09:00");
	}

	@Test
	void getCenterStarReturnsDefaultWhenMissing() {
		UserRepository userRepository = mock(UserRepository.class);
		CenterStarRepository centerStarRepository = mock(CenterStarRepository.class);
		ConstellationRepository constellationRepository = mock(ConstellationRepository.class);
		StarRepository starRepository = mock(StarRepository.class);
		ConstellationServiceImpl service = new ConstellationServiceImpl(
			userRepository,
			centerStarRepository,
			constellationRepository,
			starRepository
		);

		when(centerStarRepository.findByUser_Id(1L)).thenReturn(java.util.Optional.empty());

		assertThat(service.getCenterStar(1L).getShapeType()).isEqualTo(CenterStar.DEFAULT_SHAPE_TYPE.name());
		assertThat(service.getCenterStar(1L).getColor()).isEqualTo(CenterStar.DEFAULT_COLOR);
	}

	@Test
	void updateCenterStarCreatesWhenMissing() throws Exception {
		UserRepository userRepository = mock(UserRepository.class);
		CenterStarRepository centerStarRepository = mock(CenterStarRepository.class);
		ConstellationRepository constellationRepository = mock(ConstellationRepository.class);
		StarRepository starRepository = mock(StarRepository.class);
		ConstellationServiceImpl service = new ConstellationServiceImpl(
			userRepository,
			centerStarRepository,
			constellationRepository,
			starRepository
		);
		User user = User.builder().id(1L).build();
		UpdateCenterStarReq req = new UpdateCenterStarReq();

		java.lang.reflect.Field shapeTypeField = UpdateCenterStarReq.class.getDeclaredField("shapeType");
		shapeTypeField.setAccessible(true);
		shapeTypeField.set(req, CenterStarShapeType.torusKnot);

		java.lang.reflect.Field colorField = UpdateCenterStarReq.class.getDeclaredField("color");
		colorField.setAccessible(true);
		colorField.set(req, "#12ABCD");

		when(centerStarRepository.findByUser_Id(1L)).thenReturn(java.util.Optional.empty());
		when(userRepository.findById(1L)).thenReturn(java.util.Optional.of(user));

		service.updateCenterStar(1L, req);

		verify(centerStarRepository).save(org.mockito.ArgumentMatchers.any(CenterStar.class));
	}
}
