package com.woojudraw.domain.deep.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import com.woojudraw.global.time.AppTime;

import java.time.OffsetDateTime;

@Entity
@Table(name = "deep_sessions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DeepSession {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "user_id", nullable = false)
	private Long userId;

	@Enumerated(EnumType.STRING)
	@Column(name = "deep_type", length = 30)
	private DeepType deepType;

	@Column(name = "submitted_at")
	private OffsetDateTime submittedAt;

	@Column(name = "completed_at")
	private OffsetDateTime completedAt;

	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false, length = 20)
	private DeepStatus status;

	@Column(name = "created_at", nullable = false)
	private OffsetDateTime createdAt;

	@Column(name = "updated_at", nullable = false)
	private OffsetDateTime updatedAt;

	@Builder
	private DeepSession(
		Long userId,
		DeepType deepType,
		OffsetDateTime submittedAt,
		OffsetDateTime completedAt,
		DeepStatus status,
		OffsetDateTime createdAt,
		OffsetDateTime updatedAt
	) {
		this.userId = userId;
		this.deepType = deepType;
		this.submittedAt = submittedAt;
		this.completedAt = completedAt;
		this.status = status;
		this.createdAt = createdAt;
		this.updatedAt = updatedAt;
	}

	public static DeepSession create(Long userId) {
		OffsetDateTime now = AppTime.nowKst();
		return DeepSession.builder()
			.userId(userId)
			.status(DeepStatus.DRAFT)
			.createdAt(now)
			.updatedAt(now)
			.build();
	}

	public void updateDeepType(DeepType deepType) {
		this.deepType = deepType;
		this.updatedAt = AppTime.nowKst();
	}

	public void changeStatus(DeepStatus status) {
		this.status = status;
		this.updatedAt = AppTime.nowKst();
	}

	public void markSubmitted() {
		OffsetDateTime now = AppTime.nowKst();
		this.submittedAt = now;
		this.updatedAt = now;
	}

	public void markCompleted() {
		OffsetDateTime now = AppTime.nowKst();
		this.completedAt = now;
		this.updatedAt = now;
	}
}
