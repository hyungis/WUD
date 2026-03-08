package com.woojudraw.domain.deep.application;

import com.woojudraw.domain.deep.api.dto.req.AiAnalyzeReq;
import com.woojudraw.domain.deep.api.dto.resp.AiAnalyzeResp;

public interface DeepAiService {

	AiAnalyzeResp analyzeHtp(AiAnalyzeReq request);
}
