package com.woojudraw.domain.deep.api.dto.resp;

import java.util.List;
import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiAnalyzeDataResp {

	private String resultSummary;
	private List<String> questions;
	private Map<String, Object> raw;
}
