package com.woojudraw.domain.daily.application;

import com.woojudraw.domain.daily.api.dto.req.DailyAiAnalyzeReq;

public interface DailyAiService {

	void requestDailyAnalysis(DailyAiAnalyzeReq request);
}
