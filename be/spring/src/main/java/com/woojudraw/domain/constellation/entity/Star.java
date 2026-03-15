package com.woojudraw.domain.constellation.entity;
import java.math.BigDecimal;
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
			.createdAt(now)
			.updatedAt(now)
			.build();
	}

	public static Star createDailyStar(
		Long userId,
		Constellation constellation,
		Long dailyEntryId,
		LocalDateTime now
	) {
		return Star.builder()
			.userId(userId)
			.constellation(constellation)
			.dailyEntryId(dailyEntryId)
			.deepSessionId(null)
			.kind(StarKind.DAILY)
			.createdAt(now)
			.updatedAt(now)
			.build();
	}
}
