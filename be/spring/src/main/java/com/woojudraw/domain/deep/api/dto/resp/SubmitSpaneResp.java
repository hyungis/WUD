package com.woojudraw.domain.deep.api.dto.resp;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SubmitSpaneResp {
	private Long assessmentId;
	private Short scorePositive;
	private Short scoreNegative;
	private Short scoreBalance;
}
