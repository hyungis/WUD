package com.woojudraw.domain.deep.application.impl;

import org.springframework.stereotype.Service;

import com.woojudraw.domain.deep.api.dto.req.CreateDeepSessionReq;
import com.woojudraw.domain.deep.api.dto.resp.CreateDeepSessionResp;
import com.woojudraw.domain.deep.application.DeepSessionService;
import com.woojudraw.domain.deep.entity.DeepSession;
import com.woojudraw.domain.deep.repository.DeepSessionRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class DeepSessionServiceImpl implements DeepSessionService {

	private final DeepSessionRepository deepSessionRepository;

	@Override
	public CreateDeepSessionResp createDeepSession(Long userId, CreateDeepSessionReq request) {
		DeepSession deepSession = DeepSession.create(userId);
		DeepSession saved = deepSessionRepository.save(deepSession);

		return CreateDeepSessionResp.builder()
			.sessionId(saved.getId())
			.status(saved.getStatus())
			.build();
	}


}
