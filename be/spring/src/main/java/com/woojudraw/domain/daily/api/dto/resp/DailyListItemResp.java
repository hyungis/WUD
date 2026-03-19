package com.woojudraw.domain.daily.api.dto.resp;

import java.time.LocalDate;

import com.woojudraw.domain.daily.entity.DailyAnalysisStatus;
import com.woojudraw.domain.daily.entity.DailyType;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class DailyListItemResp {

	private Long dailyId;
	private DailyType dailyType;
	private LocalDate entryDate;
	private String emotion;
	private Integer emotionValue;
	private String emotionColor;
	private Long drawingImageId;
	private DailyAnalysisStatus analysisStatus;
	private String resultSummary;
}
