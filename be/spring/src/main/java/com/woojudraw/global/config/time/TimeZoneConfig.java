package com.woojudraw.global.config.time;

import java.util.TimeZone;

import org.springframework.context.annotation.Configuration;

import com.woojudraw.global.time.AppTime;

import jakarta.annotation.PostConstruct;

@Configuration
public class TimeZoneConfig {

	@PostConstruct
	void setDefaultTimeZone() {
		TimeZone.setDefault(TimeZone.getTimeZone(AppTime.KST_ZONE_ID));
	}
}
