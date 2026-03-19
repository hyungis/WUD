package com.woojudraw.domain.deep.entity;

import java.time.OffsetDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import com.woojudraw.global.time.AppTime;

@Entity
@Getter
@Table(name = "deep_results")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DeepResult{

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@OneToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "deep_session_id", nullable = false, unique = true)
	private DeepSession deepSession;

	@Column(name = "result", columnDefinition = "TEXT", nullable = false)
	private String result;

	@Column(name = "raw", columnDefinition = "TEXT")
	private String raw;

	@Column(name = "created_at", nullable = false)
	private OffsetDateTime createdAt;

	@Builder
	private DeepResult(
		DeepSession deepSession,
		String result,
		String raw,
		OffsetDateTime createdAt
	) {
		this.deepSession = deepSession;
		this.result = result;
		this.raw = raw;
		this.createdAt = createdAt;
	}

	public static DeepResult create(DeepSession deepSession, String result, String raw) {
		return DeepResult.builder()
			.deepSession(deepSession)
			.result(result)
			.raw(raw)
			.createdAt(AppTime.nowKst())
			.build();
	}

	public Long getDeepSessionId() {
		return deepSession == null ? null : deepSession.getId();
	}

	void attachTo(DeepSession deepSession) {
		this.deepSession = deepSession;
	}

	public void updateResult(String result, String raw) {
		this.result = result;
		this.raw = raw;
	}
}
