package com.woojudraw.domain.deep.api.dto.resp;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SubmitWho5Resp {

	private Long assessmentId;
	private Integer scoreTotal;
}
