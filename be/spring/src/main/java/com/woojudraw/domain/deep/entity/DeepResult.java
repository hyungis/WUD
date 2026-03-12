package com.woojudraw.domain.deep.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Getter
@Table(name = "deep_results")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DeepResult{

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "deep_session_id", nullable = false, unique = true)
	private Long deepSessionId;

	@Column(name = "result", columnDefinition = "TEXT", nullable = false)
	private String result;

	@Column(name = "raw", columnDefinition = "TEXT")
	private String raw;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	@Builder
	private DeepResult(
		Long deepSessionId,
		String result,
		String raw,
		LocalDateTime createdAt
	) {
		this.deepSessionId = deepSessionId;
		this.result = result;
		this.raw = raw;
		this.createdAt = createdAt;
	}

	public static DeepResult create(Long deepSessionId, String result, String raw) {
		return DeepResult.builder()
			.deepSessionId(deepSessionId)
			.result(result)
			.raw(raw)
			.createdAt(AppTime.nowUtc())
			.build();
	}

	public void updateResult(String result, String raw) {
		this.result = result;
		this.raw = raw;
	}
}
