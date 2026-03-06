package com.woojudraw.domain.storage.api.dto.resp;

import java.util.Map;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ImagePresignedUrlResp {

	private final ImageInfo image;
	private final UploadInfo upload;

	@Getter
	@Builder
	public static class ImageInfo {
		private final Long id;
		private final String imageKey;
		private final String status;
	}

	@Getter
	@Builder
	public static class UploadInfo {
		private final String method;
		private final String url;
		private final Map<String, String> headers;
	}
}
