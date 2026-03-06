package com.woojudraw.domain.storage.application.impl;

import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.woojudraw.domain.storage.api.dto.req.ImageCreateReq;
import com.woojudraw.domain.storage.api.dto.req.ImagePresignedUrlReq;
import com.woojudraw.domain.storage.api.dto.resp.ImageCreateResp;
import com.woojudraw.domain.storage.api.dto.resp.ImagePresignedUrlResp;
import com.woojudraw.domain.storage.application.StorageService;
import com.woojudraw.domain.storage.entity.Image;
import com.woojudraw.domain.storage.entity.ImageStatus;
import com.woojudraw.domain.storage.repository.ImageRepository;
import com.woojudraw.global.exception.BusinessException;
import com.woojudraw.global.exception.ResponseCode;

import lombok.RequiredArgsConstructor;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@Service
@RequiredArgsConstructor
@Transactional
public class StorageServiceImpl implements StorageService {

	private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

	private final ImageRepository imageRepository;
	private final S3Presigner s3Presigner;

	@Value("${cloud.aws.s3.bucket}")
	private String bucket;

	@Value("${cloud.aws.s3.path.photo:photos}")
	private String photoPath;

	@Value("${cloud.aws.s3.presigned-url-exp-min:5}")
	private long presignedUrlExpMin;

	@Override
	@Transactional
	public ImagePresignedUrlResp issuePresignedUrl(Long memberId, ImagePresignedUrlReq req) {
		validateS3Settings();
		validateImageMimeType(req.getMimeType());

		String imageKey = generateImageKey(memberId, req.getMimeType());
		Image image = imageRepository.save(
			Image.builder()
				.imageKey(imageKey)
				.mimeType(req.getMimeType())
				.byteSize(req.getByteSize())
				.width(req.getWidth())
				.height(req.getHeight())
				.purpose(req.getPurpose())
				.status(ImageStatus.PENDING)
				.build()
		);

		PutObjectRequest putObjectRequest = PutObjectRequest.builder()
			.bucket(bucket)
			.key(imageKey)
			.contentType(req.getMimeType())
			.contentLength(req.getByteSize())
			.build();

		PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
			.signatureDuration(Duration.ofMinutes(presignedUrlExpMin))
			.putObjectRequest(putObjectRequest)
			.build();

		String uploadUrl = s3Presigner.presignPutObject(presignRequest).url().toString();

		return ImagePresignedUrlResp.builder()
			.image(
				ImagePresignedUrlResp.ImageInfo.builder()
					.id(image.getId())
					.imageKey(imageKey)
					.status(ImageStatus.PENDING.name())
					.build()
			)
			.upload(
				ImagePresignedUrlResp.UploadInfo.builder()
					.method("PUT")
					.url(uploadUrl)
					.headers(Map.of("Content-Type", req.getMimeType()))
					.build()
			)
			.build();
	}

	@Override
	public ImageCreateResp createImage(ImageCreateReq req) {
		validateImageKey(req.getImageKey());
		validateImageMimeType(req.getMimeType());

		if (imageRepository.existsByImageKey(req.getImageKey())) {
			throw new BusinessException(ResponseCode.CONFLICT, Map.of("imageKey", "already exists"));
		}

		Image image = imageRepository.save(
			Image.builder()
				.imageKey(req.getImageKey())
				.mimeType(req.getMimeType())
				.byteSize(req.getByteSize())
				.status(ImageStatus.REGISTERED)
				.build()
		);

		return ImageCreateResp.builder()
			.imageId(image.getId())
			.imageKey(image.getImageKey())
			.build();
	}

	private void validateS3Settings() {
		if (bucket == null || bucket.isBlank()) {
			throw new BusinessException(ResponseCode.INTERNAL_ERROR, Map.of("cloud.aws.s3.bucket", "is required"));
		}
		if (photoPath == null || photoPath.isBlank()) {
			throw new BusinessException(ResponseCode.INTERNAL_ERROR, Map.of("cloud.aws.s3.path.photo", "is required"));
		}
		if (presignedUrlExpMin <= 0) {
			throw new BusinessException(ResponseCode.INTERNAL_ERROR, Map.of("cloud.aws.s3.presigned-url-exp-min", "must be positive"));
		}
	}

	private void validateImageMimeType(String mimeType) {
		if (mimeType == null || !mimeType.startsWith("image/")) {
			throw new BusinessException(ResponseCode.FILE_TYPE_NOT_ALLOWED);
		}
	}

	private void validateImageKey(String imageKey) {
		if (imageKey == null || imageKey.isBlank()) {
			throw new BusinessException(ResponseCode.INVALID_REQUEST);
		}
	}

	private String generateImageKey(Long memberId, String mimeType) {
		String extension = extractExtensionFromMimeType(mimeType);
		String currentDate = LocalDate.now().format(DATE_FORMATTER);
		return photoPath + "/users/" + memberId + "/" + currentDate + "/" + UUID.randomUUID() + extension;
	}

	private String extractExtensionFromMimeType(String mimeType) {
		return switch (mimeType) {
			case "image/jpeg" -> ".jpg";
			case "image/png" -> ".png";
			case "image/webp" -> ".webp";
			case "image/gif" -> ".gif";
			default -> ".bin";
		};
	}
}
