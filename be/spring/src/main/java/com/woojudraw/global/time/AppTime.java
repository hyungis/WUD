package com.woojudraw.global.time;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;

public final class AppTime {

	public static final ZoneId KST_ZONE_ID = ZoneId.of("Asia/Seoul");

	private AppTime() {
	}

	public static OffsetDateTime nowKst() {
		return OffsetDateTime.now(KST_ZONE_ID);
	}

	public static LocalDate todayKst() {
		return LocalDate.now(KST_ZONE_ID);
	}
}
