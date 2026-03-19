package com.woojudraw.domain.daily.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum DailyType {
	MANDALA("MANDALA", "만다라"),
	COLORING("COLORING", "컬러링"),
	FREE("FREE", "자유 드로잉");

	private final String code;
	private final String label;

	DailyType(String code, String label) {
		this.code = code;
		this.label = label;
	}

	@JsonValue
	public String getCode() {
		return code;
	}

	public String getLabel() {
		return label;
	}

	@JsonCreator(mode = JsonCreator.Mode.DELEGATING)
	public static DailyType from(String raw) {
		if (raw == null) {
			return null;
		}

		String normalized = normalize(raw);
		for (DailyType dailyType : values()) {
			if (normalize(dailyType.code).equals(normalized)
				|| normalize(dailyType.name()).equals(normalized)
				|| normalize(dailyType.label).equals(normalized)) {
				return dailyType;
			}
		}

		if ("색칠".equals(normalized)) {
			return COLORING;
		}

		if ("자유드로잉".equals(normalized) || "자유그림".equals(normalized)) {
			return FREE;
		}

		throw new IllegalArgumentException("Invalid dailyType: " + raw);
	}

	private static String normalize(String raw) {
		return raw.trim()
			.replace("_", "")
			.replace("-", "")
			.replace(" ", "")
			.toUpperCase();
	}
}
