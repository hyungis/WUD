package com.woojudraw.domain.deep.api.dto.req;

import java.util.List;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class SubmitWho5Req {
	@NotEmpty(message = "answers는 필수입니다.")
	@Size(min = 5, max = 5, message = "WHO5 answers는 5개여야 합니다.")
	private List<Integer> answers;
}
