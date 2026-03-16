package com.woojudraw.domain.constellation.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.*;

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

	@Column(name = "user_id", nullable = false)
	private Long userId;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "constellation_id", nullable = false)
	private Constellation constellation;

	@Column(name = "daily_entry_id")
	private Long dailyEntryId;

	@Column(name = "deep_session_id")
	private Long deepSessionId;

	@Enumerated(EnumType.STRING)
	@Column(name = "kind", nullable = false, length = 20)
	private StarKind kind;

	@Column(name = "color", length = 20)
	private String color;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;

	public static Star createDeepStar(
		Long userId,
		Constellation constellation,
		Long deepSessionId,
		LocalDateTime now
	) {
		return Star.builder()
			.userId(userId)
			.constellation(constellation)
			.deepSessionId(deepSessionId)
			.dailyEntryId(null)
			.kind(StarKind.DEEP)
			.color(null)
			.createdAt(now)
			.updatedAt(now)
			.build();
	}

	public static Star createDailyStar(
		Long userId,
		Constellation constellation,
		Long dailyEntryId,
		String color,
		LocalDateTime now
	) {
		return Star.builder()
			.userId(userId)
			.constellation(constellation)
			.dailyEntryId(dailyEntryId)
			.deepSessionId(null)
			.kind(StarKind.DAILY)
			.color(color)
			.createdAt(now)
			.updatedAt(now)
			.build();
	}
}
