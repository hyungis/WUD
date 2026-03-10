package com.woojudraw.domain.constellation.application;

import com.woojudraw.domain.constellation.api.dto.resp.GetStarMapResp;
import com.woojudraw.domain.constellation.api.dto.resp.GetWeeklyConstellationResp;
import com.woojudraw.domain.deep.entity.DeepSession;

public interface ConstellationService {
	void createDeepStarIfNeeded(DeepSession deepSession);

	GetStarMapResp getStarMap(Long userId);

	GetWeeklyConstellationResp getWeeklyConstellations(Long userId);
}
