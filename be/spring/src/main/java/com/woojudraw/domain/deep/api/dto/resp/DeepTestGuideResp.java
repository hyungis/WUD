package com.woojudraw.domain.deep.api.dto.resp;

import java.util.List;

import com.woojudraw.domain.deep.entity.DeepType;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class DeepTestGuideResp {

	private DeepType type;
	private String title;
	private String purpose;
	private List<String> instructions;
	private List<String> cautions;
	private String disclaimer;
}
