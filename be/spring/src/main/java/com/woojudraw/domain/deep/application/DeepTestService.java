package com.woojudraw.domain.deep.application;

import java.util.List;

import com.woojudraw.domain.deep.api.dto.resp.DeepTestGuideResp;
import com.woojudraw.domain.deep.api.dto.resp.DeepTestListItemResp;

public interface DeepTestService {

	List<DeepTestListItemResp> getDeepTests(Long userId);

	DeepTestGuideResp getDeepTestGuide(String type);
}
