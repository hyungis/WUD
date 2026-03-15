package com.woojudraw.domain.daily.entity;

import java.time.LocalDate;
import java.time.OffsetDateTime;

import com.woojudraw.global.time.AppTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "daily_entries")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Daily {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "users_id", nullable = false)
	private Long usersId;

	@Column(name = "daily_type", nullable = false, length = 30)
	private String dailyType;

	@Column(name = "entry_date", nullable = false)
	private LocalDate entryDate;

	@Column(name = "content", nullable = false, columnDefinition = "text")
	private String content;

	@Column(name = "emotion_value", nullable = false)
	private Integer emotionValue;

	@Column(name = "emotion_color", nullable = false, length = 20)
	private String emotionColor;

	@Column(name = "drawing_image_id", nullable = false)
	private Long drawingImageId;

	@Enumerated(EnumType.STRING)
	@Column(name = "analysis_status", nullable = false, length = 20)
	private DailyAnalysisStatus analysisStatus;

	@Column(name = "created_at", nullable = false)
	private OffsetDateTime createdAt;

	@Column(name = "updated_at", nullable = false)
	private OffsetDateTime updatedAt;

	@Column(name = "deleted_at")
	private OffsetDateTime deletedAt;

	@Builder
	private Daily(
		Long usersId,
		String dailyType,
		LocalDate entryDate,
		String content,
		Integer emotionValue,
		String emotionColor,
		Long drawingImageId,
		DailyAnalysisStatus analysisStatus,
		OffsetDateTime createdAt,
		OffsetDateTime updatedAt,
		OffsetDateTime deletedAt
	) {
		this.usersId = usersId;
		this.dailyType = dailyType;
		this.entryDate = entryDate;
		this.content = content;
		this.emotionValue = emotionValue;
		this.emotionColor = emotionColor;
		this.drawingImageId = drawingImageId;
		this.analysisStatus = analysisStatus;
		this.createdAt = createdAt;
		this.updatedAt = updatedAt;
		this.deletedAt = deletedAt;
	}

	public static Daily create(
		Long usersId,
		String dailyType,
		LocalDate entryDate,
		String content,
		Integer emotionValue,
		String emotionColor,
		Long drawingImageId
	) {
		OffsetDateTime now = AppTime.nowKst();
		return Daily.builder()
			.usersId(usersId)
			.dailyType(dailyType)
			.entryDate(entryDate)
			.content(content)
			.emotionValue(emotionValue)
			.emotionColor(emotionColor)
			.drawingImageId(drawingImageId)
			.analysisStatus(DailyAnalysisStatus.PENDING)
			.createdAt(now)
			.updatedAt(now)
			.build();
	}

	public boolean isOwnedBy(Long userId) {
		return this.usersId != null && this.usersId.equals(userId);
	}

	public boolean isDeleted() {
		return this.deletedAt != null;
	}

	public DailyAnalysisStatus currentAnalysisStatus() {
		return analysisStatus;
	}

	public void updateContentAndEmotion(String content, Emotion emotion) {
		this.content = content;
		this.emotionValue = emotion.getValue();
		this.emotionColor = emotion.getColor();
		this.updatedAt = AppTime.nowKst();
	}

	public void markAnalyzing() {
		changeAnalysisStatus(DailyAnalysisStatus.ANALYZING);
	}

	public void markAnalysisDone() {
		changeAnalysisStatus(DailyAnalysisStatus.DONE);
	}

	public void markAnalysisFailed() {
		changeAnalysisStatus(DailyAnalysisStatus.FAILED);
	}

	public void markDeleted() {
		OffsetDateTime now = AppTime.nowKst();
		this.deletedAt = now;
		this.updatedAt = now;
	}

	private void changeAnalysisStatus(DailyAnalysisStatus status) {
		this.analysisStatus = status;
		this.updatedAt = AppTime.nowKst();
	}
}
