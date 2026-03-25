package com.woojudraw.domain.daily.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.woojudraw.domain.daily.api.dto.req.CreateDailyReq;
import com.woojudraw.domain.daily.api.dto.req.DailyAiAnalyzeReq;
import com.woojudraw.domain.daily.api.dto.resp.CreateDailyResp;
import com.woojudraw.domain.daily.api.dto.resp.DailyAiAnalyzeDataResp;
import com.woojudraw.domain.daily.api.dto.resp.DailyAiAnalyzeResp;
import com.woojudraw.domain.daily.api.dto.resp.DailyDetailResp;
import com.woojudraw.domain.daily.api.dto.resp.DailyListItemResp;
import com.woojudraw.domain.daily.application.impl.DailyAiResultConsumer;
import com.woojudraw.domain.daily.entity.DailyAnalysisStatus;
import com.woojudraw.domain.daily.entity.DailyType;
import com.woojudraw.domain.constellation.entity.Star;
import com.woojudraw.domain.constellation.entity.StarKind;
import com.woojudraw.domain.constellation.repository.StarRepository;
import com.woojudraw.domain.image.entity.Image;
import com.woojudraw.domain.image.entity.ImageStatus;
import com.woojudraw.domain.image.repository.ImageRepository;
import com.woojudraw.domain.user.entity.User;
import com.woojudraw.domain.user.repository.UserRepository;
import com.woojudraw.global.exception.BusinessException;
import com.woojudraw.global.exception.ResponseCode;
import com.woojudraw.global.time.AppTime;

@SpringBootTest
@ActiveProfiles("test")
class DailyFlowIntegrationTest {

	@Autowired
	private DailyService dailyService;

	@Autowired
	private DailyAiResultConsumer dailyAiResultConsumer;

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private ImageRepository imageRepository;

	@Autowired
	private ObjectMapper objectMapper;

	@Autowired
	private StarRepository starRepository;

	@MockBean
	private DailyAiService dailyAiService;

	@AfterEach
	void resetClock() {
		AppTime.resetClock();
	}

