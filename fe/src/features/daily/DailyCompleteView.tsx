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

type DailyCompleteViewProps = {
  isModal?: boolean;
  onClose?: () => void;
  onBackToDetail?: () => void;
};

function DailyCompleteView({ isModal = false, onClose, onBackToDetail }: DailyCompleteViewProps) {
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
    if (record) return;

    if (onClose) {
      onClose();
      return;
    }

    navigate("/daily/content", { replace: true });
  }, [record, onClose, navigate]);

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

  const handleClose = () => {
    if (onClose) {
      onClose();
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/");
  };

  const handleBack = () => {
    if (onBackToDetail) {
      onBackToDetail();
      return;
    }

    navigate("/daily/detail");
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const moodValue = Number(localStorage.getItem("dailyMoodValue") || 3);
      const drawingImageId = Number(localStorage.getItem("dailyDrawingImageId") || 0);
      const entryDate = new Date(record.createdAt).toISOString().slice(0, 10);

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
      if (onClose) {
        onClose();
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error("daily submit failed", error);
      setSubmitError("API 저장에 실패해 로컬 저장으로 전환합니다.");
      persistLocalPlanet();
      if (onClose) {
        onClose();
      } else {
        navigate("/");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <div className="relative overflow-hidden rounded-[30px] border border-cyan-200/20 bg-slate-950/80 p-4 shadow-[0_24px_90px_rgba(2,6,23,0.55)] ring-1 ring-cyan-100/10 sm:p-7">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.16),transparent_52%)]" />

      <div className="relative z-10 flex items-start justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-100/75">Daily Complete</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-50 sm:text-3xl">오늘의 기록을 저장해요</h2>
          <p className="mt-2 text-sm text-slate-300/90">기록을 남기면 우주에 새로운 데일리 행성이 생성됩니다.</p>
        </div>
        {isModal && (
          <button
            type="button"
            onClick={handleClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/5 text-sm text-slate-200 transition hover:bg-white/10"
            aria-label="닫기"
          >
            X
          </button>
        )}
      </div>

      <div className="relative z-10 mt-6 grid gap-5 lg:grid-cols-[minmax(340px,1fr)_minmax(420px,1.15fr)]">
        <section className="rounded-3xl border border-cyan-100/15 bg-slate-900/55 p-6 backdrop-blur-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100/70">Daily Review</p>
          <div className="mt-5 overflow-hidden rounded-2xl border border-white/15 bg-slate-950/70">
            {record.mandalaImage ? (
              <img
                src={record.mandalaImage}
                alt="그날 활동 작품"
                className="h-[320px] w-full object-cover"
              />
            ) : (
              <div className="grid h-[320px] place-items-center px-4 text-center text-sm text-slate-400">
                그날 활동 작품 미리보기가 아직 없어요.
              </div>
            )}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">활동 작품</span>
            <span className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">감정 기록</span>
            <span className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">데일리 저장</span>
          </div>
          <p className="mt-4 text-xs text-slate-400">오늘의 활동 작품과 메모를 함께 저장해 회고를 이어가요.</p>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/55 p-6 backdrop-blur-lg">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Journal</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-100">오늘의 감정 메모</h3>
            </div>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-300">{memoCount} chars</span>
          </div>

          <textarea
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            placeholder="예: 오늘은 복잡했지만 그림을 그리면서 마음이 천천히 정리됐다."
            rows={11}
            className="mt-4 w-full resize-none rounded-2xl border border-white/15 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/30"
          />

          {submitError && (
            <p className="mt-3 rounded-xl border border-amber-300/30 bg-amber-200/10 px-3 py-2 text-sm text-amber-100">
              {submitError}
            </p>
          )}

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" className="liquid-btn liquid-btn--neutral px-5 py-2.5" onClick={handleBack}>
              이전 단계
            </Button>
            <Button
              type="button"
              className="liquid-btn liquid-btn--daily px-5 py-2.5"
              disabled={isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? "저장 중..." : "저장하고 닫기"}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="custom-scrollbar fixed inset-0 z-[95] flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/35 px-4 py-8 text-slate-100">
        <button
          type="button"
          aria-label="모달 닫기"
          onClick={handleClose}
          className="absolute inset-0 h-full w-full cursor-default"
        />
        <div className="relative z-10 w-full max-w-6xl translate-y-3 overflow-x-hidden">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4 py-8 text-slate-100 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-6xl">{content}</div>
    </div>
  );
}

export default DailyCompleteView;
