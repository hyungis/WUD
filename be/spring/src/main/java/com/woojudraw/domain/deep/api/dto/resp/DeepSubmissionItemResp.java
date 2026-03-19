package com.woojudraw.domain.deep.api.dto.resp;

import com.woojudraw.domain.deep.entity.SubmissionType;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class DeepSubmissionItemResp {

	private SubmissionType type;
	private Long imageId;
	private String imageKey;
	private String imageUrl;
}