	@Test
	void dailyFlow_shouldCompleteFromAnalyzingToDone_whenAiResultIsConsumed() {
		User user = userRepository.save(
			User.builder()
				.email("daily-" + UUID.randomUUID().toString().substring(0, 8) + "@test.com")
				.password("encoded-password")
				.nickname("dailyTester")
				.build()
		);
		Long userId = user.getId();
		Long drawingImageId = createReadyImage(user, "image/png", 12_000L, 800, 800);

		CreateDailyReq createReq = asDto(
			Map.of(
				"dailyType", "MANDALA",
				"content", "today drawing",
				"emotion", "JOY",
				"drawingImageId", drawingImageId
			),
			CreateDailyReq.class
		);

		CreateDailyResp createResp = dailyService.createDaily(userId, createReq);
		Long dailyId = createResp.getDailyId();
		assertThat(dailyId).isNotNull();
		assertThat(createResp.getAnalysisStatus()).isEqualTo(DailyAnalysisStatus.ANALYZING);

		ArgumentCaptor<DailyAiAnalyzeReq> requestCaptor = ArgumentCaptor.forClass(DailyAiAnalyzeReq.class);
		verify(dailyAiService, times(1)).requestDailyAnalysis(requestCaptor.capture());
		assertThat(requestCaptor.getValue().getDailyId()).isEqualTo(dailyId);
		assertThat(requestCaptor.getValue().getDailyType()).isEqualTo(DailyType.MANDALA);
		assertThat(requestCaptor.getValue().getS3ObjectKey()).startsWith("photos/users/" + userId + "/");
		assertThat(requestCaptor.getValue().getEmotion()).isEqualTo("기쁨");
		assertThat(requestCaptor.getValue().getEmotionColor()).isEqualTo("#FFD54F");
		assertThat(requestCaptor.getValue().getContent()).isEqualTo("today drawing");

		DailyDetailResp analyzingResp = dailyService.getDaily(userId, dailyId);
		assertThat(analyzingResp.getDailyType()).isEqualTo(DailyType.MANDALA);
		assertThat(analyzingResp.getAnalysisStatus()).isEqualTo(DailyAnalysisStatus.ANALYZING);
		assertThat(analyzingResp.getAnalysisResult()).isNull();
		assertThat(analyzingResp.getDrawingImageUrl()).contains("X-Amz-");

		dailyAiResultConsumer.consumeDailyAiResult(
			DailyAiAnalyzeResp.builder()
				.dailyId(dailyId)
				.status("SUCCESS")
				.message("ok")
				.data(
					DailyAiAnalyzeDataResp.builder()
						.resultSummary("daily summary")
						.raw(Map.of("mood", "warm", "confidence", 82))
						.build()
				)
				.build(),
			"daily-flow-test-trace"
		);

		DailyDetailResp doneResp = dailyService.getDaily(userId, dailyId);
		assertThat(doneResp.getAnalysisStatus()).isEqualTo(DailyAnalysisStatus.DONE);
		assertThat(doneResp.getAnalysisResult()).isEqualTo("daily summary");
		assertThat(doneResp.getAnalysisRaw()).contains("\"mood\":\"warm\"");

		List<DailyListItemResp> listResp = dailyService.getDailies(userId, null, null, null);
		assertThat(listResp).hasSize(1);
		assertThat(listResp.get(0).getDailyId()).isEqualTo(dailyId);
		assertThat(listResp.get(0).getDailyType()).isEqualTo(DailyType.MANDALA);
		assertThat(listResp.get(0).getAnalysisStatus()).isEqualTo(DailyAnalysisStatus.DONE);
		assertThat(listResp.get(0).getResultSummary()).isEqualTo("daily summary");

		List<Star> stars = starRepository.findAllByUserIdWithConstellation(userId);
		assertThat(stars).hasSize(1);
		assertThat(stars.get(0).getKind()).isEqualTo(StarKind.DAILY);
		assertThat(stars.get(0).getDailyEntryId()).isEqualTo(dailyId);
		assertThat(stars.get(0).getColor()).isEqualTo("#FFD54F");
		assertThat(stars.get(0).getConstellation().getWeekStartDate())
			.isEqualTo(AppTime.todayKst().with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.SUNDAY)));
	}

	@Test
	void createDaily_allowsMissingJournalContent() {
		User user = userRepository.save(
			User.builder()
				.email("daily-optional-" + UUID.randomUUID().toString().substring(0, 8) + "@test.com")
				.password("encoded-password")
				.nickname("dailyOptionalTester")
				.build()
		);
		Long userId = user.getId();
		Long drawingImageId = createReadyImage(user, "image/png", 12_000L, 800, 800);

		Map<String, Object> source = new HashMap<>();
		source.put("dailyType", "FREE");
		source.put("content", null);
		source.put("emotion", "CALM");
		source.put("drawingImageId", drawingImageId);

		CreateDailyReq createReq = asDto(source, CreateDailyReq.class);

		CreateDailyResp createResp = dailyService.createDaily(userId, createReq);

		ArgumentCaptor<DailyAiAnalyzeReq> requestCaptor = ArgumentCaptor.forClass(DailyAiAnalyzeReq.class);
		verify(dailyAiService, times(1)).requestDailyAnalysis(requestCaptor.capture());

		DailyDetailResp dailyResp = dailyService.getDaily(userId, createResp.getDailyId());

		assertThat(requestCaptor.getValue().getEmotion()).isEqualTo("평온");
		assertThat(requestCaptor.getValue().getEmotionColor()).isEqualTo("#4FC3F7");
		assertThat(requestCaptor.getValue().getContent()).isNull();
		assertThat(dailyResp.getContent()).isNull();
		assertThat(dailyResp.getEmotion()).isEqualTo("평온");
		assertThat(dailyResp.getEmotionColor()).isEqualTo("#4FC3F7");
	}

	@Test
	void deleteDaily_removesStarAndHidesDeletedEntry() {
		User user = userRepository.save(
			User.builder()
				.email("daily-delete-" + UUID.randomUUID().toString().substring(0, 8) + "@test.com")
				.password("encoded-password")
				.nickname("dailyDeleteTester")
				.build()
		);
		Long userId = user.getId();
		Long drawingImageId = createReadyImage(user, "image/png", 12_000L, 800, 800);

		CreateDailyReq createReq = asDto(
			Map.of(
				"dailyType", "FREE",
				"content", "delete me",
				"emotion", "JOY",
				"drawingImageId", drawingImageId
			),
			CreateDailyReq.class
		);

		Long dailyId = dailyService.createDaily(userId, createReq).getDailyId();

		dailyAiResultConsumer.consumeDailyAiResult(
			DailyAiAnalyzeResp.builder()
				.dailyId(dailyId)
				.status("SUCCESS")
				.message("ok")
				.data(
					DailyAiAnalyzeDataResp.builder()
						.resultSummary("daily summary")
						.raw(Map.of("mood", "warm"))
						.build()
				)
				.build(),
			"daily-delete-test-trace"
		);

		assertThat(starRepository.findAllByUserIdWithConstellation(userId)).hasSize(1);

		dailyService.deleteDaily(userId, dailyId);

		assertThat(dailyService.getDailies(userId, null, null, null)).isEmpty();
		assertThat(starRepository.findAllByUserIdWithConstellation(userId)).isEmpty();
		assertThatThrownBy(() -> dailyService.getDaily(userId, dailyId))
			.isInstanceOf(BusinessException.class)
			.extracting("responseCode")
			.isEqualTo(ResponseCode.DAILY_NOT_FOUND);
	}

	@Test
	void createDaily_usesServerKstDateAndRejectsSecondEntryOnSameDay() {
		AppTime.overrideClock(fixedClockAtKst(LocalDate.of(2026, 3, 20), 10, 15));

		User user = userRepository.save(
			User.builder()
				.email("daily-kst-same-day-" + UUID.randomUUID().toString().substring(0, 8) + "@test.com")
				.password("encoded-password")
				.nickname("dailyKstSameDayTester")
				.build()
		);
		Long userId = user.getId();
		Long firstDrawingImageId = createReadyImage(user, "image/png", 12_000L, 800, 800);

		CreateDailyReq createReq = asDto(
			Map.of(
				"dailyType", "FREE",
				"entryDate", LocalDate.of(1999, 1, 1),
				"content", "server date wins",
				"emotion", "JOY",
				"drawingImageId", firstDrawingImageId
			),
			CreateDailyReq.class
		);

		Long dailyId = dailyService.createDaily(userId, createReq).getDailyId();
		DailyDetailResp dailyResp = dailyService.getDaily(userId, dailyId);
		assertThat(dailyResp.getEntryDate()).isEqualTo(LocalDate.of(2026, 3, 20));

		Long secondDrawingImageId = createReadyImage(user, "image/png", 12_000L, 800, 800);
		CreateDailyReq duplicateReq = asDto(
			Map.of(
				"dailyType", "MANDALA",
				"entryDate", LocalDate.of(2030, 12, 31),
				"content", "duplicate",
				"emotion", "CALM",
				"drawingImageId", secondDrawingImageId
			),
			CreateDailyReq.class
		);

		assertThatThrownBy(() -> dailyService.createDaily(userId, duplicateReq))
			.isInstanceOf(BusinessException.class)
			.extracting("responseCode")
			.isEqualTo(ResponseCode.DAILY_ALREADY_EXISTS);
	}

	@Test
	void createDaily_allowsNewEntryAfterKstMidnight() {
		User user = userRepository.save(
			User.builder()
				.email("daily-kst-midnight-" + UUID.randomUUID().toString().substring(0, 8) + "@test.com")
				.password("encoded-password")
				.nickname("dailyKstMidnightTester")
				.build()
		);
		Long userId = user.getId();

		AppTime.overrideClock(fixedClockAtKst(LocalDate.of(2026, 3, 20), 23, 59));
		Long firstDrawingImageId = createReadyImage(user, "image/png", 12_000L, 800, 800);
		Long firstDailyId = dailyService.createDaily(
			userId,
			asDto(
				Map.of(
					"dailyType", "FREE",
					"content", "before midnight",
					"emotion", "JOY",
					"drawingImageId", firstDrawingImageId
				),
				CreateDailyReq.class
			)
		).getDailyId();

		AppTime.overrideClock(fixedClockAtKst(LocalDate.of(2026, 3, 21), 0, 1));
		Long secondDrawingImageId = createReadyImage(user, "image/png", 12_000L, 800, 800);
		Long secondDailyId = dailyService.createDaily(
			userId,
			asDto(
				Map.of(
					"dailyType", "MANDALA",
					"content", "after midnight",
					"emotion", "CALM",
					"drawingImageId", secondDrawingImageId
				),
				CreateDailyReq.class
			)
		).getDailyId();

		assertThat(dailyService.getDaily(userId, secondDailyId).getEntryDate()).isEqualTo(LocalDate.of(2026, 3, 21));
		assertThat(dailyService.getDailies(userId, null, null, null))
			.extracting(DailyListItemResp::getEntryDate)
			.containsExactly(LocalDate.of(2026, 3, 21), LocalDate.of(2026, 3, 20));
	}

	@Test
	void createDaily_ignoresPreviousUtcDateDuringEarlyMorningKst() {
		User user = userRepository.save(
			User.builder()
				.email("daily-utc-kst-boundary-" + UUID.randomUUID().toString().substring(0, 8) + "@test.com")
				.password("encoded-password")
				.nickname("dailyUtcKstBoundaryTester")
				.build()
		);
		Long userId = user.getId();

		AppTime.overrideClock(fixedClockAtKst(LocalDate.of(2026, 3, 20), 23, 50));
		Long yesterdayImageId = createReadyImage(user, "image/png", 12_000L, 800, 800);
		Long yesterdayDailyId = dailyService.createDaily(
			userId,
			asDto(
				Map.of(
					"dailyType", "FREE",
					"content", "late night entry",
					"emotion", "JOY",
					"drawingImageId", yesterdayImageId
				),
				CreateDailyReq.class
			)
		).getDailyId();

		AppTime.overrideClock(fixedClockAtKst(LocalDate.of(2026, 3, 21), 8, 30));
		Long earlyMorningImageId = createReadyImage(user, "image/png", 12_000L, 800, 800);
		Long earlyMorningDailyId = dailyService.createDaily(
			userId,
			asDto(
				Map.of(
					"dailyType", "MANDALA",
					"entryDate", LocalDate.of(2026, 3, 20),
					"content", "early morning entry",
					"emotion", "CALM",
					"drawingImageId", earlyMorningImageId
				),
				CreateDailyReq.class
			)
		).getDailyId();

		assertThat(yesterdayDailyId).isNotEqualTo(earlyMorningDailyId);
		assertThat(dailyService.getDaily(userId, earlyMorningDailyId).getEntryDate()).isEqualTo(LocalDate.of(2026, 3, 21));
		assertThat(dailyService.getDailies(userId, null, null, null))
			.extracting(DailyListItemResp::getEntryDate)
			.containsExactly(LocalDate.of(2026, 3, 21), LocalDate.of(2026, 3, 20));
	}

	private Long createReadyImage(User user, String mimeType, Long byteSize, Integer width, Integer height) {
		Image image = Image.builder()
			.user(user)
			.imageKey("photos/users/" + user.getId() + "/" + UUID.randomUUID() + ".png")
			.mimeType(mimeType)
			.byteSize(byteSize)
			.width(width)
			.height(height)
			.status(ImageStatus.READY)
			.build();

		return imageRepository.save(image).getId();
	}

	private <T> T asDto(Map<String, Object> source, Class<T> dtoType) {
		return objectMapper.convertValue(source, dtoType);
	}

	private Clock fixedClockAtKst(LocalDate date, int hour, int minute) {
		return Clock.fixed(
			ZonedDateTime.of(date, LocalTime.of(hour, minute), AppTime.KST_ZONE_ID).toInstant(),
			AppTime.KST_ZONE_ID
		);
	}
}
