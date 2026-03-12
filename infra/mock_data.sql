-- ============================================================
-- Mock data for user_id = 21 (testyun@test.com)
-- ~70 DAILY stars + ~30 DEEP stars = ~100 stars total
-- Spanning 15 weeks: 2025-12-01 ~ 2026-03-08
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Create images (placeholder for daily drawings + deep HTP)
-- ============================================================
INSERT INTO images (user_id, image_key, mime_type, byte_size, width, height, status, created_at)
SELECT
    21,
    'mock/daily_drawing_' || gs || '.png',
    'image/png',
    50000 + (gs * 137 % 30000),
    800, 600,
    'READY',
    ('2025-12-01'::timestamptz + (gs * interval '1 day 8 hours'))
FROM generate_series(1, 70) gs;

-- Deep HTP images (house, tree, person per session = 3 images per session)
INSERT INTO images (user_id, image_key, mime_type, byte_size, width, height, status, created_at)
SELECT
    21,
    'mock/deep_htp_' || ((gs-1)/3 + 1) || '_' ||
        CASE (gs-1) % 3 WHEN 0 THEN 'house' WHEN 1 THEN 'tree' ELSE 'person' END || '.png',
    'image/png',
    80000 + (gs * 211 % 40000),
    1024, 768,
    'READY',
    ('2025-12-01'::timestamptz + (((gs-1)/3) * interval '3 day 10 hours'))
FROM generate_series(1, 90) gs;  -- 30 sessions * 3 images

-- ============================================================
-- 2. Create constellations for each week
-- ============================================================
INSERT INTO constellations (user_id, week_start_date, week_end_date)
SELECT
    21,
    d::date,
    (d + interval '6 days')::date
FROM generate_series('2025-12-01'::date, '2026-03-02'::date, '7 days') d
ON CONFLICT (user_id, week_start_date) DO NOTHING;

-- ============================================================
-- 3. Create daily_entries (~70 entries, roughly 5 per week)
-- ============================================================

-- Get image IDs for daily drawings
WITH daily_img_ids AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn
    FROM images
    WHERE user_id = 21 AND image_key LIKE 'mock/daily_drawing_%'
)
INSERT INTO daily_entries (users_id, content, daily_type, emotion_color, emotion_value, entry_date, drawing_image_id, analysis_status, created_at, updated_at)
SELECT
    21,
    CASE (rn % 7)
        WHEN 0 THEN '오늘은 날씨가 좋아서 기분이 좋았다. 산책을 하며 마음이 편안해졌다.'
        WHEN 1 THEN '업무가 많아서 피곤했지만 동료와 이야기하면서 힘을 얻었다.'
        WHEN 2 THEN '새로운 프로젝트를 시작했다. 설레면서도 약간 긴장된다.'
        WHEN 3 THEN '오랜만에 친구를 만나서 즐거운 시간을 보냈다. 행복했다.'
        WHEN 4 THEN '오늘은 조금 우울했다. 혼자 음악을 들으며 시간을 보냈다.'
        WHEN 5 THEN '운동을 했더니 몸이 개운하고 머리가 맑아진 느낌이다.'
        ELSE '평범한 하루였지만 감사한 일들이 많았다. 내일도 좋은 하루가 되길.'
    END,
    'TEXT',
    CASE (rn % 8)
        WHEN 0 THEN '#FF6B6B'  -- 빨강 (화남/열정)
        WHEN 1 THEN '#4ECDC4'  -- 민트 (평온)
        WHEN 2 THEN '#FFE66D'  -- 노랑 (기쁨)
        WHEN 3 THEN '#A8E6CF'  -- 연두 (편안)
        WHEN 4 THEN '#6C5CE7'  -- 보라 (우울)
        WHEN 5 THEN '#FD79A8'  -- 분홍 (사랑)
        WHEN 6 THEN '#74B9FF'  -- 파랑 (차분)
        ELSE '#FFEAA7'         -- 연노랑 (따뜻)
    END,
    (rn % 5) + 1,  -- emotion_value 1~5
    ('2025-12-01'::date + ((rn - 1) * interval '1.5 days'))::date,
    daily_img_ids.id,
    'DONE',
    '2025-12-01'::timestamptz + ((rn - 1) * interval '1.5 days'),
    '2025-12-01'::timestamptz + ((rn - 1) * interval '1.5 days')
FROM daily_img_ids
WHERE rn <= 70;

