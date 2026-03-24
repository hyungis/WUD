package com.woojudraw.domain.constellation.api.dto.resp;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class GetCenterStarResp {
	private String shapeType;
	private String color;
}
