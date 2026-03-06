package com.woojudraw.domain.storage.application;

import com.woojudraw.domain.storage.api.dto.req.ImageCreateReq;
import com.woojudraw.domain.storage.api.dto.req.ImagePresignedUrlReq;
import com.woojudraw.domain.storage.api.dto.resp.ImageCreateResp;
import com.woojudraw.domain.storage.api.dto.resp.ImagePresignedUrlResp;

public interface StorageService {

	ImagePresignedUrlResp issuePresignedUrl(Long memberId, ImagePresignedUrlReq req);

	ImageCreateResp createImage(ImageCreateReq req);
}
