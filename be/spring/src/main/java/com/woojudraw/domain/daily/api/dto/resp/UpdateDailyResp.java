package com.woojudraw.domain.daily.api.dto.resp;

import java.time.OffsetDateTime;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UpdateDailyResp {

	private Long dailyId;
	private String emotion;
	private Integer emotionValue;
	private String emotionColor;
	private OffsetDateTime updatedAt;
}
