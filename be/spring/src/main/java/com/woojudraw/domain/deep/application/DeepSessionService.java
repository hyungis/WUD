package com.woojudraw.domain.deep.application;

import com.woojudraw.domain.deep.api.dto.req.CreateDeepSessionReq;
import com.woojudraw.domain.deep.api.dto.req.SubmitWho5Req;
import com.woojudraw.domain.deep.api.dto.resp.CreateDeepSessionResp;
import com.woojudraw.domain.deep.api.dto.resp.SubmitWho5Resp;

public interface DeepSessionService {

	CreateDeepSessionResp createDeepSession(Long userId, CreateDeepSessionReq request);

	SubmitWho5Resp submitWho5(Long userId, Long sessionId, SubmitWho5Req request);
}
