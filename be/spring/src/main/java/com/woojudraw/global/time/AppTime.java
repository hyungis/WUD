package com.woojudraw.global.time;

import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;

public final class AppTime {

	public static final ZoneId KST_ZONE_ID = ZoneId.of("Asia/Seoul");
	private static volatile Clock clock = Clock.system(KST_ZONE_ID);

	private AppTime() {
	}

	public static OffsetDateTime nowKst() {
		return OffsetDateTime.now(clock);
	}

	public static LocalDate todayKst() {
		return LocalDate.now(clock);
	}

	public static void overrideClock(Clock overrideClock) {
		clock = overrideClock;
	}

	public static void resetClock() {
		clock = Clock.system(KST_ZONE_ID);
	}
}
