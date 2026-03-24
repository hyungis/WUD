package com.woojudraw.domain.constellation.entity;

import java.time.OffsetDateTime;

import com.woojudraw.domain.user.entity.User;
import com.woojudraw.global.time.AppTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
	name = "center_stars",
	uniqueConstraints = {
		@UniqueConstraint(
			name = "uk_center_stars_user",
			columnNames = {"user_id"}
		)
	}
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class CenterStar {

	public static final CenterStarShapeType DEFAULT_SHAPE_TYPE = CenterStarShapeType.sphere;
	public static final String DEFAULT_COLOR = "#e2e8f0";

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@OneToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false, unique = true)
	private User user;

	@Enumerated(EnumType.STRING)
	@Column(name = "shape_type", nullable = false, length = 30)
	private CenterStarShapeType shapeType;

	@Column(name = "color", nullable = false, length = 7)
	private String color;

	@Column(name = "created_at", nullable = false)
	private OffsetDateTime createdAt;

	@Column(name = "updated_at", nullable = false)
	private OffsetDateTime updatedAt;

	public static CenterStar create(
		User user,
		CenterStarShapeType shapeType,
		String color,
		OffsetDateTime now
	) {
		return CenterStar.builder()
			.user(user)
			.shapeType(shapeType)
			.color(color)
			.createdAt(now)
			.updatedAt(now)
			.build();
	}

	public static CenterStar createDefault(User user, OffsetDateTime now) {
		return create(user, DEFAULT_SHAPE_TYPE, DEFAULT_COLOR, now);
	}

	public void updateCustomization(CenterStarShapeType shapeType, String color) {
		this.shapeType = shapeType;
		this.color = color;
		this.updatedAt = AppTime.nowKst();
	}
}
