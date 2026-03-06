package com.woojudraw.domain.deep.api.dto.resp;

import com.woojudraw.domain.deep.entity.DeepType;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class DeepTestListItemResp {

	private DeepType type;
	private String title;
	private String description;
	private boolean available;
}