package com.woojudraw.domain.user.application.impl;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.woojudraw.domain.user.api.dto.resp.GetUserProfileResp;
import com.woojudraw.domain.user.application.UserService;
import com.woojudraw.domain.user.entity.User;
import com.woojudraw.domain.user.repository.UserRepository;
import com.woojudraw.global.exception.BusinessException;
import com.woojudraw.global.exception.ResponseCode;
import com.woojudraw.global.time.AppTime;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserServiceImpl implements UserService {

	private final UserRepository userRepository;

	@Override
	public GetUserProfileResp getUserProfile(Long userId) {
		User user = userRepository.findById(userId)
			.orElseThrow(() -> new BusinessException(ResponseCode.USER_NOT_FOUND));

		return GetUserProfileResp.builder()
			.id(user.getId())
			.email(user.getEmail())
			.nickname(user.getNickname())
			.status(user.getStatus())
			.joinedAt(AppTime.kstFromUtc(user.getCreatedAt()))
			.lastLoginAt(user.getLastLoginAt() != null ? AppTime.kstFromUtc(user.getLastLoginAt()) : null)
			.build();
	}
}
