package com.woojudraw.domain.user.api.dto.req;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UpdateUserProfileReq {

	@NotBlank(message = "닉네임은 필수입니다.")
	@Size(max = 20, message = "닉네임은 20자 이내여야 합니다.")
	private String nickname;
}
