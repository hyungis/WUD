package com.woojudraw.domain.daily.api.dto.req;

import com.woojudraw.domain.daily.entity.Emotion;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UpdateDailyReq {

	@Size(max = 2000)
	private String content;

	@NotNull
	private Emotion emotion;
}
