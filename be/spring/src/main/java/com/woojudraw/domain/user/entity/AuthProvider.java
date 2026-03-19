package com.woojudraw.domain.user.entity;

import java.time.OffsetDateTime;

import com.woojudraw.global.time.AppTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Entity
@Table(name = "auth_providers")
public class AuthProvider {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@Column(nullable = false, length = 30)
	private String provider;

	@Column(name = "provider_user_id", nullable = false, length = 255)
	private String providerUserId;

	@Column(name = "provider_email", nullable = false, length = 255)
	private String providerEmail;

	@Column(name = "linked_at", nullable = false)
	private OffsetDateTime linkedAt;

	@Column(name = "unlinked_at")
	private OffsetDateTime unlinkedAt;

	@Column(name = "created_at", nullable = false)
	private OffsetDateTime createdAt;

	@Column(name = "updated_at", nullable = false)
	private OffsetDateTime updatedAt;

	@PrePersist
	public void prePersist() {
		OffsetDateTime now = AppTime.nowKst();
		this.createdAt = now;
		this.updatedAt = now;
		if (this.linkedAt == null) {
			this.linkedAt = now;
		}
	}

	@PreUpdate
	public void preUpdate() {
		this.updatedAt = AppTime.nowKst();
	}

	public void unlink() {
		this.unlinkedAt = AppTime.nowKst();
	}
}
