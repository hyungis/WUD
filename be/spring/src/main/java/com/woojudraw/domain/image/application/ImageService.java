package com.woojudraw.domain.image.application;

import com.woojudraw.domain.image.api.dto.req.ImageCreateReq;
import com.woojudraw.domain.image.api.dto.req.ImagePresignedUrlReq;
import com.woojudraw.domain.image.api.dto.resp.ImageCreateResp;
import com.woojudraw.domain.image.api.dto.resp.ImagePresignedUrlResp;

public interface ImageService {

	ImagePresignedUrlResp issuePresignedUrl(Long memberId, ImagePresignedUrlReq req);

	ImageCreateResp createImage(Long memberId, ImageCreateReq req);

	String generatePresignedGetUrl(String imageKey);
}
