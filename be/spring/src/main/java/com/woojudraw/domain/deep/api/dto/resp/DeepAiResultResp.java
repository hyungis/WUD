package com.woojudraw.domain.deep.api.dto.resp;

import java.util.Map;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class DeepAiResultResp {

	private String result;
	private Map<String, Object> raw;
}
