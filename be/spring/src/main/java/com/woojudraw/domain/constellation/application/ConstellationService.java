package com.woojudraw.domain.constellation.application;

import com.woojudraw.domain.daily.entity.Daily;
import com.woojudraw.domain.constellation.api.dto.resp.GetStarMapResp;
import com.woojudraw.domain.constellation.api.dto.resp.GetWeeklyConstellationResp;
import com.woojudraw.domain.deep.entity.DeepSession;

public interface ConstellationService {
	void createDeepStarIfNeeded(DeepSession deepSession);

	void createDailyStarIfNeeded(Daily daily);

	GetStarMapResp getStarMap(Long userId);

	GetWeeklyConstellationResp getWeeklyConstellations(Long userId);
}