-- ============================================================
-- 4. Create daily_results for each daily_entry
-- ============================================================
INSERT INTO daily_results (daily_entries_id, result, raw, created_at)
SELECT
    de.id,
    CASE (ROW_NUMBER() OVER (ORDER BY de.id) % 5)
        WHEN 0 THEN '오늘의 감정은 평온함이 주를 이루고 있습니다. 일상에서 작은 행복을 발견하는 능력이 뛰어나신 것 같습니다.'
        WHEN 1 THEN '약간의 스트레스가 감지되지만, 대처 능력이 좋습니다. 동료와의 교류가 큰 힘이 되고 있네요.'
        WHEN 2 THEN '새로운 도전에 대한 설렘과 긴장이 공존하고 있습니다. 이는 매우 건강한 감정 반응입니다.'
        WHEN 3 THEN '사회적 교류에서 큰 에너지를 얻는 타입이시네요. 친구와의 만남이 정서적 안정에 도움이 됩니다.'
        ELSE '자기 돌봄에 대한 의식이 높으십니다. 운동과 같은 활동이 정신 건강에 긍정적 영향을 미치고 있습니다.'
    END,
    '{"emotions":["happy","calm","grateful"],"intensity":0.7}',
    de.created_at + interval '1 minute'
FROM daily_entries de
WHERE de.users_id = 21 AND de.content LIKE '%오늘%' OR de.content LIKE '%업무%' OR de.content LIKE '%새로운%' OR de.content LIKE '%친구%' OR de.content LIKE '%우울%' OR de.content LIKE '%운동%' OR de.content LIKE '%평범%'
AND de.id NOT IN (SELECT daily_entries_id FROM daily_results);

-- ============================================================
-- 5. Create deep_sessions (30 sessions, ~2 per week)
-- ============================================================
INSERT INTO deep_sessions (user_id, deep_type, status, created_at, updated_at, submitted_at, completed_at)
SELECT
    21,
    'HTP',
    'DONE',
    '2025-12-01'::timestamptz + ((gs - 1) * interval '3.5 days'),
    '2025-12-01'::timestamptz + ((gs - 1) * interval '3.5 days') + interval '30 minutes',
    '2025-12-01'::timestamptz + ((gs - 1) * interval '3.5 days') + interval '15 minutes',
    '2025-12-01'::timestamptz + ((gs - 1) * interval '3.5 days') + interval '30 minutes'
FROM generate_series(1, 30) gs;

-- ============================================================
-- 6. Create deep_submissions (HTP: house, tree, person per session)
-- ============================================================
WITH deep_sess AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn
    FROM deep_sessions
    WHERE user_id = 21 AND deep_type = 'HTP' AND status = 'DONE'
    AND created_at >= '2025-12-01'
    ORDER BY id
),
deep_imgs AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn
    FROM images
    WHERE user_id = 21 AND image_key LIKE 'mock/deep_htp_%'
)
INSERT INTO deep_submissions (deep_session_id, image_id, type, created_at)
SELECT
    ds.id,
    di.id,
    CASE (di.rn - 1) % 3 WHEN 0 THEN 'HOUSE' WHEN 1 THEN 'TREE' ELSE 'PERSON' END,
    '2025-12-01'::timestamptz + ((ds.rn - 1) * interval '3.5 days') + interval '10 minutes'
FROM deep_sess ds
JOIN deep_imgs di ON di.rn BETWEEN (ds.rn - 1) * 3 + 1 AND ds.rn * 3;

