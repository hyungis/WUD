package com.woojudraw.domain.daily.api.dto.req;

import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.woojudraw.domain.daily.entity.Emotion;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CreateDailyReq {

	@NotBlank
	@Size(max = 30)
	private String dailyType;

	@NotNull
	@PastOrPresent
	@JsonFormat(pattern = "yyyy-MM-dd")
	private LocalDate entryDate;

	@Size(max = 2000)
	private String content;

	@NotNull
	private Emotion emotion;

	@NotNull
	@Positive
	private Long drawingImageId;
}
