package com.woojudraw.domain.daily.api.dto.resp;

import java.time.LocalDate;
import java.time.OffsetDateTime;

import com.woojudraw.domain.daily.entity.DailyAnalysisStatus;
import com.woojudraw.domain.daily.entity.DailyType;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class DailyDetailResp {

	private Long dailyId;
	private DailyType dailyType;
	private LocalDate entryDate;
	private String content;
	private String emotion;
	private Integer emotionValue;
	private String emotionColor;
	private Long drawingImageId;
	private String drawingImageKey;
	private String drawingImageUrl;
	private DailyAnalysisStatus analysisStatus;
	private String analysisResult;
	private String analysisRaw;
	private OffsetDateTime createdAt;
	private OffsetDateTime updatedAt;
}
