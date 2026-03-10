package com.woojudraw.domain.constellation.api.dto.resp;

import java.time.LocalDate;
import java.util.List;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class GetWeeklyConstellationResp {
	private List<ConstellationItem> constellations;

	@Getter
	@Builder
	public static class ConstellationItem{
		private Long constellationId;
		private LocalDate weekStartDate;
		private LocalDate weekEndDate;
		private List<Long> starIds;
	}
}
