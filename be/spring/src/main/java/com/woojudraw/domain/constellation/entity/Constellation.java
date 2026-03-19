package com.woojudraw.domain.constellation.entity;

import java.util.ArrayList;
import java.util.List;
import java.time.LocalDate;

import com.woojudraw.domain.user.entity.User;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
	name = "constellations",
	uniqueConstraints = {
		@UniqueConstraint(
			name = "uk_constellations_user_week_start",
			columnNames = {"user_id", "week_start_date"}
		)
	}
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Constellation {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@Builder.Default
	@OneToMany(mappedBy = "constellation", cascade = CascadeType.ALL, orphanRemoval = true)
	private List<Star> stars = new ArrayList<>();

	@Column(name = "week_start_date", nullable = false)
	private LocalDate weekStartDate;

	@Column(name = "week_end_date", nullable = false)
	private LocalDate weekEndDate;

	public Long getUserId() {
		return user == null ? null : user.getId();
	}

	public void addStar(Star star) {
		if (star == null) {
			return;
		}
		if (!stars.contains(star)) {
			stars.add(star);
		}
		star.attachTo(this);
	}

	public void removeStar(Star star) {
		if (star == null) {
			return;
		}
		stars.remove(star);
		star.attachTo(null);
	}
}
