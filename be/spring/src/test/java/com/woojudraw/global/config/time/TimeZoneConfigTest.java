package com.woojudraw.global.config.time;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.TimeZone;

import org.junit.jupiter.api.Test;

class TimeZoneConfigTest {

	@Test
	void setsDefaultTimeZoneToAsiaSeoul() {
		TimeZone original = TimeZone.getDefault();
		try {
			new TimeZoneConfig().setDefaultTimeZone();

			assertThat(TimeZone.getDefault().getID()).isEqualTo("Asia/Seoul");
		} finally {
			TimeZone.setDefault(original);
		}
	}
}
