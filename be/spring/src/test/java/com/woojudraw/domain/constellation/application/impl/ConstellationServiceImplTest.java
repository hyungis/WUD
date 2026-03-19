package com.woojudraw.domain.constellation.application.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.woojudraw.domain.constellation.api.dto.resp.GetStarMapResp;
import com.woojudraw.domain.constellation.entity.Constellation;
import com.woojudraw.domain.constellation.entity.Star;
import com.woojudraw.domain.constellation.entity.StarKind;
import com.woojudraw.domain.constellation.repository.ConstellationRepository;
import com.woojudraw.domain.constellation.repository.StarRepository;
import com.woojudraw.domain.deep.entity.DeepSession;
import com.woojudraw.domain.user.entity.User;

class ConstellationServiceImplTest {

	@Test
	void getStarMapReturnsCreatedAtInSeoulOffset() {
		ConstellationRepository constellationRepository = mock(ConstellationRepository.class);
		StarRepository starRepository = mock(StarRepository.class);
		ConstellationServiceImpl service = new ConstellationServiceImpl(constellationRepository, starRepository);
		User user = User.builder().id(1L).build();
		DeepSession deepSession = mock(DeepSession.class);
		when(deepSession.getId()).thenReturn(99L);

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

		when(starRepository.findAllByUserIdWithConstellation(1L)).thenReturn(List.of(star));

		GetStarMapResp response = service.getStarMap(1L);

		assertThat(response.getStars()).hasSize(1);
		assertThat(response.getStars().get(0).getColor()).isEqualTo("#4FC3F7");
		assertThat(response.getStars().get(0).getCreatedAt().toString()).isEqualTo("2026-03-12T09:15:30+09:00");
	}
}
