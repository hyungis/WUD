DO $$
DECLARE
  v_user_id BIGINT;
  v_start_date DATE := (CURRENT_DATE - INTERVAL '999 days')::date;
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
  v_batch TEXT := 'mock1000_' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISS');
  v_created_at_tz TIMESTAMPTZ;
  v_created_at TIMESTAMP;
BEGIN
  SELECT id INTO v_user_id
  FROM users
  ORDER BY last_login_at DESC NULLS LAST, id DESC
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No target user found';
  END IF;

  FOR v_i IN 0..999 LOOP
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
      INSERT INTO deep_sessions (user_id, deep_type, status, created_at, updated_at, submitted_at, completed_at)
      VALUES (v_user_id, 'HTP', 'DONE', v_created_at_tz, v_created_at_tz + interval '30 minutes', v_created_at_tz + interval '10 minutes', v_created_at_tz + interval '30 minutes')
      RETURNING id INTO v_deep_session_id;

      INSERT INTO deep_results (deep_session_id, result, raw, created_at)
      VALUES (
        v_deep_session_id,
        'Mock deep report (' || v_batch || ') #' || (v_i + 1),
        '{"batch":"' || v_batch || '","type":"deep"}',
        v_created_at + interval '30 minutes'
      );

      INSERT INTO deep_psych_assessments (deep_session_id, user_id, test_code, score_total, score_positive, score_negative, score_balance, week_start_date, created_at)
      VALUES (
        v_deep_session_id,
        v_user_id,
        'WHO5',
        12 + (v_i % 13),
        2 + (v_i % 4),
        1 + (v_i % 3),
        2 + (v_i % 4),
        v_week_start,
        v_created_at_tz + interval '5 minutes'
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

      INSERT INTO stars (user_id, constellation_id, kind, daily_entry_id, deep_session_id, created_at, updated_at, star_color, size, shape_type)
      VALUES (
        v_user_id,
        v_constellation_id,
        'DEEP',
        NULL,
        v_deep_session_id,
        v_created_at,
        v_created_at + interval '30 minutes',
        CASE (v_i % 5)
          WHEN 0 THEN '#A78BFA'
          WHEN 1 THEN '#60A5FA'
          WHEN 2 THEN '#34D399'
          WHEN 3 THEN '#F472B6'
          ELSE '#F59E0B'
        END,
        1.2,
        'STAR'
      );

    ELSE
      INSERT INTO images (user_id, image_key, mime_type, byte_size, width, height, status, created_at)
      VALUES (v_user_id, 'mock/' || v_batch || '/daily/' || (v_i + 1) || '.png', 'image/png', 64000, 800, 600, 'READY', v_created_at_tz)
      RETURNING id INTO v_daily_image_id;

      INSERT INTO daily_entries (users_id, content, daily_type, emotion_color, emotion_value, entry_date, drawing_image_id, analysis_status, created_at, updated_at)
      VALUES (
        v_user_id,
        'Mock daily content (' || v_batch || ') #' || (v_i + 1),
        'TEXT',
        CASE (v_i % 8)
          WHEN 0 THEN '#FF6B6B'
          WHEN 1 THEN '#4ECDC4'
          WHEN 2 THEN '#FFE66D'
          WHEN 3 THEN '#A8E6CF'
          WHEN 4 THEN '#6C5CE7'
          WHEN 5 THEN '#FD79A8'
          WHEN 6 THEN '#74B9FF'
          ELSE '#FFEAA7'
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
        'Mock daily analysis result (' || v_batch || ') #' || (v_i + 1),
        '{"batch":"' || v_batch || '","type":"daily"}',
        v_created_at_tz + interval '2 minutes'
      );

      INSERT INTO stars (user_id, constellation_id, kind, daily_entry_id, deep_session_id, created_at, updated_at, star_color, size, shape_type)
      VALUES (
        v_user_id,
        v_constellation_id,
        'DAILY',
        v_daily_entry_id,
        NULL,
        v_created_at,
        v_created_at,
        CASE (v_i % 6)
          WHEN 0 THEN '#F97316'
          WHEN 1 THEN '#22D3EE'
          WHEN 2 THEN '#A3E635'
          WHEN 3 THEN '#F43F5E'
          WHEN 4 THEN '#38BDF8'
          ELSE '#FB7185'
        END,
        0.8,
        'PLANET'
      );
    END IF;
  END LOOP;

  RAISE NOTICE 'Inserted 1000 mock timeline items for user_id=% batch=%', v_user_id, v_batch;
END $$;

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
