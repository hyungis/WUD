package com.woojudraw.domain.deep.api.dto.req;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class SubmitHtpReq {

	@NotNull(message = "houseImageId는 필수입니다.")
	private Long houseImageId;

	@NotNull(message = "treeImageId는 필수입니다.")
	private Long treeImageId;

	@NotNull(message = "personImageId는 필수입니다.")
	private Long personImageId;
}
