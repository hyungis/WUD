package com.woojudraw.domain.image.api.dto.resp;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ImageCreateResp {

	private final Long imageId;
	private final String imageKey;
}
