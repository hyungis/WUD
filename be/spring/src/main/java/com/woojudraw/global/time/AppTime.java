package com.woojudraw.global.time;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;

public final class AppTime {

	public static final ZoneId KST_ZONE_ID = ZoneId.of("Asia/Seoul");
	public static final ZoneOffset UTC_OFFSET = ZoneOffset.UTC;

	private AppTime() {
	}

	public static OffsetDateTime nowKst() {
		return OffsetDateTime.now(KST_ZONE_ID);
	}

	public static LocalDate todayKst() {
		return LocalDate.now(KST_ZONE_ID);
	}

	public static LocalDateTime nowUtc() {
		return LocalDateTime.now(UTC_OFFSET);
	}

	public static OffsetDateTime utc(LocalDateTime value) {
		return value.atOffset(UTC_OFFSET);
	}

	public static OffsetDateTime kstFromUtc(LocalDateTime value) {
		return utc(value)
			.atZoneSameInstant(KST_ZONE_ID)
			.toOffsetDateTime();
	}
}
