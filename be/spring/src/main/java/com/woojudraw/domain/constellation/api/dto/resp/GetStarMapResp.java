package com.woojudraw.domain.constellation.api.dto.resp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class GetStarMapResp {

	private List<StarItem> stars;

	@Getter
	@Builder
	public static class StarItem{
		private Long starId;
		private String kind;
		private Long targetId;
		private Long constellationId;
		private LocalDate weekStartDate;
		private LocalDate weekEndDate;
		private LocalDateTime createdAt;
	}
}
