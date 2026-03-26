-- ============================================================
-- 시연용: 최근 로그인 유저에게 별 ~300개 생성
-- DAILY ~257 + DEEP ~43 = ~300 stars (300일치)
-- 실행 전 회원가입 후 로그인 한 번 해주세요
-- ============================================================

DO $$
DECLARE
  v_user_id BIGINT;
  v_start_date DATE := (CURRENT_DATE - INTERVAL '299 days')::date;
  v_i INT;
  v_day DATE;
  v_week_start DATE;
  v_constellation_id BIGINT;
  v_daily_image_id BIGINT;
  v_daily_entry_id BIGINT;
  v_deep_session_id BIGINT;
  v_deep_img_house BIGINT;
  v_deep_img_tree BIGINT;
  v_deep_img_person BIGINT;
  v_batch TEXT := 'demo300_' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISS');
  v_created_at_tz TIMESTAMPTZ;
  v_created_at TIMESTAMP;
BEGIN
  SELECT id INTO v_user_id
  WHERE id= ;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No target user found';
  END IF;

  FOR v_i IN 0..299 LOOP
    v_day := v_start_date + v_i;
    v_week_start := date_trunc('week', v_day::timestamp)::date;
    v_created_at_tz := (v_day::timestamp + time '10:00')::timestamptz;
    v_created_at := v_created_at_tz::timestamp;

    INSERT INTO constellations (user_id, week_start_date, week_end_date)
    VALUES (v_user_id, v_week_start, v_week_start + 6)
    ON CONFLICT (user_id, week_start_date) DO NOTHING;

    SELECT id INTO v_constellation_id
    FROM constellations
    WHERE user_id = v_user_id AND week_start_date = v_week_start;

    IF (v_i % 7 = 0) THEN
      -- DEEP star (1 per week)
      INSERT INTO deep_sessions (user_id, deep_type, status, created_at, updated_at, submitted_at, completed_at)
      VALUES (v_user_id, 'HTP', 'DONE', v_created_at_tz, v_created_at_tz + interval '30 minutes', v_created_at_tz + interval '10 minutes', v_created_at_tz + interval '30 minutes')
      RETURNING id INTO v_deep_session_id;

      INSERT INTO deep_results (deep_session_id, result, raw, created_at)
      VALUES (
        v_deep_session_id,
        CASE (v_i % 6)
          WHEN 0 THEN '집 그림에서 안정감과 가정에 대한 따뜻한 감정이 느껴집니다. 전반적으로 정서적으로 안정된 상태입니다.'
          WHEN 1 THEN '그림 전반에서 창의성과 표현력이 돋보입니다. 현재 긍정적인 심리 상태를 유지하고 계십니다.'
          WHEN 2 THEN '약간의 불안 요소가 감지되지만 일시적인 것으로 보입니다. 정서적 기반이 탄탄합니다.'
          WHEN 3 THEN '자기 표현에 대한 욕구가 강하게 나타납니다. 자기 성장에 대한 의지가 엿보입니다.'
          WHEN 4 THEN '내면의 평화와 조화가 그림 전체에서 느껴집니다. 대인관계도 원만한 상태입니다.'
          ELSE '성취 욕구와 목표 의식이 뚜렷하게 드러납니다. 전반적으로 건강한 심리 상태입니다.'
        END,
        '{"batch":"' || v_batch || '","type":"deep"}',
        v_created_at + interval '30 minutes'
      );

      INSERT INTO deep_psych_assessments (deep_session_id, user_id, test_code, score_total, score_positive, score_negative, score_balance, week_start_date, created_at)
      VALUES (
        v_deep_session_id, v_user_id, 'WHO5',
        12 + (v_i % 13), 2 + (v_i % 4), 1 + (v_i % 3), 2 + (v_i % 4),
        v_week_start, v_created_at_tz + interval '5 minutes'
      );

      INSERT INTO images (user_id, image_key, mime_type, byte_size, width, height, status, created_at)
      VALUES (v_user_id, 'mock/' || v_batch || '/deep/' || (v_i + 1) || '_house.png', 'image/png', 95000, 1024, 768, 'READY', v_created_at_tz)
      RETURNING id INTO v_deep_img_house;

      INSERT INTO images (user_id, image_key, mime_type, byte_size, width, height, status, created_at)
      VALUES (v_user_id, 'mock/' || v_batch || '/deep/' || (v_i + 1) || '_tree.png', 'image/png', 93000, 1024, 768, 'READY', v_created_at_tz)
      RETURNING id INTO v_deep_img_tree;

      INSERT INTO images (user_id, image_key, mime_type, byte_size, width, height, status, created_at)
      VALUES (v_user_id, 'mock/' || v_batch || '/deep/' || (v_i + 1) || '_person.png', 'image/png', 91000, 1024, 768, 'READY', v_created_at_tz)
      RETURNING id INTO v_deep_img_person;

      INSERT INTO deep_submissions (deep_session_id, image_id, type, created_at)
      VALUES
        (v_deep_session_id, v_deep_img_house, 'HOUSE', v_created_at_tz + interval '11 minutes'),
        (v_deep_session_id, v_deep_img_tree, 'TREE', v_created_at_tz + interval '12 minutes'),
        (v_deep_session_id, v_deep_img_person, 'PERSON', v_created_at_tz + interval '13 minutes');

      INSERT INTO stars (user_id, constellation_id, kind, daily_entry_id, deep_session_id, color, created_at, updated_at)
      VALUES (
        v_user_id, v_constellation_id, 'DEEP', NULL, v_deep_session_id,
        NULL,
        v_created_at, v_created_at + interval '30 minutes'
      );

    ELSE
      -- DAILY star (skip if entry_date already exists for this user)
      IF NOT EXISTS (SELECT 1 FROM daily_entries WHERE users_id = v_user_id AND entry_date = v_day) THEN
        INSERT INTO images (user_id, image_key, mime_type, byte_size, width, height, status, created_at)
        VALUES (v_user_id, 'mock/' || v_batch || '/daily/' || (v_i + 1) || '.png', 'image/png', 64000, 800, 600, 'READY', v_created_at_tz)
        RETURNING id INTO v_daily_image_id;

        INSERT INTO daily_entries (users_id, content, daily_type, emotion_color, emotion_value, entry_date, drawing_image_id, analysis_status, created_at, updated_at)
        VALUES (
          v_user_id,
          CASE (v_i % 7)
            WHEN 1 THEN '오늘은 날씨가 좋아서 기분이 좋았다. 산책을 하며 마음이 편안해졌다.'
            WHEN 2 THEN '업무가 많아서 피곤했지만 동료와 이야기하면서 힘을 얻었다.'
            WHEN 3 THEN '새로운 프로젝트를 시작했다. 설레면서도 약간 긴장된다.'
            WHEN 4 THEN '오랜만에 친구를 만나서 즐거운 시간을 보냈다.'
            WHEN 5 THEN '오늘은 조금 우울했다. 혼자 음악을 들으며 시간을 보냈다.'
            WHEN 6 THEN '운동을 했더니 몸이 개운하고 머리가 맑아진 느낌이다.'
            ELSE '평범한 하루였지만 감사한 일들이 많았다.'
          END,
          CASE (v_i % 3) WHEN 0 THEN 'MANDALA' WHEN 1 THEN 'COLORING' ELSE 'FREE' END,
          CASE (v_i % 8)
            WHEN 0 THEN '#FFD54F' WHEN 1 THEN '#4FC3F7' WHEN 2 THEN '#FF6FAE'
            WHEN 3 THEN '#66BB6A' WHEN 4 THEN '#5C6BC0' WHEN 5 THEN '#9575CD'
            WHEN 6 THEN '#EF5350' ELSE '#90A4AE'
          END,
          1 + (v_i % 5),
          v_day,
          v_daily_image_id,
          'DONE',
          v_created_at_tz,
          v_created_at_tz
        )
        RETURNING id INTO v_daily_entry_id;

        INSERT INTO daily_results (daily_entries_id, result, raw, created_at)
        VALUES (
          v_daily_entry_id,
          CASE (v_i % 5)
            WHEN 0 THEN '오늘의 감정은 평온함이 주를 이루고 있습니다. 작은 행복을 발견하는 능력이 뛰어나십니다.'
            WHEN 1 THEN '약간의 스트레스가 감지되지만 대처 능력이 좋습니다. 동료와의 교류가 큰 힘이 되고 있네요.'
            WHEN 2 THEN '새로운 도전에 대한 설렘과 긴장이 공존합니다. 매우 건강한 감정 반응입니다.'
            WHEN 3 THEN '사회적 교류에서 큰 에너지를 얻는 타입이시네요. 정서적 안정에 도움이 됩니다.'
            ELSE '자기 돌봄에 대한 의식이 높으십니다. 정신 건강에 긍정적 영향을 미치고 있습니다.'
          END,
          '{"batch":"' || v_batch || '","type":"daily"}',
          v_created_at_tz + interval '2 minutes'
        );

        INSERT INTO stars (user_id, constellation_id, kind, daily_entry_id, deep_session_id, color, created_at, updated_at)
        VALUES (
          v_user_id, v_constellation_id, 'DAILY', v_daily_entry_id, NULL,
          CASE (v_i % 8)
            WHEN 0 THEN '#FFD54F' WHEN 1 THEN '#4FC3F7' WHEN 2 THEN '#FF6FAE'
            WHEN 3 THEN '#66BB6A' WHEN 4 THEN '#5C6BC0' WHEN 5 THEN '#9575CD'
            WHEN 6 THEN '#EF5350' ELSE '#90A4AE'
          END,
          v_created_at, v_created_at
        );
      END IF;
    END IF;
  END LOOP;

  RAISE NOTICE 'Inserted ~300 mock stars for user_id=% batch=%', v_user_id, v_batch;
END $$;

-- 결과 확인
WITH target_user AS (
  SELECT id, email
  FROM users
  ORDER BY last_login_at DESC NULLS LAST, id DESC
  LIMIT 1
)
SELECT
  tu.id AS user_id,
  tu.email,
  COUNT(*) FILTER (WHERE s.kind = 'DAILY') AS daily_star_count,
  COUNT(*) FILTER (WHERE s.kind = 'DEEP') AS deep_star_count,
  COUNT(*) AS total_star_count
FROM stars s
JOIN target_user tu ON tu.id = s.user_id
GROUP BY tu.id, tu.email;
