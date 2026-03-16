package com.woojudraw.domain.deep.api.dto.req;

import java.util.List;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class SubmitSpaneReq {

	@NotEmpty(message = "answer는 필수입니다.")
	@Size(min = 12, max = 12, message = "SPANE answers는 12개여야 합니다.")
	private List<Integer> answers;
}

