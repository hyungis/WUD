package com.woojudraw.domain.deep.api.dto.resp;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiAnalyzeResp {

	private String status;
	private String message;
	private AiAnalyzeDataResp data;
}
