package com.woojudraw.domain.daily.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

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
import com.woojudraw.domain.image.entity.Image;
import com.woojudraw.domain.image.entity.ImageStatus;
import com.woojudraw.domain.image.repository.ImageRepository;
import com.woojudraw.domain.user.entity.User;
import com.woojudraw.domain.user.repository.UserRepository;

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

	@MockBean
	private DailyAiService dailyAiService;

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
				"dailyType", "FREE",
				"entryDate", LocalDate.now(),
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
		assertThat(requestCaptor.getValue().getS3ObjectKey()).startsWith("photos/users/" + userId + "/");

		DailyDetailResp analyzingResp = dailyService.getDaily(userId, dailyId);
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

		List<DailyListItemResp> listResp = dailyService.getDailies(userId, null, null);
		assertThat(listResp).hasSize(1);
		assertThat(listResp.get(0).getDailyId()).isEqualTo(dailyId);
		assertThat(listResp.get(0).getAnalysisStatus()).isEqualTo(DailyAnalysisStatus.DONE);
		assertThat(listResp.get(0).getResultSummary()).isEqualTo("daily summary");
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
}
