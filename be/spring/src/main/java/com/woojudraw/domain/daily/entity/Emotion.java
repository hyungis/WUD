package com.woojudraw.domain.daily.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum Emotion {
	JOY("\uae30\uc068", 4, "#FFD54F"), // 기쁨
	CALM("\ud3c9\uc628", 6, "#4FC3F7"), // 평온
	EXCITEMENT("\uc124\ub818", 7, "#FF6FAE"), // 설렘
	SATISFACTION("\ub9cc\uc871", 5, "#66BB6A"), // 만족
	SADNESS("\uc2ac\ud514", 2, "#5C6BC0"), // 슬픔
	ANXIETY("\ubd88\uc548", 8, "#9575CD"), // 불안
	ANGER("\ubd84\ub178", 1, "#EF5350"), // 분노
	FATIGUE("\uc9c0\uce68", 3, "#90A4AE"); // 지침

	private final String label;
	private final int value;
	private final String color;

	Emotion(String label, int value, String color) {
		this.label = label;
		this.value = value;
		this.color = color;
	}

	@JsonValue
	public String getLabel() {
		return label;
	}

	public int getValue() {
		return value;
	}

	public String getColor() {
		return color;
	}

	public static String labelOf(Integer value, String color) {
		Emotion emotionByColor = findByColor(color);
		if (emotionByColor != null) {
			return emotionByColor.label;
		}

		Emotion emotionByValue = findByValue(value);
		if (emotionByValue != null) {
			return emotionByValue.label;
		}

		return null;
	}

	private static Emotion findByValue(Integer value) {
		if (value == null) {
			return null;
		}

		for (Emotion emotion : values()) {
			if (emotion.value == value) {
				return emotion;
			}
		}
		return null;
	}

	private static Emotion findByColor(String color) {
		if (color == null) {
			return null;
		}

		for (Emotion emotion : values()) {
			if (emotion.color.equalsIgnoreCase(color.trim())) {
				return emotion;
			}
		}
		return null;
	}

	@JsonCreator(mode = JsonCreator.Mode.DELEGATING)
	public static Emotion from(String raw) {
		if (raw == null) {
			return null;
		}

		String trimmed = raw.trim();
		for (Emotion emotion : values()) {
			if (emotion.label.equals(trimmed) || emotion.name().equalsIgnoreCase(trimmed)) {
				return emotion;
			}
		}

		throw new IllegalArgumentException("Invalid emotion: " + raw);
	}
}
