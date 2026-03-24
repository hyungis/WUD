package com.woojudraw.domain.constellation.api.dto.req;

import com.woojudraw.domain.constellation.entity.CenterStarShapeType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UpdateCenterStarReq {

	@NotNull(message = "중심별 모양은 필수입니다.")
	private CenterStarShapeType shapeType;

	@NotBlank(message = "중심별 색상은 필수입니다.")
	@Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "색상은 #RRGGBB 형식이어야 합니다.")
	private String color;
}
