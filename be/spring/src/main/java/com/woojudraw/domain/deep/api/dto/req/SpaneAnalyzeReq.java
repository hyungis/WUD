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
public class SpaneAnalyzeReq {
	private Short scorePositive;
	private Short scoreNegative;
	private Short scoreBalance;
	private Boolean isSkipped;
	private Map<String, Integer> raw;
}
