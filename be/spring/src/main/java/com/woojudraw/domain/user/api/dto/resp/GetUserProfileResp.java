package com.woojudraw.domain.user.api.dto.resp;

import java.time.OffsetDateTime;

import com.woojudraw.domain.user.entity.UserStatus;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class GetUserProfileResp {
	private Long id;
	private String email;
	private String nickname;
	private UserStatus status;
	private OffsetDateTime joinedAt;
	private OffsetDateTime lastLoginAt;
}
