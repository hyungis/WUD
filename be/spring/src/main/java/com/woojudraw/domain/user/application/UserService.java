package com.woojudraw.domain.user.application;

import com.woojudraw.domain.user.api.dto.resp.GetUserProfileResp;

public interface UserService {
	GetUserProfileResp getUserProfile(Long userId);
}
