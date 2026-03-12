package com.woojudraw.domain.deep.entity;

import java.time.OffsetDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import com.woojudraw.global.time.AppTime;

@Entity
@Table(name = "deep_submissions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DeepSubmission {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "deep_session_id", nullable = false)
	private Long deepSessionId;

	@Column(name = "image_id", nullable = false)
	private Long imageId;

	@Enumerated(EnumType.STRING)
	@Column(name = "type", nullable = false, length = 20)
	private SubmissionType type;

	@Column(name = "created_at", nullable = false)
	private OffsetDateTime createdAt;

	@Builder
	private DeepSubmission(Long deepSessionId, Long imageId, SubmissionType type, OffsetDateTime createdAt) {
		this.deepSessionId = deepSessionId;
		this.imageId = imageId;
		this.type = type;
		this.createdAt = createdAt;
	}

	public static DeepSubmission create(Long deepSessionId, Long imageId, SubmissionType type) {
		return DeepSubmission.builder()
			.deepSessionId(deepSessionId)
			.imageId(imageId)
			.type(type)
			.createdAt(AppTime.nowKst())
			.build();
	}
}
