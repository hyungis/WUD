package com.woojudraw.domain.daily.application;

import java.time.LocalDate;
import java.util.List;

import com.woojudraw.domain.daily.api.dto.req.CreateDailyReq;
import com.woojudraw.domain.daily.api.dto.req.DailyListPeriod;
import com.woojudraw.domain.daily.api.dto.req.UpdateDailyReq;
import com.woojudraw.domain.daily.api.dto.resp.CreateDailyResp;
import com.woojudraw.domain.daily.api.dto.resp.DailyDetailResp;
import com.woojudraw.domain.daily.api.dto.resp.DailyListItemResp;
import com.woojudraw.domain.daily.api.dto.resp.UpdateDailyResp;

public interface DailyService {

	CreateDailyResp createDaily(Long userId, CreateDailyReq request);

	List<DailyListItemResp> getDailies(Long userId, DailyListPeriod period, LocalDate date);

	DailyDetailResp getDaily(Long userId, Long dailyId);

	UpdateDailyResp updateDaily(Long userId, Long dailyId, UpdateDailyReq request);

	void deleteDaily(Long userId, Long dailyId);
}
