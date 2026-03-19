package com.woojudraw.domain.daily.api.dto.resp;

import com.woojudraw.domain.daily.entity.DailyAnalysisStatus;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CreateDailyResp {

	private Long dailyId;
	private DailyAnalysisStatus analysisStatus;
}
