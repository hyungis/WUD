package com.woojudraw.domain.user.application;

import com.woojudraw.domain.user.api.dto.req.ChangePasswordReq;
import com.woojudraw.domain.user.api.dto.req.UpdateUserProfileReq;
import com.woojudraw.domain.user.api.dto.resp.GetUserProfileResp;

public interface UserService {
	GetUserProfileResp getUserProfile(Long userId);

	void updateProfile(Long userId, UpdateUserProfileReq req);

	void changePassword(Long userId, ChangePasswordReq req);

	void completeTutorial(Long userId);

	void withdraw(Long userId);
}
