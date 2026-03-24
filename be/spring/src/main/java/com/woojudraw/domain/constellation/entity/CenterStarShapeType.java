package com.woojudraw.domain.constellation.entity;

import java.util.Arrays;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum CenterStarShapeType {
	SPHERE("sphere"),
	BOX("box"),
	OCTAHEDRON("octahedron"),
	ICOSAHEDRON("icosahedron"),
	TORUS_KNOT("torusKnot"),
	DODECAHEDRON("dodecahedron"),
	TETRAHEDRON("tetrahedron"),
	STELLATED("stellated");

	private final String value;

	CenterStarShapeType(String value) {
		this.value = value;
	}

	@JsonValue
	public String getValue() {
		return value;
	}

	@JsonCreator
	public static CenterStarShapeType fromValue(String value) {
		return Arrays.stream(values())
			.filter(type -> type.matches(value))
			.findFirst()
			.orElseThrow(() -> new IllegalArgumentException("Invalid center star shape type: " + value));
	}

	private boolean matches(String rawValue) {
		if (rawValue == null) {
			return false;
		}

		String normalized = normalize(rawValue);
		return normalize(value).equalsIgnoreCase(normalized)
			|| normalize(name()).equalsIgnoreCase(normalized);
	}

	private static String normalize(String value) {
		return value.replace("_", "")
			.replace("-", "")
			.trim();
	}
}
