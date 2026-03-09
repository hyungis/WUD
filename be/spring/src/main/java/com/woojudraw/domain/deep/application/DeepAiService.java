package com.woojudraw.domain.deep.application;

import com.woojudraw.domain.deep.api.dto.req.AiAnalyzeReq;

public interface DeepAiService {

	void requestHtpAnalysis(AiAnalyzeReq request);
}
