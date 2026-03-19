package com.woojudraw.domain.daily.api.dto.resp;

import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyAiAnalyzeDataResp {

	private String resultSummary;
	private Map<String, Object> raw;
}
