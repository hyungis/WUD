package com.woojudraw.domain.constellation.application.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.woojudraw.domain.constellation.api.dto.resp.GetStarMapResp;
import com.woojudraw.domain.constellation.entity.Constellation;
import com.woojudraw.domain.constellation.entity.Star;
import com.woojudraw.domain.constellation.entity.StarKind;
import com.woojudraw.domain.constellation.repository.ConstellationRepository;
import com.woojudraw.domain.constellation.repository.StarRepository;

class ConstellationServiceImplTest {

	@Test
	void getStarMapReturnsCreatedAtInSeoulOffset() {
		ConstellationRepository constellationRepository = mock(ConstellationRepository.class);
		StarRepository starRepository = mock(StarRepository.class);
		ConstellationServiceImpl service = new ConstellationServiceImpl(constellationRepository, starRepository);

		Constellation constellation = Constellation.builder()
			.id(7L)
			.userId(1L)
			.weekStartDate(LocalDate.of(2026, 3, 9))
			.weekEndDate(LocalDate.of(2026, 3, 15))
			.build();

		Star star = Star.builder()
			.id(11L)
			.userId(1L)
			.constellation(constellation)
			.deepSessionId(99L)
			.kind(StarKind.DEEP)
			.createdAt(LocalDateTime.of(2026, 3, 12, 0, 15, 30))
			.updatedAt(LocalDateTime.of(2026, 3, 12, 0, 15, 30))
			.build();

		when(starRepository.findAllByUserIdWithConstellation(1L)).thenReturn(List.of(star));

		GetStarMapResp response = service.getStarMap(1L);

		assertThat(response.getStars()).hasSize(1);
		assertThat(response.getStars().get(0).getCreatedAt().toString()).isEqualTo("2026-03-12T09:15:30+09:00");
	}
}
