package com.woojudraw.domain.deep.api.dto.resp;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;

import com.woojudraw.domain.deep.entity.DeepStatus;
import com.woojudraw.domain.deep.entity.DeepType;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class DeepSessionListItemResp {

	private Long sessionId;
	private DeepType deepType;
	private DeepStatus status;
	private String resultSummary;
	private OffsetDateTime createdAt;
}
