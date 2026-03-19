package com.woojudraw.domain.deep.application.impl;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.woojudraw.domain.constellation.application.ConstellationService;
import com.woojudraw.domain.deep.application.DeepAiService;
import com.woojudraw.domain.deep.entity.DeepPsychAssessment;
import com.woojudraw.domain.deep.entity.DeepResult;
import com.woojudraw.domain.deep.entity.DeepSession;
import com.woojudraw.domain.deep.entity.DeepSubmission;
import com.woojudraw.domain.deep.repository.DeepPsychAssessmentRepository;
import com.woojudraw.domain.deep.repository.DeepResultRepository;
import com.woojudraw.domain.deep.repository.DeepSessionRepository;
import com.woojudraw.domain.deep.repository.DeepSubmissionRepository;
import com.woojudraw.domain.image.application.ImageService;
import com.woojudraw.domain.image.repository.ImageRepository;
import com.woojudraw.domain.user.entity.User;
import com.woojudraw.domain.user.repository.UserRepository;
import com.woojudraw.global.exception.BusinessException;
import com.woojudraw.global.exception.ResponseCode;

@ExtendWith(MockitoExtension.class)
class DeepSessionServiceImplTest {

	@Mock
	private DeepSessionRepository deepSessionRepository;

	@Mock
	private DeepPsychAssessmentRepository deepPsychAssessmentRepository;

	@Mock
	private DeepSubmissionRepository deepSubmissionRepository;

	@Mock
	private ImageRepository imageRepository;

	@Mock
	private ImageService imageService;

	@Mock
	private ObjectMapper objectMapper;

	@Mock
	private DeepAiService deepAiService;

	@Mock
	private DeepResultRepository deepResultRepository;

	@Mock
	private UserRepository userRepository;

	@Mock
	private ConstellationService constellationService;

	@InjectMocks
	private DeepSessionServiceImpl deepSessionService;

	@Test
	void deleteDeepSession_deletesAssociatedDataAndSession() {
		Long userId = 1L;
		Long sessionId = 10L;

		User user = User.builder()
			.id(userId)
			.email("deep@test.com")
			.password("encoded-password")
			.nickname("deepTester")
			.build();
		DeepSession deepSession = DeepSession.create(user);
		ReflectionTestUtils.setField(deepSession, "id", sessionId);

		DeepResult deepResult = org.mockito.Mockito.mock(DeepResult.class);
		DeepSubmission submission = org.mockito.Mockito.mock(DeepSubmission.class);
		DeepPsychAssessment psychAssessment = org.mockito.Mockito.mock(DeepPsychAssessment.class);

		when(deepSessionRepository.findById(sessionId)).thenReturn(Optional.of(deepSession));
		when(deepResultRepository.findByDeepSession_Id(sessionId)).thenReturn(Optional.of(deepResult));
		when(deepSubmissionRepository.findAllByDeepSession_IdOrderByIdAsc(sessionId)).thenReturn(List.of(submission));
		when(deepPsychAssessmentRepository.findAllByDeepSession_IdOrderByIdAsc(sessionId))
			.thenReturn(List.of(psychAssessment));

		deepSessionService.deleteDeepSession(userId, sessionId);

		verify(constellationService).deleteDeepStarIfExists(sessionId);
		verify(deepResultRepository).delete(deepResult);
		verify(deepSubmissionRepository).deleteAllInBatch(List.of(submission));
		verify(deepPsychAssessmentRepository).deleteAllInBatch(List.of(psychAssessment));
		verify(deepSessionRepository).delete(deepSession);
	}

	@Test
	void deleteDeepSession_throwsWhenUserDoesNotOwnSession() {
		Long sessionId = 10L;

		User owner = User.builder()
			.id(1L)
			.email("owner@test.com")
			.password("encoded-password")
			.nickname("owner")
			.build();
		DeepSession deepSession = DeepSession.create(owner);
		ReflectionTestUtils.setField(deepSession, "id", sessionId);

		when(deepSessionRepository.findById(sessionId)).thenReturn(Optional.of(deepSession));

		assertThatThrownBy(() -> deepSessionService.deleteDeepSession(2L, sessionId))
			.isInstanceOf(BusinessException.class)
			.extracting("responseCode")
			.isEqualTo(ResponseCode.DEEP_SESSION_ACCESS_DENIED);

		verify(constellationService, never()).deleteDeepStarIfExists(anyLong());
		verify(deepResultRepository, never()).delete(any());
		verify(deepSubmissionRepository, never()).deleteAllInBatch(anyList());
		verify(deepPsychAssessmentRepository, never()).deleteAllInBatch(anyList());
		verify(deepSessionRepository, never()).delete(any());
	}
}
