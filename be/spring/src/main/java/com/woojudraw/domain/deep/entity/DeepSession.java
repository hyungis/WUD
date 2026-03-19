package com.woojudraw.domain.deep.entity;

import java.time.OffsetDateTime;

import com.woojudraw.domain.user.entity.User;
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
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "deep_sessions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DeepSession {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

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
		User user,
		DeepType deepType,
		OffsetDateTime submittedAt,
		OffsetDateTime completedAt,
		DeepStatus status,
		OffsetDateTime createdAt,
		OffsetDateTime updatedAt
	) {
		this.user = user;
		this.deepType = deepType;
		this.submittedAt = submittedAt;
		this.completedAt = completedAt;
		this.status = status;
		this.createdAt = createdAt;
		this.updatedAt = updatedAt;
	}

	public static DeepSession create(User user) {
		OffsetDateTime now = AppTime.nowKst();
		return DeepSession.builder()
			.user(user)
			.status(DeepStatus.DRAFT)
			.createdAt(now)
			.updatedAt(now)
			.build();
	}

	public Long getUserId() {
		return user == null ? null : user.getId();
	}

	public boolean isOwnedBy(Long userId) {
		return user != null && user.getId().equals(userId);
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
