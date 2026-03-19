package com.woojudraw.domain.daily.entity;

import java.time.OffsetDateTime;

import com.woojudraw.global.time.AppTime;

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

@Entity
@Table(name = "daily_results")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DailyResult {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@OneToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "daily_entries_id", nullable = false, unique = true)
	private Daily daily;

	@Column(name = "result", nullable = false, columnDefinition = "text")
	private String result;

	@Column(name = "raw", columnDefinition = "text")
	private String raw;

	@Column(name = "created_at", nullable = false)
	private OffsetDateTime createdAt;

	@Builder
	private DailyResult(
		Daily daily,
		String result,
		String raw,
		OffsetDateTime createdAt
	) {
		this.daily = daily;
		this.result = result;
		this.raw = raw;
		this.createdAt = createdAt;
	}

	public static DailyResult create(Daily daily, String result, String raw) {
		return DailyResult.builder()
			.daily(daily)
			.result(result)
			.raw(raw)
			.createdAt(AppTime.nowKst())
			.build();
	}

	public Long getDailyEntriesId() {
		return daily == null ? null : daily.getId();
	}

	void attachTo(Daily daily) {
		this.daily = daily;
	}

	public void updateResult(String result, String raw) {
		this.result = result;
		this.raw = raw;
	}
}
