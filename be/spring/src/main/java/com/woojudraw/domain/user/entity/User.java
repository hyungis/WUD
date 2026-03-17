package com.woojudraw.domain.user.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import com.woojudraw.global.time.AppTime;

@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Entity
@Table(name = "users")
public class User {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, unique = true, length = 50)
	private String email;

	@Column(nullable = false)
	private String password;

	@Column(nullable = false, length = 50)
	private String nickname;

	@Builder.Default
	@Enumerated(EnumType.STRING)
	private UserStatus status = UserStatus.ACTIVATE;

	private LocalDateTime lastLoginAt;

	@Column(nullable = false)
	private LocalDateTime createdAt;

	private LocalDateTime deletedAt;

	@PrePersist
	public void prePersist() {
		this.createdAt = AppTime.nowUtc();
	}

	public void updateLastLogin() {
		this.lastLoginAt = AppTime.nowUtc();
	}
}
