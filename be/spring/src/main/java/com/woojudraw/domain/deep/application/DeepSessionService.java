package com.woojudraw.domain.deep.application;

import java.util.List;

import com.woojudraw.domain.deep.api.dto.req.CreateDeepSessionReq;
import com.woojudraw.domain.deep.api.dto.req.SubmitDeepSubmissionsReq;
import com.woojudraw.domain.deep.api.dto.req.SubmitHtpReq;
import com.woojudraw.domain.deep.api.dto.req.SubmitSpaneReq;
import com.woojudraw.domain.deep.api.dto.req.SubmitWho5Req;
import com.woojudraw.domain.deep.api.dto.resp.CreateDeepSessionResp;
import com.woojudraw.domain.deep.api.dto.resp.DeepResultResp;
import com.woojudraw.domain.deep.api.dto.resp.DeepSessionListItemResp;
import com.woojudraw.domain.deep.api.dto.resp.DeepSessionStatusResp;
import com.woojudraw.domain.deep.api.dto.resp.SubmitDeepSubmissionResp;
import com.woojudraw.domain.deep.api.dto.resp.SubmitSpaneResp;
import com.woojudraw.domain.deep.api.dto.resp.SubmitWho5Resp;

public interface DeepSessionService {

	CreateDeepSessionResp createDeepSession(Long userId, CreateDeepSessionReq request);

	SubmitWho5Resp submitWho5(Long userId, Long sessionId, SubmitWho5Req request);

	SubmitDeepSubmissionResp submitHtp(Long userId, Long sessionId, SubmitHtpReq request);

	DeepSessionStatusResp getDeepSessionStatus(Long userId, Long sessionId);

	DeepResultResp getDeepResult(Long userId, Long sessionId);

	List<DeepSessionListItemResp> getDeepSessions(Long userId);

	SubmitSpaneResp submitSpane(Long userId, Long sessionId, SubmitSpaneReq request);

	SubmitDeepSubmissionResp submitDeepSubmissions(Long userId, Long sessionId, SubmitDeepSubmissionsReq request);

	void deleteDeepSession(Long userId, Long sessionId);
}
