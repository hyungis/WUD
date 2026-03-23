package com.woojudraw.domain.deep.entity;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
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

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "deep_session_id", nullable = false)
	private DeepSession deepSession;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

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

	@Column(name = "is_skipped")
	private Boolean isSkipped;

	@Column(name = "created_at", nullable = false)
	private OffsetDateTime createdAt;

	@Builder
	private DeepPsychAssessment(
		DeepSession deepSession,
		User user,
		PsychTestCode testCode,
		Integer scoreTotal,
		Short scorePositive,
		Short scoreNegative,
		Short scoreBalance,
		LocalDate weekStartDate,
		String raw,
		Boolean isSkipped,
		OffsetDateTime createdAt
	) {
		this.deepSession = deepSession;
		this.user = user;
		this.testCode = testCode;
		this.scoreTotal = scoreTotal;
		this.scorePositive = scorePositive;
		this.scoreNegative = scoreNegative;
		this.scoreBalance = scoreBalance;
		this.weekStartDate = weekStartDate;
		this.raw = raw;
		this.isSkipped = isSkipped;
		this.createdAt = createdAt;
	}

	public static DeepPsychAssessment createWho5(
		DeepSession deepSession,
		User user,
		List<Integer> answers,
		Boolean isSkipped,
		LocalDate weekStartDate,
		ObjectMapper objectMapper
	) {
		int total = answers.stream().mapToInt(Integer::intValue).sum();
		OffsetDateTime now = AppTime.nowKst();

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
			.deepSession(deepSession)
			.user(user)
			.testCode(PsychTestCode.WHO5)
			.scoreTotal(total)
			.weekStartDate(weekStartDate)
			.raw(rawJson)
			.isSkipped(isSkipped)
			.createdAt(now)
			.build();
	}

	public static DeepPsychAssessment createSpane(
		DeepSession deepSession,
		User user,
		List<Integer> answers,
		Boolean isSkipped,
		LocalDate weekStartDate,
		ObjectMapper objectMapper
	) {
		// 프런트엔드 문항 순서(P/N 섞임)에 따른 정확한 인덱스별 합산
		// P: 긍정적인(0), 좋은(2), 즐거운(4), 행복한(6), 기쁜(9), 만족스러운(11)
		// N: 부정적인(1), 나쁜(3), 불쾌한(5), 슬픈(7), 두려운(8), 화난(10)
		short positive = (short) (answers.get(0) + answers.get(2) + answers.get(4) + 
								  answers.get(6) + answers.get(9) + answers.get(11));
		short negative = (short) (answers.get(1) + answers.get(3) + answers.get(5) + 
								  answers.get(7) + answers.get(8) + answers.get(10));
		short balance = (short)(positive - negative); // SPANE-B 계산

		OffsetDateTime now = AppTime.nowKst();

		Map<String, Object> rawMap = new HashMap<>();
		rawMap.put("answers", answers);
		rawMap.put("scale", "SPANE");

		String rawJson;
		try {
			rawJson = objectMapper.writeValueAsString(rawMap);
		} catch (JsonProcessingException e) {
			throw new IllegalArgumentException("SPANE raw 데이터 직렬화에 실패했습니다.");
		}

		return DeepPsychAssessment.builder()
			.deepSession(deepSession)
			.user(user)
			.testCode(PsychTestCode.SPANE)
			.scorePositive(positive)
			.scoreNegative(negative)
			.scoreBalance(balance)
			.weekStartDate(weekStartDate)
			.raw(rawJson)
			.isSkipped(isSkipped)
			.createdAt(now)
			.build();
	}

	public Long getDeepSessionId() {
		return deepSession == null ? null : deepSession.getId();
	}

	public Long getUserId() {
		return user == null ? null : user.getId();
	}

	void attachTo(DeepSession deepSession) {
		this.deepSession = deepSession;
	}
}
