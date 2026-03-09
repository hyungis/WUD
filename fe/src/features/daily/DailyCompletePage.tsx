import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/shared/Button";
import { dailyApi } from "../../api/daily";
import { resultApi } from "../../api/result";

type PendingDailyRecord = {
  shellColor: string;
  coreColor: string;
  objectType: "halo" | "shards" | "spark";
  objectColor: string;
  mandalaImage: string | null;
  createdAt: string;
};

function DailyCompletePage() {
  const navigate = useNavigate();
  const [memo, setMemo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const memoCount = useMemo(() => memo.trim().length, [memo]);
  const record = useMemo(() => {
    const stored = localStorage.getItem("pendingDailyRecord");
    return stored ? (JSON.parse(stored) as PendingDailyRecord) : null;
  }, []);

  useEffect(() => {
    if (!record) {
      navigate("/daily/content", { replace: true });
    }
  }, [record, navigate]);

  if (!record) {
    return null;
  }

  const persistLocalPlanet = () => {
    const nextPlanet = {
      id: `daily-${Date.now()}`,
      shell: record.shellColor,
      core: record.coreColor,
      objectType: record.objectType,
      objectColor: record.objectColor,
      memo: memo.trim(),
      drawingImage: record.mandalaImage,
      createdAt: record.createdAt,
    };
    const stored = localStorage.getItem("dailyPlanets");
    const parsed = stored ? (JSON.parse(stored) as typeof nextPlanet[]) : [];
    const nextPlanets = [nextPlanet, ...parsed].slice(0, 365);
    localStorage.setItem("dailyPlanets", JSON.stringify(nextPlanets));
    localStorage.setItem("dailyPlanetReady", "true");
    localStorage.setItem("dailyPlanetShellColor", record.shellColor);
    localStorage.setItem("dailyPlanetCoreColor", record.coreColor);
    localStorage.setItem("dailyMemo", memo);
    localStorage.setItem("dailyPaintColor", record.objectColor);
    if (record.mandalaImage) {
      localStorage.setItem("dailyDrawingImage", record.mandalaImage);
    }
    localStorage.removeItem("pendingDailyRecord");
    localStorage.setItem("openDailyReport", "true");
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const moodValue = Number(localStorage.getItem("dailyMoodValue") || 3);
      const drawingImageId = Number(localStorage.getItem("dailyDrawingImageId") || 0);
      const entryDate = new Date(record.createdAt).toISOString().slice(0, 10);

      // 이미지 업로드 연동이 되지 않은 환경에서는 기존 로컬 저장으로 폴백합니다.
      if (drawingImageId > 0) {
        const createRes = await dailyApi.createDaily({
          dailyType: "EMOTION",
          entryDate,
          content: memo.trim(),
          emotionValue: Number.isFinite(moodValue) ? moodValue : 3,
          emotionColor: record.shellColor,
          drawingImageId,
        });

        const dailyId = createRes.data?.dailyId;
        if (dailyId) {
          try {
            const detailRes = await resultApi.getDailyResult(dailyId);
            localStorage.setItem("latestDailyResult", JSON.stringify(detailRes.data));
          } catch {
            // 결과 조회 실패는 생성 실패로 보지 않고 진행
          }
        }
      }

      persistLocalPlanet();
      navigate("/dashboard");
    } catch (error) {
      console.error("daily submit failed", error);
      setSubmitError("API 저장에 실패해 로컬 저장으로 전환합니다.");
      persistLocalPlanet();
      navigate("/dashboard");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 pb-[100px]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 starfield z-20" />
      </div>

      <div className="daily-complete-wrap">
        <div className="daily-complete-hero">
          <div className="daily-complete-badge">ANALYZING</div>
          <h2 className="daily-complete-title">오늘의 감정이 별이 됩니다</h2>
          <p className="daily-complete-subtitle">만다라 기록을 바탕으로 행성이 생성되는 중이에요.</p>

          <div className="daily-complete-planet">
            <div className="daily-planet-preview daily-planet-forming" style={{ "--shell": record.shellColor, "--core": record.coreColor } as React.CSSProperties}>
              {record.mandalaImage && (
                <img
                  src={record.mandalaImage}
                  alt="만다라 미리보기"
                  className="daily-planet-mandala"
                />
              )}
              <div className="daily-planet-core" />
            </div>
            <div className="daily-complete-glow" aria-hidden="true" />
          </div>

          <div className="daily-complete-chips">
            <span className="daily-complete-chip">만다라 분석</span>
            <span className="daily-complete-chip">색상 추출</span>
            <span className="daily-complete-chip">행성 코어 생성</span>
          </div>

          <p className="daily-complete-note">결과는 참고용이며 진단이 아닙니다.</p>
        </div>

        <div className="daily-complete-journal">
          <div className="daily-complete-journal-head">
            <div>
              <p className="daily-complete-eyebrow">Today Journal</p>
              <h3 className="daily-complete-journal-title">오늘의 감정을 적어주세요</h3>
            </div>
            <div className="daily-complete-count">{memoCount} chars</div>
          </div>
          <textarea
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            placeholder="예: 오늘은 마음이 조용했지만, 만다라를 그리며 숨이 고르게 정리됐다."
            rows={12}
            className="daily-complete-textarea"
          />
          {submitError && (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              {submitError}
            </p>
          )}
          <div className="daily-complete-actions">
            <Button type="button" variant="secondary" className="daily-complete-btn" onClick={() => navigate("/daily/detail")}>
              돌아가기
            </Button>
            <Button
              type="button"
              className="daily-complete-btn"
              disabled={isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? "저장 중..." : "저장하기"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DailyCompletePage;
