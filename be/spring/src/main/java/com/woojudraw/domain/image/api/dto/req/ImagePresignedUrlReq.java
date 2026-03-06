package com.woojudraw.domain.image.api.dto.req;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;

import com.woojudraw.domain.image.entity.ImagePurpose;

@Getter
public class ImagePresignedUrlReq {

	@NotBlank
	private String mimeType;

	@NotNull
	@Positive
	private Long byteSize;

	@NotNull
	@Positive
	private Integer width;

	@NotNull
	@Positive
	private Integer height;

	@NotNull
	private ImagePurpose purpose;
}
