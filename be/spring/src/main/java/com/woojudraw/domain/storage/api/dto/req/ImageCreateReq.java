package com.woojudraw.domain.storage.api.dto.req;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;

@Getter
public class ImageCreateReq {

	@NotBlank
	private String imageKey;

	@NotBlank
	private String mimeType;

	@NotNull
	@Positive
	private Long byteSize;
}
