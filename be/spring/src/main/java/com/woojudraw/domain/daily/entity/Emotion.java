package com.woojudraw.domain.daily.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum Emotion {
	JOY("기쁨", 4, "#FFD166"),
	SADNESS("슬픔", 2, "#4D96FF"),
	ANGER("분노", 1, "#FF6B6B"),
	DEPRESSION("우울", 3, "#6C757D"),
	HAPPINESS("행복", 5, "#7DD87D");

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

	public static String labelOf(Integer value) {
		if (value == null) {
			return null;
		}

		for (Emotion emotion : values()) {
			if (emotion.value == value) {
				return emotion.label;
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
