package com.woojudraw.global.time;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

class AppTimeTest {

	@Test
	void nowKstUsesSeoulOffset() {
		OffsetDateTime now = AppTime.nowKst();

		assertThat(now.getOffset()).isEqualTo(ZoneOffset.ofHours(9));
	}

	@Test
	void kstFromUtcConvertsStoredUtcTimestampToSeoulTime() {
		LocalDateTime storedUtc = LocalDateTime.of(2026, 3, 12, 0, 15, 30);

		OffsetDateTime converted = AppTime.kstFromUtc(storedUtc);

		assertThat(converted).isEqualTo(OffsetDateTime.parse("2026-03-12T09:15:30+09:00"));
	}
}