-- ============================================================
-- 7. Create deep_results for each deep_session
-- ============================================================
INSERT INTO deep_results (deep_session_id, result, raw, created_at)
SELECT
    ds.id,
    CASE (ROW_NUMBER() OVER (ORDER BY ds.id) % 6)
        WHEN 0 THEN '집 그림에서 안정감과 가정에 대한 따뜻한 감정이 느껴집니다. 나무는 성장에 대한 욕구를 나타내며, 사람 그림은 사회적 관계에서의 자신감을 보여줍니다. 전반적으로 정서적으로 안정된 상태입니다.'
        WHEN 1 THEN '그림 전반에서 창의성과 표현력이 돋보입니다. 집의 크기와 위치는 자아의 안정감을, 나무의 가지는 대인관계의 풍요로움을 상징합니다. 현재 긍정적인 심리 상태를 유지하고 계십니다.'
        WHEN 2 THEN '약간의 불안 요소가 감지되지만, 이는 일시적인 것으로 보입니다. 집의 문이 열려있는 것은 타인에 대한 개방성을, 나무의 뿌리는 정서적 기반이 탄탄함을 나타냅니다.'
        WHEN 3 THEN '자기 표현에 대한 욕구가 강하게 나타납니다. 집의 창문은 외부 세계에 대한 호기심을, 사람 그림의 표정은 현재 만족감을 표현하고 있습니다. 자기 성장에 대한 의지가 엿보입니다.'
        WHEN 4 THEN '내면의 평화와 조화가 그림 전체에서 느껴집니다. 나무의 풍성한 잎은 풍부한 감정 세계를, 집의 안정적 구조는 심리적 안정감을 반영합니다. 대인관계도 원만한 상태입니다.'
        ELSE '성취 욕구와 목표 의식이 뚜렷하게 드러납니다. 집의 굴뚝은 가정 내 따뜻함을, 사람의 자세는 적극적인 삶의 태도를 보여줍니다. 전반적으로 건강한 심리 상태입니다.'
    END,
    '{"house":{"size":"medium","chimney":true,"windows":2},"tree":{"height":"tall","leaves":true},"person":{"expression":"smile","posture":"standing"}}',
    ds.created_at + interval '30 minutes'
FROM deep_sessions ds
WHERE ds.user_id = 21 AND ds.status = 'DONE'
AND ds.created_at >= '2025-12-01'
AND ds.id NOT IN (SELECT deep_session_id FROM deep_results);

-- ============================================================
-- 8. Create deep_psych_assessments (WHO5 per session)
-- ============================================================
INSERT INTO deep_psych_assessments (deep_session_id, user_id, test_code, score_total, score_positive, score_negative, score_balance, week_start_date, created_at)
SELECT
    ds.id,
    21,
    'WHO5',
    40 + (ROW_NUMBER() OVER (ORDER BY ds.id) % 50),  -- score_total 40~89
    3 + (ROW_NUMBER() OVER (ORDER BY ds.id) % 3)::smallint,  -- 3~5
    1 + (ROW_NUMBER() OVER (ORDER BY ds.id) % 3)::smallint,  -- 1~3
    2 + (ROW_NUMBER() OVER (ORDER BY ds.id) % 4)::smallint,  -- 2~5
    date_trunc('week', ds.created_at)::date,
    ds.created_at + interval '5 minutes'
FROM deep_sessions ds
WHERE ds.user_id = 21 AND ds.status = 'DONE'
AND ds.created_at >= '2025-12-01'
AND ds.id NOT IN (SELECT deep_session_id FROM deep_psych_assessments);

-- ============================================================
-- 9. Create DAILY stars (~70)
-- ============================================================
INSERT INTO stars (user_id, constellation_id, kind, daily_entry_id, deep_session_id, created_at, updated_at)
SELECT
    21,
    c.id,
    'DAILY',
    de.id,
    NULL,
    de.created_at,
    de.created_at
FROM daily_entries de
JOIN constellations c ON c.user_id = 21
    AND de.entry_date BETWEEN c.week_start_date AND c.week_end_date
WHERE de.users_id = 21
AND de.id NOT IN (SELECT daily_entry_id FROM stars WHERE daily_entry_id IS NOT NULL);

-- ============================================================
-- 10. Create DEEP stars (~30)
-- ============================================================
INSERT INTO stars (user_id, constellation_id, kind, daily_entry_id, deep_session_id, created_at, updated_at)
SELECT
    21,
    c.id,
    'DEEP',
    NULL,
    ds.id,
    ds.created_at,
    ds.completed_at
FROM deep_sessions ds
JOIN constellations c ON c.user_id = 21
    AND ds.created_at::date BETWEEN c.week_start_date AND c.week_end_date
WHERE ds.user_id = 21 AND ds.status = 'DONE'
AND ds.created_at >= '2025-12-01'
AND ds.id NOT IN (SELECT deep_session_id FROM stars WHERE deep_session_id IS NOT NULL);

-- ============================================================
-- Summary counts
-- ============================================================
SELECT 'constellations' AS entity, COUNT(*) FROM constellations WHERE user_id = 21
UNION ALL
SELECT 'daily_stars', COUNT(*) FROM stars WHERE user_id = 21 AND kind = 'DAILY'
UNION ALL
SELECT 'deep_stars', COUNT(*) FROM stars WHERE user_id = 21 AND kind = 'DEEP'
UNION ALL
SELECT 'total_stars', COUNT(*) FROM stars WHERE user_id = 21;

COMMIT;
