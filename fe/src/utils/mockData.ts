export const generateMockPlanets = () => {
    const dailyPlanets = [];
    const deepStars = [];
    const mypageStar = {
        id: "mypage-center-star",
        createdAt: new Date().toISOString(),
        toneColor: "#fde047", // 따뜻하고 크고 밝은 기본 톤 (조절 가능)
        label: "나의 우주 중심"
    };

    const SHELL_COLORS = [
        "#ef4444", "#3b82f6", "#10b981", "#f59e0b",
        "#8b5cf6", "#ec4899", "#6366f1", "#14b8a6", "#f43f5e"
    ];
    const CORE_COLORS = [
        "#fca5a5", "#93c5fd", "#6ee7b7", "#fcd34d",
        "#c4b5fd", "#f9a8d4", "#a5b4fc", "#5eead4", "#fda4af"
    ];
    const TONE_COLORS = [
        "#ffffff", "#fef08a", "#bae6fd", "#a7f3d0", "#ddd6fe", "#ffedd5"
    ];
    const TONES = [
        "차분한 흐름", "역동적 에너지", "안정된 평화", "불안정한 흔들림", "밝은 기운"
    ];
    const DAILY_CONTENTS = [
        "1차 MVP(만다라) 선택 → 기분 선택/색칠 → 분석 중 일기 쓰기",
        "준비중",
        "준비중",
    ];
    const DEEP_CONTENTS = [
        "일주일 한번 설문(강제) - HTP",
        "준비중",
        "준비중",
    ];
    const OBJECT_TYPES = ["halo", "shards", "spark", undefined];

    const now = new Date();
    let dailyIndex = 0;
    let deepIndex = 0;

    // 1년 365일: 주간 단위로 데일리 5개 + 심층 2개 섞기
    for (let i = 0; i < 365; i++) {
        const date = new Date(now.getTime() - (364 - i) * 24 * 60 * 60 * 1000);
        const weekDay = i % 7;

        if (weekDay < 5) {
            dailyIndex += 1;
            const dailyContent = DAILY_CONTENTS[dailyIndex % DAILY_CONTENTS.length];
            dailyPlanets.push({
                id: `daily-mock-${dailyIndex}`,
                createdAt: date.toISOString(),
                shell: SHELL_COLORS[Math.floor(Math.random() * SHELL_COLORS.length)],
                core: CORE_COLORS[Math.floor(Math.random() * CORE_COLORS.length)],
                objectType: OBJECT_TYPES[Math.floor(Math.random() * OBJECT_TYPES.length)] as any,
                objectColor: CORE_COLORS[Math.floor(Math.random() * CORE_COLORS.length)],
                memo: `데일리 ${dailyIndex}일차 - ${dailyContent}`,
            });
        } else {
            deepIndex += 1;
            const weekNumber = Math.floor(i / 7) + 1;
            const deepContent = DEEP_CONTENTS[deepIndex % DEEP_CONTENTS.length];
            deepStars.push({
                id: `deep-mock-${deepIndex}`,
                createdAt: date.toISOString(),
                tone: TONES[Math.floor(Math.random() * TONES.length)],
                toneColor: TONE_COLORS[Math.floor(Math.random() * TONE_COLORS.length)],
                label: `${weekNumber}주차 심층 - ${deepContent}`,
            });
        }
    }

    localStorage.setItem("dailyPlanets", JSON.stringify(dailyPlanets));
    localStorage.setItem("deepStars", JSON.stringify(deepStars));
    localStorage.setItem("mypageStar", JSON.stringify(mypageStar));
    localStorage.setItem("htpCompleted", "true"); // 최초 테스트 통과 처리

    return { dailyPlanets, deepStars, mypageStar };
};

export const ensureMockPlanets = () => {
    const hasDaily = !!localStorage.getItem("dailyPlanets");
    const hasDeep = !!localStorage.getItem("deepStars");
    const hasMy = !!localStorage.getItem("mypageStar");
    if (hasDaily && hasDeep && hasMy) return;
    generateMockPlanets();
};

export const clearMockPlanets = () => {
    localStorage.removeItem("dailyPlanets");
    localStorage.removeItem("deepStars");
    localStorage.removeItem("mypageStar");
    alert("테스트 데이터가 삭제되었습니다!\n페이지를 새로고침(F5) 해주세요.");
};
