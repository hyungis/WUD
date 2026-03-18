package com.woojudraw.domain.user.entity;

import java.time.OffsetDateTime;

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

	private OffsetDateTime lastLoginAt;

	@Column(nullable = false)
	private OffsetDateTime createdAt;

	private OffsetDateTime deletedAt;

	@PrePersist
	public void prePersist() {
		this.createdAt = AppTime.nowKst();
	}

	public void updateLastLogin() {
		this.lastLoginAt = AppTime.nowKst();
	}

	public void updateNickname(String nickname){
		if(nickname != null && !nickname.isBlank()){
			this.nickname = nickname;
		}
	}

	public void updatePassword(String encodePassword){
		this.password = encodePassword;
	}

	public void withdraw(){
		this.status = UserStatus.DELETED;
		this.deletedAt = AppTime.nowKst();
	}
}
