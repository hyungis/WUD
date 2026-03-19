package com.woojudraw.domain.constellation.entity;

import java.time.OffsetDateTime;

import com.woojudraw.domain.daily.entity.Daily;
import com.woojudraw.domain.deep.entity.DeepSession;
import com.woojudraw.domain.user.entity.User;

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
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "stars")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Star {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "constellation_id", nullable = false)
	private Constellation constellation;

	@OneToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "daily_entry_id")
	private Daily dailyEntry;

	@OneToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "deep_session_id")
	private DeepSession deepSession;

	@Enumerated(EnumType.STRING)
	@Column(name = "kind", nullable = false, length = 20)
	private StarKind kind;

	@Column(name = "color", length = 20)
	private String color;

	@Column(name = "created_at", nullable = false)
	private OffsetDateTime createdAt;

	@Column(name = "updated_at", nullable = false)
	private OffsetDateTime updatedAt;

	public static Star createDeepStar(
		User user,
		Constellation constellation,
		DeepSession deepSession,
		OffsetDateTime now
	) {
		return Star.builder()
			.user(user)
			.constellation(constellation)
			.deepSession(deepSession)
			.dailyEntry(null)
			.kind(StarKind.DEEP)
			.color(null)
			.createdAt(now)
			.updatedAt(now)
			.build();
	}

	public static Star createDailyStar(
		User user,
		Constellation constellation,
		Daily dailyEntry,
		String color,
		OffsetDateTime now
	) {
		return Star.builder()
			.user(user)
			.constellation(constellation)
			.dailyEntry(dailyEntry)
			.deepSession(null)
			.kind(StarKind.DAILY)
			.color(color)
			.createdAt(now)
			.updatedAt(now)
			.build();
	}

	public Long getUserId() {
		return user == null ? null : user.getId();
	}

	public Long getDailyEntryId() {
		return dailyEntry == null ? null : dailyEntry.getId();
	}

	public Long getDeepSessionId() {
		return deepSession == null ? null : deepSession.getId();
	}
}
