import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dailyApi } from "../../api/daily";
import { resultApi } from "../../api/result";
import { imageApi } from "../../api/image";
import { useUiStore } from "../../store/uiStore";

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
  onSaved?: () => void;
};

function DailyCompleteView({ isModal = false, onClose, onBackToDetail, onSaved }: DailyCompleteViewProps) {
  const navigate = useNavigate();
  const addTemporaryStar = useUiStore((state) => state.addTemporaryStar);
  const refreshStarsAfterSave = useUiStore((state) => state.refreshStarsAfterSave);
  const [memo, setMemo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const savedCloseRef = useRef<(() => void) | undefined>(undefined);
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

  const resolveEmotionLabel = () => {
    const stored = localStorage.getItem("dailyMoodLabel");
    if (stored) {
      return stored;
    }

    const emotionByColor: Record<string, string> = {
      "#FFD54F": "기쁨",
      "#4FC3F7": "평온",
      "#FF6FAE": "설렘",
      "#66BB6A": "만족",
      "#5C6BC0": "슬픔",
      "#9575CD": "불안",
      "#EF5350": "분노",
      "#90A4AE": "지침",
    };

    return emotionByColor[(record.shellColor || "").toUpperCase()] || "평온";
  };

  const uploadDrawingAndCreateImage = async (dataUrl: string) => {
    const blob = await (await fetch(dataUrl)).blob();
    const bitmap = await createImageBitmap(blob);

    const presignedRes = await imageApi.getPresignedUrl({
      mimeType: blob.type || "image/png",
      byteSize: blob.size,
      width: bitmap.width,
      height: bitmap.height,
      purpose: "DAILY_DRAWING",
    });
    bitmap.close();

    const upload = presignedRes.data?.upload;
    const image = presignedRes.data?.image;
    if (!upload || !image) {
      throw new Error("이미지 업로드 준비 정보가 없습니다.");
    }

    const uploadRes = await fetch(upload.url, {
      method: upload.method || "PUT",
      headers: upload.headers || { "Content-Type": blob.type || "application/octet-stream" },
      body: blob,
    });

    if (!uploadRes.ok) {
      throw new Error("이미지 업로드에 실패했습니다.");
    }

    const createRes = await imageApi.registerImage({
      imageKey: image.imageKey,
      mimeType: blob.type || "image/png",
      byteSize: blob.size,
    });

    const imageId = createRes.data?.imageId;
    if (!imageId) {
      throw new Error("이미지 등록에 실패했습니다.");
    }

    localStorage.setItem("dailyDrawingImageId", String(imageId));
    return imageId;
  };

  const ensureDrawingImageId = async () => {
    const cachedImageId = Number(localStorage.getItem("dailyDrawingImageId") || 0);
    if (cachedImageId > 0) {
      return cachedImageId;
    }

    if (!record.mandalaImage) {
      throw new Error("그림 이미지가 없어 저장할 수 없습니다. 다시 그려주세요.");
    }

    return uploadDrawingAndCreateImage(record.mandalaImage);
  };

  const extractApiErrorCode = (error: unknown) => {
    const maybe = error as { error?: { code?: string }; code?: string } | undefined;
    return maybe?.error?.code ?? maybe?.code ?? null;
  };

  const updateExistingDailyForDate = async (entryDate: string) => {
    const listRes = await dailyApi.getDailyList();
    const list = (listRes.data ?? []) as Array<{ dailyId?: number; id?: number; entryDate?: string }>;
    const found = list.find((item) => item.entryDate === entryDate);
    const dailyId = Number(found?.dailyId ?? found?.id ?? 0);

    if (!dailyId || Number.isNaN(dailyId)) {
      throw new Error("기존 데일리 항목을 찾을 수 없습니다.");
    }

    await dailyApi.updateDaily(dailyId, {
      content: memo.trim(),
      emotion: resolveEmotionLabel(),
    });

    try {
      const detailRes = await resultApi.getDailyResult(dailyId);
      localStorage.setItem("latestDailyResult", JSON.stringify(detailRes.data));
    } catch {
      // 상세 조회 실패는 저장 처리 완료로 간주
    }
    return dailyId;
  };

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

  const finishAndClose = () => {
    onSaved?.();
    if (onClose) {
      onClose();
    } else {
      navigate("/");
    }
  };

  const showBirthAnimation = () => {
    setIsSaved(true);
    savedCloseRef.current = finishAndClose;
  };

  // 별 탄생 애니메이션 타이머
  useEffect(() => {
    if (!isSaved) return;
    const timer = setTimeout(() => {
      savedCloseRef.current?.();
    }, 2800);
    return () => clearTimeout(timer);
  }, [isSaved]);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const drawingImageId = await ensureDrawingImageId();
      const entryDate = new Date(record.createdAt).toISOString().slice(0, 10);

      let createRes;
      try {
        createRes = await dailyApi.createDaily({
          dailyType: "MANDALA",
          entryDate,
          content: memo.trim(),
          emotion: resolveEmotionLabel(),
          drawingImageId,
        });
      } catch (createError) {
        const code = extractApiErrorCode(createError);
        if (code === "D002") {
          const dailyId = await updateExistingDailyForDate(entryDate);
          
          addTemporaryStar({
            kind: "DAILY",
            createdAt: new Date().toISOString(),
            color: record.shellColor,
            targetId: dailyId,
          });
          refreshStarsAfterSave(dailyId, "DAILY");

          showBirthAnimation();
          return;
        }
        throw createError;
      }

      const dailyId = Number((createRes?.data as any)?.dailyId ?? (createRes?.data as any)?.id ?? 0);
      if (dailyId > 0) {
        try {
          const detailRes = await resultApi.getDailyResult(dailyId);
          localStorage.setItem("latestDailyResult", JSON.stringify(detailRes.data));
        } catch {
          // 결과 조회 실패는 생성 실패로 보지 않고 진행
        }

        addTemporaryStar({
          kind: "DAILY",
          createdAt: new Date().toISOString(),
          color: record.shellColor,
          targetId: dailyId,
        });
        refreshStarsAfterSave(dailyId, "DAILY");
      }

      persistLocalPlanet();
      showBirthAnimation();
    } catch (error) {
      console.error("daily submit failed", error);
      setSubmitError("서버 저장에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSaved) {
    const starColor = record.shellColor || "#facc15";
    const birthContent = (
      <div className="relative flex h-full min-h-[420px] flex-col items-center justify-center overflow-hidden bg-zinc-950 text-zinc-100">
        {/* 배경 펄스 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-ping rounded-full opacity-10" style={{ width: 320, height: 320, backgroundColor: starColor, animationDuration: "2s" }} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-pulse rounded-full opacity-15" style={{ width: 200, height: 200, backgroundColor: starColor, filter: "blur(60px)", animationDuration: "1.5s" }} />
        </div>

        {/* 별 본체 */}
        <div className="relative z-10 flex flex-col items-center">
          <div
            className="animate-[spin_8s_linear_infinite] rounded-md"
            style={{
              width: 80, height: 80, transform: "rotate(45deg)",
              background: `linear-gradient(135deg, ${starColor}, ${starColor}88, ${starColor}33)`,
              boxShadow: `0 0 60px ${starColor}88, 0 0 120px ${starColor}44, 0 0 200px ${starColor}22`,
            }}
          />
          {/* 파티클 */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-ping rounded-full"
              style={{
                width: 4, height: 4, backgroundColor: starColor, opacity: 0.6,
                top: `${50 + Math.sin((i / 8) * Math.PI * 2) * 60}%`,
                left: `${50 + Math.cos((i / 8) * Math.PI * 2) * 60}%`,
                animationDelay: `${i * 0.2}s`, animationDuration: "1.5s",
              }}
            />
          ))}
        </div>

        {/* 텍스트 */}
        <p className="relative z-10 mt-10 text-lg font-bold text-white">우주에 새로운 별이 태어나고 있어요</p>
        <p className="relative z-10 mt-2 text-sm text-zinc-400">잠시만 기다려 주세요...</p>
        <div className="relative z-10 mt-6 h-1 w-48 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full animate-[grow_2.8s_ease-in-out_forwards] rounded-full" style={{ backgroundColor: starColor, width: "0%" }} />
        </div>
        <style>{`@keyframes grow { to { width: 100%; } }`}</style>
      </div>
    );

    if (isModal) {
      return (
        <div className="custom-scrollbar fixed inset-0 z-[95] flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/78 px-4 py-4 text-zinc-100 backdrop-blur-sm">
          <div className="relative z-10 mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
            {birthContent}
          </div>
        </div>
      );
    }
    return birthContent;
  }

  const content = (
    <div className={`relative overflow-hidden bg-zinc-950 text-zinc-100 ${isModal ? "h-full flex flex-col" : "rounded-[30px] border border-white/10 shadow-[0_24px_90px_rgba(0,0,0,0.62)]"}`}>

      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">DAILY COMPLETE</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="h-8 rounded-xl border border-zinc-800 px-4 text-xs font-medium text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
          >
            뒤로
          </button>
          {isModal && (
            <button
              type="button"
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/10 hover:text-white"
              aria-label="닫기"
            >✕</button>
          )}
        </div>
      </div>

      {/* 스크롤 콘텐츠 */}
      <div className={`custom-scrollbar overflow-y-auto px-6 py-6 sm:px-8 sm:py-8 ${isModal ? "flex-1" : ""}`}>

        {/* 타이틀 */}
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">오늘의 기록을 저장해요</h2>
          <p className="mx-auto mt-2 text-sm text-zinc-400">기록 저장 후 AI 분석이 완료되면 우주에 새로운 데일리 별이 생성됩니다.</p>
        </div>

        {/* 진행 흐름 */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center gap-3 rounded-xl bg-zinc-900 px-5 py-3 text-sm">
            <span className="flex items-center gap-1.5 text-zinc-500">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-400">1</span>감정
            </span>
            <span className="text-zinc-700">→</span>
            <span className="flex items-center gap-1.5 text-zinc-500">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-400">2</span>그리기
            </span>
            <span className="text-zinc-700">→</span>
            <span className="flex items-center gap-1.5 text-zinc-400">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-zinc-950">3</span>저장
            </span>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(340px,1fr)_minmax(420px,1.15fr)]">
          {/* 미리보기 */}
          <section className="rounded-2xl bg-zinc-900 p-6">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">작품 미리보기</p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
              {record.mandalaImage ? (
                <img
                  src={record.mandalaImage}
                  alt="만다라 작품"
                  className="h-[320px] w-full object-cover"
                />
              ) : (
                <div className="grid h-[320px] place-items-center px-4 text-center text-sm text-zinc-600">
                  작품 미리보기가 아직 없어요.
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-zinc-800 px-3 py-1 text-[11px] font-medium text-zinc-400">만다라</span>
              <span className="rounded-full bg-zinc-800 px-3 py-1 text-[11px] font-medium text-zinc-400">
                {localStorage.getItem("dailyMoodLabel") || "감정"}
              </span>
            </div>
          </section>

          {/* 메모 입력 */}
          <section className="rounded-2xl bg-zinc-900 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Journal</p>
                <h3 className="mt-1 text-lg font-bold text-white">오늘의 감정 메모</h3>
              </div>
              <span className="rounded-full bg-zinc-800 px-3 py-1 text-[11px] font-medium text-zinc-400">{memoCount} chars</span>
            </div>

            <textarea
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              placeholder="예: 오늘은 복잡했지만 그림을 그리면서 마음이 천천히 정리됐다."
              rows={11}
              className="mt-4 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700"
            />

            {submitError && (
              <p className="mt-3 rounded-xl border border-amber-300/30 bg-amber-200/10 px-3 py-2 text-sm text-amber-100">
                {submitError}
              </p>
            )}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                className="h-12 rounded-xl bg-white px-10 text-sm font-bold text-zinc-950 shadow-lg shadow-white/10 transition hover:bg-zinc-100 disabled:opacity-50"
                disabled={isSubmitting}
                onClick={handleSubmit}
              >
                {isSubmitting ? "저장 중..." : "저장하기"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="custom-scrollbar fixed inset-0 z-[95] flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/78 px-4 py-4 text-zinc-100 backdrop-blur-sm">
        <button
          type="button"
          aria-label="모달 닫기"
          onClick={handleClose}
          className="absolute inset-0 h-full w-full cursor-default"
        />
        <div className="relative z-10 mx-auto w-full max-w-7xl max-h-[94vh] overflow-hidden rounded-3xl border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
          {content}
        </div>
      </div>
    );
  }

  return content;
}

export default DailyCompleteView;
