package com.woojudraw.domain.constellation.application;

import com.woojudraw.domain.deep.entity.DeepSession;

public interface ConstellationService {
	void createDeepStarIfNeeded(DeepSession deepSession);
}
