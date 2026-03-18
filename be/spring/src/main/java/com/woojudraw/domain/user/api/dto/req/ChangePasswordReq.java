package com.woojudraw.domain.user.api.dto.req;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ChangePasswordReq {
	@NotBlank(message = "현재 비밀번호는 필수입니다.")
	private String currentPassword;

	@NotBlank(message = "새 비밀번호는 필수입니다.")
	@Size(min = 0, max = 20, message = "비밀번호는 8~20자 사이여야 합니다.")
	private String newPassword;
}
