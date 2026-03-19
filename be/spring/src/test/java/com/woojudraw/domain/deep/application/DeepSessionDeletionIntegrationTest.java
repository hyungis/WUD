package com.woojudraw.domain.deep.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.support.TransactionTemplate;

import com.woojudraw.domain.constellation.entity.Constellation;
import com.woojudraw.domain.constellation.entity.Star;
import com.woojudraw.domain.constellation.repository.ConstellationRepository;
import com.woojudraw.domain.constellation.repository.StarRepository;
import com.woojudraw.domain.deep.api.dto.req.CreateDeepSessionReq;
import com.woojudraw.domain.deep.entity.DeepSession;
import com.woojudraw.domain.deep.repository.DeepSessionRepository;
import com.woojudraw.domain.user.entity.User;
import com.woojudraw.domain.user.repository.UserRepository;
import com.woojudraw.global.time.AppTime;

@SpringBootTest
@ActiveProfiles("test")
class DeepSessionDeletionIntegrationTest {

	@Autowired
	private DeepSessionService deepSessionService;

	@Autowired
	private DeepSessionRepository deepSessionRepository;

	@Autowired
	private StarRepository starRepository;

	@Autowired
	private ConstellationRepository constellationRepository;

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private TransactionTemplate transactionTemplate;

	@Test
	void deleteDeepSession_removesPersistedStarAndConstellation() {
		Long userId = tx(() -> userRepository.save(
			User.builder()
				.email("deep-delete-" + UUID.randomUUID().toString().substring(0, 8) + "@test.com")
				.password("encoded-password")
				.nickname("deepDeleteTester")
				.build()
		).getId());

		Long sessionId = tx(() ->
			deepSessionService.createDeepSession(userId, new CreateDeepSessionReq()).getSessionId()
		);

		Long starId = tx(() -> {
			User user = userRepository.findById(userId).orElseThrow();
			DeepSession deepSession = deepSessionRepository.findById(sessionId).orElseThrow();
			LocalDate weekStartDate = AppTime.todayKst()
				.with(TemporalAdjusters.previousOrSame(DayOfWeek.SUNDAY));

			Constellation constellation = constellationRepository.save(
				Constellation.builder()
					.user(user)
					.weekStartDate(weekStartDate)
					.weekEndDate(weekStartDate.plusDays(6))
					.build()
			);

			Star star = Star.createDeepStar(user, constellation, deepSession, AppTime.nowKst());
			constellation.addStar(star);

			return starRepository.saveAndFlush(star).getId();
		});

		tx(() -> {
			assertThat(starRepository.existsById(starId)).isTrue();
			assertThat(starRepository.existsByDeepSession_Id(sessionId)).isTrue();
			assertThat(constellationRepository.findAllByUser_IdOrderByWeekStartDateAsc(userId)).hasSize(1);
			return null;
		});

		tx(() -> {
			deepSessionService.deleteDeepSession(userId, sessionId);
			return null;
		});

		tx(() -> {
			assertThat(deepSessionRepository.findById(sessionId)).isEmpty();
			assertThat(starRepository.existsById(starId)).isFalse();
			assertThat(starRepository.existsByDeepSession_Id(sessionId)).isFalse();
			assertThat(constellationRepository.findAllByUser_IdOrderByWeekStartDateAsc(userId)).isEmpty();
			return null;
		});
	}

	private <T> T tx(java.util.function.Supplier<T> supplier) {
		return transactionTemplate.execute(status -> supplier.get());
	}
}
