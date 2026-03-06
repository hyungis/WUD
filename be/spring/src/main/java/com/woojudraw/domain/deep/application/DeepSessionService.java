package com.woojudraw.domain.deep.application;

import com.woojudraw.domain.deep.api.dto.req.CreateDeepSessionReq;
import com.woojudraw.domain.deep.api.dto.resp.CreateDeepSessionResp;

public interface DeepSessionService {

	CreateDeepSessionResp createDeepSession(Long userId, CreateDeepSessionReq request);
}
