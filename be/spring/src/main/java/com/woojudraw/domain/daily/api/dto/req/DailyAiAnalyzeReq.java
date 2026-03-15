package com.woojudraw.domain.daily.api.dto.req;

import com.woojudraw.domain.daily.entity.DailyType;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyAiAnalyzeReq {

	private Long dailyId;
	private DailyType dailyType;
	private String s3ObjectKey;
}
