package com.woojudraw.domain.constellation.application;

import com.woojudraw.domain.constellation.api.dto.req.UpdateCenterStarReq;
import com.woojudraw.domain.constellation.api.dto.resp.GetCenterStarResp;
import com.woojudraw.domain.daily.entity.Daily;
import com.woojudraw.domain.constellation.api.dto.resp.GetStarMapResp;
import com.woojudraw.domain.constellation.api.dto.resp.GetWeeklyConstellationResp;
import com.woojudraw.domain.deep.entity.DeepSession;

public interface ConstellationService {
	void createDeepStarIfNeeded(DeepSession deepSession);

	void createDailyStarIfNeeded(Daily daily);

	void deleteDeepStarIfExists(Long deepSessionId);

	void reassignOrDeleteDeepStar(Long deepSessionId, DeepSession fallbackSession);

	void deleteDailyStarIfExists(Long dailyId);

	GetCenterStarResp getCenterStar(Long userId);

	void updateCenterStar(Long userId, UpdateCenterStarReq req);

	GetStarMapResp getStarMap(Long userId);

	GetWeeklyConstellationResp getWeeklyConstellations(Long userId);
}
