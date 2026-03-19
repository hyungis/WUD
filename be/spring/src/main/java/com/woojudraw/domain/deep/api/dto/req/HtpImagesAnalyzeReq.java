package com.woojudraw.domain.deep.api.dto.req;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HtpImagesAnalyzeReq {

	private String houseImageKey;
	private String treeImageKey;
	private String personImageKey;
}
