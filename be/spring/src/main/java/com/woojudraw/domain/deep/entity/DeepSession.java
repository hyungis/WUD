package com.woojudraw.domain.deep.entity;

import java.util.ArrayList;
import java.util.List;
import java.time.OffsetDateTime;

import com.woojudraw.domain.user.entity.User;
import com.woojudraw.global.time.AppTime;

import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
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

	@OneToMany(mappedBy = "deepSession", cascade = CascadeType.ALL, orphanRemoval = true)
	private List<DeepSubmission> submissions = new ArrayList<>();

	@OneToMany(mappedBy = "deepSession", cascade = CascadeType.ALL, orphanRemoval = true)
	private List<DeepPsychAssessment> psychAssessments = new ArrayList<>();

	@OneToOne(mappedBy = "deepSession", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
	private DeepResult deepResult;

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

	public void addSubmission(DeepSubmission submission) {
		if (submission == null) {
			return;
		}
		if (!submissions.contains(submission)) {
			submissions.add(submission);
		}
		submission.attachTo(this);
	}

	public void removeSubmission(DeepSubmission submission) {
		if (submission == null) {
			return;
		}
		submissions.remove(submission);
		submission.attachTo(null);
	}

	public void addPsychAssessment(DeepPsychAssessment psychAssessment) {
		if (psychAssessment == null) {
			return;
		}
		if (!psychAssessments.contains(psychAssessment)) {
			psychAssessments.add(psychAssessment);
		}
		psychAssessment.attachTo(this);
	}

	public void removePsychAssessment(DeepPsychAssessment psychAssessment) {
		if (psychAssessment == null) {
			return;
		}
		psychAssessments.remove(psychAssessment);
		psychAssessment.attachTo(null);
	}

	public void assignDeepResult(DeepResult deepResult) {
		if (this.deepResult == deepResult) {
			return;
		}
		if (this.deepResult != null) {
			this.deepResult.attachTo(null);
		}
		this.deepResult = deepResult;
		if (deepResult != null) {
			deepResult.attachTo(this);
		}
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
