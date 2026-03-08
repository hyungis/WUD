package com.woojudraw.domain.deep.api.dto.req;

import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Who5AnalyzeReq {

	private Integer scoreTotal;
	private Map<String, Integer> raw;
}
