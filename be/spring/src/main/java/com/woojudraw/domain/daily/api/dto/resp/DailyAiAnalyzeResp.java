package com.woojudraw.domain.daily.api.dto.resp;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyAiAnalyzeResp {

	private Long dailyId;
	private String status;
	private String message;
	private DailyAiAnalyzeDataResp data;
}
