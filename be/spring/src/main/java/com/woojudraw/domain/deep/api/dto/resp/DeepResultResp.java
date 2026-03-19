package com.woojudraw.domain.deep.api.dto.resp;

import java.util.List;

import com.woojudraw.domain.deep.entity.DeepStatus;
import com.woojudraw.domain.deep.entity.DeepType;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class DeepResultResp {
	private Long sessionId;
	private DeepType deepType;
	private DeepStatus status;
	private List<DeepSubmissionItemResp> submissions;
	private List<String> questions;
	private DeepAiResultResp aiResult;
	private List<DeepPsychAssessmentItemResp> psychAssessments;
}
