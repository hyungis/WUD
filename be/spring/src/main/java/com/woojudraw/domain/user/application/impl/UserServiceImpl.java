package com.woojudraw.domain.user.application.impl;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.woojudraw.domain.user.api.dto.req.ChangePasswordReq;
import com.woojudraw.domain.user.api.dto.req.UpdateUserProfileReq;
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
@Transactional
public class UserServiceImpl implements UserService {

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;

	@Transactional(readOnly = true)
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

	@Override
	public void updateProfile(Long userId, UpdateUserProfileReq req) {
		User user = userRepository.findById(userId)
			.orElseThrow(() -> new BusinessException(ResponseCode.USER_NOT_FOUND));

		if(!user.getNickname().equals(req.getNickname()) &&
			userRepository.existsByNickname(req.getNickname())){
			throw new BusinessException(ResponseCode.NICKNAME_ALREADY_EXISTS);
		}

		user.updateNickname(req.getNickname());
	}

	@Override
	public void changePassword(Long userId, ChangePasswordReq req) {
		User user = userRepository.findById(userId)
			.orElseThrow(() -> new BusinessException(ResponseCode.USER_NOT_FOUND));

		if(!passwordEncoder.matches(req.getCurrentPassword(), user.getPassword())){
			throw new BusinessException(ResponseCode.INVALID_PASSWORD);
		}

		String encodePassword = passwordEncoder.encode(req.getNewPassword());
		user.updatePassword(encodePassword);
	}
}
