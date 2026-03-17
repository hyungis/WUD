package com.woojudraw.domain.deep.api.dto.req;

import java.util.List;

import com.woojudraw.domain.deep.entity.SubmissionType;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class SubmitDeepSubmissionsReq {
	@NotNull(message = "imageId는 필수입니다.")
	private Long imageId;
	@NotNull(message = "submissionType은 필수입니다.")
	private SubmissionType type; // RAIN_PERSON 또는 STAR_WAVE
}
