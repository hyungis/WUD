package com.woojudraw.domain.deep.entity;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "deep_psych_assessments")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DeepPsychAssessment {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "deep_session_id", nullable = false)
	private Long deepSessionId;

	@Column(name = "user_id", nullable = false)
	private Long userId;

	@Enumerated(EnumType.STRING)
	@Column(name = "test_code", length = 20, nullable = false)
	private PsychTestCode testCode;

	@Column(name = "score_total")
	private Integer scoreTotal;

	@Column(name = "score_positive")
	private Short scorePositive;

	@Column(name = "score_negative")
	private Short scoreNegative;

	@Column(name = "score_balance")
	private Short scoreBalance;

	@Column(name = "week_start_date")
	private LocalDate weekStartDate;

	@Lob
	@Column(name = "raw")
	private String raw;

	@Column(name = "created_at", nullable = false)
	private OffsetDateTime createdAt;

	@Builder
	private DeepPsychAssessment(
		Long deepSessionId,
		Long userId,
		PsychTestCode testCode,
		Integer scoreTotal,
		Short scorePositive,
		Short scoreNegative,
		Short scoreBalance,
		LocalDate weekStartDate,
		String raw,
		OffsetDateTime createdAt
	) {
		this.deepSessionId = deepSessionId;
		this.userId = userId;
		this.testCode = testCode;
		this.scoreTotal = scoreTotal;
		this.scorePositive = scorePositive;
		this.scoreNegative = scoreNegative;
		this.scoreBalance = scoreBalance;
		this.weekStartDate = weekStartDate;
		this.raw = raw;
		this.createdAt = createdAt;
	}

	public static DeepPsychAssessment createWho5(
		Long deepSessionId,
		Long userId,
		List<Integer> answers,
		LocalDate weekStartDate,
		ObjectMapper objectMapper
	) {
		int total = answers.stream().mapToInt(Integer::intValue).sum();
		OffsetDateTime now = OffsetDateTime.now();

		Map<String, Object> rawMap = new HashMap<>();
		rawMap.put("answers", answers);
		rawMap.put("scale", "WHO5");

		String rawJson;
		try {
			rawJson = objectMapper.writeValueAsString(rawMap);
		} catch (JsonProcessingException e) {
			throw new IllegalArgumentException("WHO-5 raw 데이터 직렬화에 실패했습니다.");
		}

		return DeepPsychAssessment.builder()
			.deepSessionId(deepSessionId)
			.userId(userId)
			.testCode(PsychTestCode.WHO5)
			.scoreTotal(total)
			.weekStartDate(weekStartDate)
			.raw(rawJson)
			.createdAt(now)
			.build();
	}


}
