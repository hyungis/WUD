package com.woojudraw.domain.deep.entity;

import java.time.OffsetDateTime;

import com.woojudraw.domain.image.entity.Image;
import com.woojudraw.global.time.AppTime;

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
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "deep_submissions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DeepSubmission {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "deep_session_id", nullable = false)
	private DeepSession deepSession;

	@OneToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "image_id", nullable = false)
	private Image image;

	@Enumerated(EnumType.STRING)
	@Column(name = "type", nullable = false, length = 20)
	private SubmissionType type;

	@Column(name = "created_at", nullable = false)
	private OffsetDateTime createdAt;

	@Builder
	private DeepSubmission(DeepSession deepSession, Image image, SubmissionType type, OffsetDateTime createdAt) {
		this.deepSession = deepSession;
		this.image = image;
		this.type = type;
		this.createdAt = createdAt;
	}

	public static DeepSubmission create(DeepSession deepSession, Image image, SubmissionType type) {
		return DeepSubmission.builder()
			.deepSession(deepSession)
			.image(image)
			.type(type)
			.createdAt(AppTime.nowKst())
			.build();
	}

	public Long getDeepSessionId() {
		return deepSession == null ? null : deepSession.getId();
	}

	public Long getImageId() {
		return image == null ? null : image.getId();
	}
}
