package com.woojudraw.domain.constellation.api.dto.resp;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.json.JsonTest;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.woojudraw.global.response.ApiResponse;

@JsonTest
class GetStarMapRespJsonTest {

	@Autowired
	private ObjectMapper objectMapper;

	@Test
	void serializesCreatedAtWithSeoulOffset() throws Exception {
		GetStarMapResp response = GetStarMapResp.builder()
			.centerStar(GetCenterStarResp.builder()
				.shapeType("sphere")
				.color("#e2e8f0")
				.build())
			.stars(List.of(
				GetStarMapResp.StarItem.builder()
					.starId(1L)
					.kind("DEEP")
					.color("#4FC3F7")
					.targetId(5L)
					.constellationId(2L)
					.weekStartDate(LocalDate.of(2026, 3, 9))
					.weekEndDate(LocalDate.of(2026, 3, 15))
					.createdAt(OffsetDateTime.parse("2026-03-12T09:15:30+09:00"))
					.build()
			))
			.build();

		String json = objectMapper.writeValueAsString(ApiResponse.ok(response));

		assertThat(json).contains("\"centerStar\"");
		assertThat(json).contains("\"shapeType\":\"sphere\"");
		assertThat(json).contains("\"color\":\"#e2e8f0\"");
		assertThat(json).contains("#4FC3F7");
		assertThat(json).contains("2026-03-12T09:15:30+09:00");
	}
}
