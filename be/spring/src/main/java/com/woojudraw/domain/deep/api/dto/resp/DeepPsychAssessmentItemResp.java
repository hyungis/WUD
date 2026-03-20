package com.woojudraw.domain.deep.api.dto.resp;

import java.util.Map;

import com.woojudraw.domain.deep.entity.PsychTestCode;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class DeepPsychAssessmentItemResp {

	private PsychTestCode testCode;
	private Integer scoreTotal;
	private Boolean isSkipped;
	private Map<String, Object> raw;
}
