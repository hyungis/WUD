package com.woojudraw.domain.deep.api.dto.req;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiAnalyzeReq {

	private Long sessionId;
	private String deepType;
	private Who5AnalyzeReq who5;
	private HtpImagesAnalyzeReq images;
}
