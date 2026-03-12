package com.woojudraw.domain.image.entity;

import java.time.OffsetDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import com.woojudraw.domain.user.entity.User;
import com.woojudraw.global.time.AppTime;

@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Entity
@Table(name = "images")
public class Image {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "user_id")
	private User user;

	@Column(name = "image_key", nullable = false, unique = true, columnDefinition = "text")
	private String imageKey;

	@Column(name = "mime_type", nullable = false, length = 50)
	private String mimeType;

	@Column(name = "byte_size", nullable = false)
	private Long byteSize;

	private Integer width;

	private Integer height;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private ImageStatus status;

	@Column(name = "created_at", nullable = false)
	private OffsetDateTime createdAt;

	@Column(name = "deleted_at")
	private OffsetDateTime deletedAt;

	@PrePersist
	public void prePersist() {
		this.createdAt = AppTime.nowKst();
	}

	public void markReady() {
		this.status = ImageStatus.READY;
	}

	public void updateUploadInfo(String mimeType, Long byteSize) {
		this.mimeType = mimeType;
		this.byteSize = byteSize;
	}

	public boolean isOwnedBy(Long memberId) {
		return this.user != null && this.user.getId().equals(memberId);
	}
}
