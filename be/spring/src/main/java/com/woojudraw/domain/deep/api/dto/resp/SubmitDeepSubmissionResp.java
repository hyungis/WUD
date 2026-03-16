package com.woojudraw.domain.deep.api.dto.resp;

import com.woojudraw.domain.deep.entity.DeepStatus;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SubmitDeepSubmissionResp {

	private Long sessionId;
	private DeepStatus status;
}
