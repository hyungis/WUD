package com.woojudraw.domain.daily.api.dto.req;

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
	private String s3ObjectKey;
}
