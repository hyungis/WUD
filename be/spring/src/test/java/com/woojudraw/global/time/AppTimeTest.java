package com.woojudraw.global.time;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

class AppTimeTest {

	@Test
	void nowKstUsesSeoulOffset() {
		OffsetDateTime now = AppTime.nowKst();

		assertThat(now.getOffset()).isEqualTo(ZoneOffset.ofHours(9));
	}
}
