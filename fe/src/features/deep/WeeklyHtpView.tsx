import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useCanvasDrawing } from "../../hooks/useCanvasDrawing";
import type { ToolType } from "../../hooks/useCanvasDrawing";
import { deepApi } from "../../api/deep";
import { imageApi } from "../../api/image";
import type { DeepDetailResponse } from "../../types/deep";
import HTPResultView from "./components/HTPResultView";
import { useAlert } from "../../components/shared/AlertProvider";
import { useConfirm } from "../../components/shared/ConfirmProvider";
import { PAINT_PRESET_COLORS, getRecentPaintColors, pushRecentPaintColor } from "../../utils/paintColors";
import { DrawingCanvas } from "../../components/shared/DrawingCanvas";
import { getToolCursor } from "../../utils/toolCursors";
import { useUiStore } from "../../store/uiStore";
import { WEEKLY_LIMIT_MESSAGE, hasWeeklyDeepEntryByType } from "../../utils/dailyLimit";

type HtpStep = "house" | "tree" | "person";
type HtpPhase = "survey" | "draw" | "result";

/* ── constants ── */

const WHO5_QUESTIONS = [
  "기분이 밝고 명랑했다.",
  "마음이 차분하고 안정적이었다.",
  "활동적이고 활력이 있었다.",
  "상쾌하게 잠에서 깼다.",
  "일상생활이 흥미로웠다.",
];
const SPANE_QUESTIONS = [
  "긍정적인", "부정적인", "좋은", "나쁜", "즐거운", "불쾌한",
  "행복한", "슬픈", "두려운", "기쁜", "화난", "만족스러운"
];
const POLLING_INTERVAL_MS = 4000;
const POLLING_MAX_TRIES = 30;

type StepConfig = {
  key: HtpStep;
  title: string;
  description: string;
};

const STEPS: StepConfig[] = [
  { key: "house", title: "집", description: "지금 떠오르는 집의 분위기를 편하게 그려보세요." },
  { key: "tree", title: "나무", description: "당신의 에너지가 느껴지는 나무를 그려보세요." },
  { key: "person", title: "사람", description: "지금의 나를 떠올리며 사람을 그려보세요." },
];

/* ── tiny SVG icons (Lucide-based) ── */
const BrushIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>;
const FillIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z" /><path d="m5 2 5 5" /><path d="M2 13h15" /><path d="M22 20c0 .8-.7 1.7-1.5 1.7S19 20.8 19 20s1.5-2.8 1.5-2.8S22 19.2 22 20Z" /></svg>;
const EraserIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" /><path d="M22 21H7" /><path d="m5 11 9 9" /></svg>;
const TrashIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>;
const UndoIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" /></svg>;
const RedoIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7" /></svg>;

/* ── toolbar pill button ── */
function ToolBtn({
  active, disabled, onClick, children, title,
}: { active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      title={title}
      className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-150 shrink-0 ${disabled
        ? "opacity-30 cursor-not-allowed text-slate-500"
        : active
          ? "scale-105 border border-white/30 bg-white/20 text-white shadow-[0_0_18px_rgba(255,255,255,0.16)]"
          : "border border-transparent bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/12 hover:text-white"
        }`}
    >
      {children}
    </button>
  );
}

/* ── main page ── */
type WeeklyHtpViewProps = {
  isModal?: boolean;
  onClose?: () => void;
  onBackToWeeklyContent?: () => void;
  onSaved?: (sessionId: number) => void;
};

function WeeklyHtpView({ isModal = false, onClose, onBackToWeeklyContent, onSaved }: WeeklyHtpViewProps) {
  const navigate = useNavigate();
  const addTemporaryStar = useUiStore((state) => state.addTemporaryStar);
  const setPendingBirth = useUiStore((state) => state.setPendingBirth);
  const starsRef = useUiStore((state) => state.stars);

  const { showAlert } = useAlert();
  const { showConfirm } = useConfirm();
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<HtpPhase>("survey");
  const [surveyPageIndex, setSurveyPageIndex] = useState(0);
  const [sessionId, setSessionId] = useState<number | null>(null);

  // 🚨 [핵심 버그 수정 1] 설문 건너뛰기 상태 추적
  const [isWho5Skipped, setIsWho5Skipped] = useState(false);
  const [isSpaneSkipped, setIsSpaneSkipped] = useState(false);

  const [paintColor, setPaintColor] = useState<string>(PAINT_PRESET_COLORS[0]);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [brushSize, setBrushSize] = useState(4);
  const [tool, setTool] = useState<ToolType>("brush");
  const [activePopup, setActivePopup] = useState<string | null>(null);
  const customColorCommitTimerRef = useRef<number | null>(null);
  const lastInputColorRef = useRef<string | null>(null);

  const [totalStrokes, setTotalStrokes] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // 에러 메시지 3초 후 자동 제거
  useEffect(() => {
    if (saveError) {
      const timer = setTimeout(() => setSaveError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveError]);

  const [stepDrawings, setStepDrawings] = useState<Partial<Record<HtpStep, string>>>({});
  const [who5Answers, setWho5Answers] = useState<number[]>(Array(5).fill(-1));
  const [spaneAnswers, setSpaneAnswers] = useState<number[]>(Array(12).fill(-1));
  const [latestResult, setLatestResult] = useState<DeepDetailResponse | null>(null);

  const currentStep = STEPS[stepIndex];

  const drawing = useCanvasDrawing({ paintColor, brushSize, tool, symmetry: 1 });

  useEffect(() => {
    let alive = true;
    const guardWeeklyLimit = async () => {
      try {
        const sessionsRes = await deepApi.getPastSessions();
        const history = (sessionsRes.data ?? []) as any[];
        if (!alive || !hasWeeklyDeepEntryByType(history, "HTP")) return;

        showAlert(WEEKLY_LIMIT_MESSAGE, "error");
        if (onClose) {
          onClose();
          return;
        }
        navigate("/", { replace: true });
      } catch {
        // 조회 실패 시 무시
      }
    };
    void guardWeeklyLimit();
    return () => { alive = false; };
  }, [navigate, onClose]);

  // 세션 선제 생성
  useEffect(() => {
    if (phase === "survey" && !sessionId) {
      void (async () => {
        try {
          const res = await deepApi.createSession();
          if (res.data?.sessionId) setSessionId(res.data.sessionId);
        } catch (err) {
          console.error("Failed to create session", err);
        }
      })();
    }
  }, [phase, sessionId]);

  useEffect(() => {
    if (phase !== "draw") return;

    const canvas = drawing.canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    if (canvas.width !== rect.width * dpr && rect.width > 0) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);

    const savedDrawing = stepDrawings[currentStep.key];
    if (savedDrawing) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        if (typeof (drawing as any).resetHistory === 'function') (drawing as any).resetHistory();
      };
      img.src = savedDrawing;
    } else {
      if (typeof (drawing as any).resetHistory === 'function') (drawing as any).resetHistory();
    }
  }, [stepIndex, phase, currentStep.key]);

  const togglePopup = (name: string) => {
    if (activePopup === "color") {
      saveLastInputColor();
    }
    setActivePopup((prev) => (prev === name ? null : name));
  };

  useEffect(() => {
    setRecentColors(getRecentPaintColors());
  }, []);

  useEffect(() => {
    if (activePopup !== "color") return;
    const handleDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest(".toolbar-popup, .toolbar-area")) return;
      saveLastInputColor();
      setActivePopup(null);
    };
    document.addEventListener("pointerdown", handleDocumentPointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown, true);
    };
  }, [activePopup]);

  useEffect(() => {
    return () => {
      if (customColorCommitTimerRef.current !== null) {
        window.clearTimeout(customColorCommitTimerRef.current);
      }
    };
  }, []);

  const selectPaintColor = (color: string) => {
    setPaintColor(color);
    const nextRecent = pushRecentPaintColor(color);
    setRecentColors(nextRecent);
  };

  const saveLastInputColor = () => {
    const c = lastInputColorRef.current;
    if (c !== null) {
      lastInputColorRef.current = null;
      selectPaintColor(c);
    }
  };

  const handleCustomColorInput = (nextColor: string) => {
    if (customColorCommitTimerRef.current !== null) {
      window.clearTimeout(customColorCommitTimerRef.current);
    }
    lastInputColorRef.current = nextColor;
    setPaintColor(nextColor);
    customColorCommitTimerRef.current = window.setTimeout(() => {
      customColorCommitTimerRef.current = null;
      saveLastInputColor();
    }, 400);
  };

  const handleCustomColorBlur = () => {
    if (customColorCommitTimerRef.current !== null) {
      window.clearTimeout(customColorCommitTimerRef.current);
      customColorCommitTimerRef.current = null;
    }
    saveLastInputColor();
  };

  const handleClose = async () => {
    if (phase !== "result") {
      const confirmed = await showConfirm({
        title: "검사 중단",
        message: "현재 진행 중인 검사 내용이 사라집니다. 정말로 나가시겠습니까?",
        confirmText: "나가기",
        cancelText: "계속하기",
        type: "danger",
      });
      if (!confirmed) return;
    }

    if (onClose) { onClose(); return; }
    if (window.history.length > 1) { navigate(-1); return; }
    navigate("/");
  };

  const handleBackToWeeklyContent = async () => {
    if (phase !== "result") {
      const confirmed = await showConfirm({
        title: "검사 중단",
        message: "현재 진행 중인 검사 내용이 사라집니다. 정말로 돌아가시겠습니까?",
        confirmText: "돌아가기",
        cancelText: "계속하기",
        type: "danger",
      });
      if (!confirmed) return;
    }
    if (onBackToWeeklyContent) { onBackToWeeklyContent(); return; }
    navigate("/deep/content");
  };

  const persistCurrentStepDrawing = () => {
    const originalCanvas = drawing.canvasRef.current;
    if (!originalCanvas) return null;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = 1024;
    exportCanvas.height = 1024;
    const exportCtx = exportCanvas.getContext("2d");

    if (exportCtx) {
      exportCtx.fillStyle = "#ffffff";
      exportCtx.fillRect(0, 0, 1024, 1024);
      exportCtx.drawImage(originalCanvas, 0, 0, 1024, 1024);
      const dataUrl = exportCanvas.toDataURL("image/jpeg", 0.6);
      setStepDrawings((prev) => ({ ...prev, [currentStep.key]: dataUrl }));
      return dataUrl;
    }
    return null;
  };

  const handlePrevStep = () => {
    persistCurrentStepDrawing();
    setStepIndex((c) => c - 1);
  };

  const handleNextStep = () => {
    persistCurrentStepDrawing();
    if (stepIndex < STEPS.length - 1) {
      setStepIndex((c) => c + 1);
    } else {
      handleSave();
    }
  };

  const uploadDrawingAndCreateImage = async (dataUrl: string) => {
    const blob = await (await fetch(dataUrl)).blob();
    const bitmap = await createImageBitmap(blob);
    const presignedRes = await imageApi.getPresignedUrl({
      mimeType: blob.type || "image/png",
      byteSize: blob.size,
      width: bitmap.width,
      height: bitmap.height,
      purpose: "DEEP_DRAWING",
    });
    bitmap.close();

    const upload = presignedRes.data?.upload;
    const image = presignedRes.data?.image;
    if (!upload || !image) throw new Error("이미지 업로드 준비 정보가 없습니다.");

    const uploadRes = await fetch(upload.url, {
      method: upload.method || "PUT",
      headers: upload.headers || { "Content-Type": blob.type || "application/octet-stream" },
      body: blob,
    });
    if (!uploadRes.ok) throw new Error("이미지 업로드에 실패했습니다.");

    const createRes = await imageApi.registerImage({
      imageKey: image.imageKey,
      mimeType: blob.type || "image/png",
      byteSize: blob.size,
    });

    const imageId = createRes.data?.imageId;
    if (!imageId) throw new Error("이미지 등록에 실패했습니다.");
    return imageId;
  };

  const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

  const waitUntilAnalysisDone = async (sessionId: number) => {
    for (let attempt = 0; attempt < POLLING_MAX_TRIES; attempt += 1) {
      const statusRes = await deepApi.getAnalysisStatus(sessionId);
      const status = statusRes.data?.status;
      localStorage.setItem("latestDeepStatus", status || "ANALYZING");

      if (status === "DONE") return "DONE" as const;
      if (status === "FAILED") return "FAILED" as const;
      await sleep(POLLING_INTERVAL_MS);
    }
    return "TIMEOUT" as const;
  };

  // 🚨 [핵심 버그 수정 2] 저장 로직 통째로 개선 (스킵 우회 및 로컬 변수 바인딩)
  const handleSave = async () => {
    if (isSaving) return;
    setSaveError(null);

    const finalDataUrl = persistCurrentStepDrawing();
    const drawings = {
      ...stepDrawings,
      [currentStep.key]: finalDataUrl || stepDrawings[currentStep.key],
    };

    if (!drawings.house || !drawings.tree || !drawings.person) {
      setSaveError("집/나무/사람 그림을 모두 완료한 뒤 저장해주세요.");
      return;
    }

    // 스킵하지 않은 경우에만 설문 유효성 검사 진행
    if (!isWho5Skipped) {
      if (who5Answers.some((answer) => answer < 0 || answer > 5)) {
        setSaveError("WHO-5 문항 점수를 모두 선택해주세요.");
        return;
      }
    }
    if (!isSpaneSkipped) {
      if (spaneAnswers.some((answer) => answer < 1 || answer > 5)) {
        setSaveError("SPANE 문항 점수를 모두 선택해주세요.");
        return;
      }
    }

    setIsSaving(true);
    const toneLabel = totalStrokes > 180 ? "활력" : totalStrokes > 80 ? "안정" : "여백";
    const toneColor = totalStrokes > 180 ? "#F59E0B" : totalStrokes > 80 ? "#38BDF8" : "#94A3B8";

    const getWeekKey = (date: Date) => {
      const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const day = target.getUTCDay() || 7;
      target.setUTCDate(target.getUTCDate() + 4 - day);
      const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      return `${target.getUTCFullYear()}-W${weekNo}`;
    };
    const getWeekLabel = (date: Date) => `${date.getMonth() + 1}월 ${Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7)}주`;

    const createdAt = new Date();
    const nextStar = {
      id: `star-${Date.now()}`,
      createdAt: createdAt.toISOString(),
      weekKey: getWeekKey(createdAt),
      label: getWeekLabel(createdAt),
      tone: toneLabel,
      toneColor,
      strokes: totalStrokes,
      drawingImage: drawings.house,
    };

    const storedStars = localStorage.getItem("deepStars");
    const parsedStars = storedStars ? (JSON.parse(storedStars) as typeof nextStar[]) : [];
    localStorage.setItem("deepStars", JSON.stringify([nextStar, ...parsedStars].slice(0, 24)));
    localStorage.setItem("htpToneColor", toneColor);
    localStorage.setItem("htpCompleted", "true");
    localStorage.setItem("pendingHtpRecord", JSON.stringify({ ...nextStar }));

    // State에 갇히지 않도록 로컬 변수로 Session ID 관리
    let activeSessionId = sessionId;

    try {
      const houseImageId = await uploadDrawingAndCreateImage(drawings.house!);
      const treeImageId = await uploadDrawingAndCreateImage(drawings.tree!);
      const personImageId = await uploadDrawingAndCreateImage(drawings.person!);

      if (!activeSessionId) {
        const sessionRes = await deepApi.createSession();
        const newId = sessionRes.data?.sessionId;
        if (!newId) throw new Error("세션 생성 실패");

        activeSessionId = newId;
        setSessionId(newId);
      }

      // 🚨 추천하는 전송 로직 흐름
      if (isWho5Skipped) {
        await deepApi.submitWho5Assessment(activeSessionId, { answers: [0, 0, 0, 0, 0], isSkipped: true });
      } else {
        await deepApi.submitWho5Assessment(activeSessionId, { answers: who5Answers });
      }

      if (isSpaneSkipped) {
        await deepApi.submitSpaneAssessment(activeSessionId, { answers: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], isSkipped: true });
      } else {
        await deepApi.submitSpaneAssessment(activeSessionId, { answers: spaneAnswers });
      }

      // 2. 그 다음 최종적으로 그림을 제출하여 분석 트리거(DRAFT -> DONE)를 당김
      await deepApi.submitSubmissions(activeSessionId, { houseImageId, treeImageId, personImageId });

      // 모달 모드: 제출 직후 바로 모달 닫고 홈으로 (애니메이션/리포트는 HomePage에서 처리)
      if (isModal) {
        setIsSaving(false);
        onSaved?.(activeSessionId!);
        onClose?.();
        return;
      }

      // 비-모달 모드: 기존 로직 (temp star + 분석 대기)
      const existingDeepStar = starsRef.find(
        s => s.kind === "DEEP" && !s.isTemporary
      );
      if (!existingDeepStar) {
        addTemporaryStar({
          kind: "DEEP",
          createdAt: new Date().toISOString(),
          color: toneColor,
          targetId: activeSessionId,
        });
        setPendingBirth(activeSessionId, "DEEP");
      }

      const pollingResult = await waitUntilAnalysisDone(activeSessionId);

      if (pollingResult === "DONE") {
        const resultRes = await deepApi.getDeepResult(activeSessionId);
        if (resultRes.success && resultRes.data) {
          setLatestResult(resultRes.data);
          localStorage.setItem("latestDeepResultSummary", resultRes.data.aiResult.resultSummary || resultRes.data.aiResult.result || "");
          localStorage.setItem("latestDeepResult", JSON.stringify(resultRes.data));

          setIsSaving(false);
          setPhase("result");
          return;
        }
      } else if (pollingResult === "FAILED") {
        setSaveError("AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      } else {
        setSaveError("분석이 지연되고 있습니다. 잠시 후 결과 화면에서 다시 확인해주세요.");
      }
    } catch (error) {
      console.error("deep submit failed", error);
      setSaveError("저장에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }

    // 에러가 났을 때만 스피너 해제
    setIsSaving(false);
  };

  const canvasCursor = getToolCursor(tool, paintColor, 18 + brushSize * 2);

  const content = (
    <div
      className={`relative flex w-full flex-col overflow-hidden bg-zinc-950 text-zinc-100 ${isModal ? "h-full" : "h-[100dvh]"}`}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('.toolbar-area, .toolbar-popup')) return;
        setActivePopup(null);
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%)]" />

      {/* 🚨 [핵심 버그 수정 3] 그리기 화면에서도 에러를 볼 수 있도록 토스트 UI 추가 */}
      {saveError && phase === "draw" && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border border-red-400/50 bg-red-500/90 px-5 py-2.5 text-xs font-bold text-white shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          {saveError}
        </div>
      )}

      {/* ─── 헤더 (컴팩트 1줄) ─── */}
      <header className="z-10 flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-zinc-950/95 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={() => void handleBackToWeeklyContent()}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">HTP TEST</span>
        </div>
        {/* 헤더 버튼 영역 */}
        <div className="flex items-center gap-2">
          {phase === "draw" && (
            <>
              {stepIndex > 0 && (
                <button type="button" onClick={handlePrevStep} className="h-8 rounded-xl border border-white/15 bg-zinc-900/90 px-4 text-xs font-semibold text-zinc-100 transition-colors hover:bg-zinc-800">
                  뒤로
                </button>
              )}
              <button type="button" onClick={handleNextStep}
                className="h-8 rounded-xl border border-white/20 bg-white/15 px-4 text-xs font-semibold text-white transition-colors hover:bg-white/25">
                {stepIndex === STEPS.length - 1 ? "저장" : "다음"}
              </button>
            </>
          )}
          {isModal && (
            <button
              type="button"
              onClick={() => void handleClose()}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition text-xs"
              aria-label="닫기"
            >
              ✕
            </button>
          )}
        </div>
      </header>

      {/* ─── 메인 영역 ─── */}
      <div className="flex flex-1 min-h-0 relative z-10">

        {/* 1. 설문 단계 */}
        {phase === "survey" && (
          <div className="flex h-full w-full items-center justify-center p-4">
            <div className="flex w-full max-w-6xl h-fit max-h-[90vh] flex-col rounded-[2rem] bg-zinc-950/40 border border-white/10 p-5 sm:p-7 backdrop-blur-3xl relative overflow-hidden">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />

              {/* 상단 헤더 */}
              <div className="relative mb-5 flex flex-col shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Psych Assessment</span>
                    <span className="text-zinc-600 text-[9px]">•</span>
                    <span className="text-white/60 text-[9px] font-medium">{surveyPageIndex + 1} / 2 Pages</span>
                  </div>
                  <div className="flex gap-1">
                    <div className={`h-1 w-6 rounded-full transition-all duration-500 ${surveyPageIndex === 0 ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "bg-white/10"}`} />
                    <div className={`h-1 w-6 rounded-full transition-all duration-500 ${surveyPageIndex === 1 ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "bg-white/10"}`} />
                  </div>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 leading-tight">
                  {surveyPageIndex === 0 ? "WHO-5: 지난 2주 동안, 당신의 마음은 어떠했나요?" : "SPANE: 최근 당신은 이러한 감정들을 얼마나 자주 느꼈나요?"}
                </h2>

                <div className="space-y-1">
                  <p className="text-[13px] text-zinc-300 font-medium">
                    {surveyPageIndex === 0
                      ? "각 문항을 읽고 자신에게 가장 해당되는 점수를 선택해 주세요."
                      : "제시된 감정어들이 본인에게 나타난 빈도를 선택해 주세요."}
                  </p>
                </div>
              </div>

              {/* 설문 리스트 그리드 */}

              <div className={`relative flex-1 grid gap-2 sm:gap-2.5 overflow-hidden content-start ${surveyPageIndex === 0
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                }`}>
                {(surveyPageIndex === 0 ? WHO5_QUESTIONS : SPANE_QUESTIONS).map((question, idx) => {
                  const currentScore = surveyPageIndex === 0 ? who5Answers[idx] : spaneAnswers[idx];
                  return (
                    <div key={idx} className={`relative group flex flex-col justify-center rounded-xl border transition-all duration-300 ${currentScore !== -1
                      ? "bg-white/10 border-white/20 shadow-[0_4px_16px_rgba(0,0,0,0.15)]"
                      : "bg-white/[0.03] border-white/5 hover:border-white/15"
                      } ${surveyPageIndex === 0 ? "px-4 py-2" : "px-3 py-1.5"}`}>

                      <div className="flex items-start gap-2 mb-1">
                        <span className={`shrink-0 flex items-center justify-center w-4 h-4 rounded-full text-[8px] font-bold transition-all ${currentScore !== -1 ? "bg-white text-zinc-950" : "bg-white/10 text-zinc-500"
                          }`}>
                          {idx + 1}
                        </span>
                        <h3 className={`text-[13px] font-medium leading-tight transition-colors ${currentScore !== -1 ? "text-white" : "text-zinc-400 group-hover:text-zinc-200"
                          }`}>
                          {question}
                        </h3>
                      </div>

                      <div className="flex flex-col gap-1.5 mt-0.5">
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[9px] text-zinc-600 font-medium">{surveyPageIndex === 0 ? "0 전혀 아니다" : "1 전혀 아니다"}</span>
                          <span className="text-[9px] text-zinc-600 font-medium">5 항상 그렇다</span>
                        </div>
                        <div className="flex justify-between items-center gap-1">
                          {(surveyPageIndex === 0 ? [0, 1, 2, 3, 4, 5] : [1, 2, 3, 4, 5]).map((score) => (
                            <button
                              key={score}
                              type="button"
                              onClick={() => {
                                if (surveyPageIndex === 0) {
                                  setWho5Answers(prev => { const next = [...prev]; next[idx] = score; return next; });
                                } else {
                                  setSpaneAnswers(prev => { const next = [...prev]; next[idx] = score; return next; });
                                }
                              }}
                              className={`flex-1 h-6 sm:h-7 rounded-md text-[10px] font-bold transition-all duration-200 border ${currentScore === score
                                ? "bg-white text-zinc-950 border-white shadow-md scale-105"
                                : "bg-white/5 text-zinc-600 border-white/5 hover:border-white/20 hover:text-zinc-500"
                                }`}
                            >
                              {score}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 하단 제어부 */}
              <div className="relative mt-4 flex items-center justify-between pt-3 border-t border-white/10 shrink-0">
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      if (surveyPageIndex === 0) {
                        setIsWho5Skipped(true);
                        setSurveyPageIndex(1);
                      } else {
                        setIsSpaneSkipped(true);
                        setPhase("draw");
                      }
                    }}
                    className="h-10 px-4 rounded-xl text-[11px] font-medium text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all"
                  >
                    건너뛰기
                  </button>
                </div>

                <div className="flex w-full sm:w-auto gap-2">
                  {surveyPageIndex === 1 && (
                    <button
                      type="button"
                      onClick={() => setSurveyPageIndex(0)}
                      className="flex-1 sm:flex-none h-10 px-5 rounded-xl border border-white/10 text-[11px] font-semibold text-zinc-500 hover:bg-white/5 hover:text-white transition-all"
                    >
                      이전 단계
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (!sessionId) {
                        showAlert("세션 정보를 불러오는 중입니다. 잠시만 기다려주세요.", "error");
                        return;
                      }

                      const currentAnswers = surveyPageIndex === 0 ? who5Answers : spaneAnswers;
                      if (currentAnswers.some(a => a === -1)) {
                        showAlert("모든 문항에 답변을 완료해 주세요.", "error");
                        return;
                      }

                      if (surveyPageIndex === 0) {
                        setIsWho5Skipped(false);
                        setSurveyPageIndex(1);
                      } else {
                        setIsSpaneSkipped(false);
                        setPhase("draw");
                      }
                    }}
                    className="flex-[2] sm:flex-none h-10 px-7 rounded-xl bg-white text-zinc-950 text-[11px] font-bold hover:bg-zinc-200 transition-all shadow-lg active:scale-95"
                  >
                    {surveyPageIndex === 0 ? "다음: SPANE 검사" : "검증 완료 및 그리기 시작"}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 2. 그리기 단계 */}
        <div className={`h-full w-full flex-row ${phase === "draw" ? "flex" : "hidden"}`}>

          {/* 좌측 세로 툴바 */}
          <div className="toolbar-area z-40 shrink-0 flex w-20 flex-col items-center gap-1.5 overflow-visible border-r border-white/10 bg-zinc-900/95 py-3 backdrop-blur-md">
            <ToolBtn active={tool === "brush"} onClick={() => { setTool("brush"); setActivePopup(null); }} title="그리기">
              <span className="flex flex-col items-center leading-none"><BrushIcon /><span className="mt-0.5 text-[9px] font-semibold">그리기</span></span>
            </ToolBtn>
            <ToolBtn active={tool === "fill"} onClick={() => { setTool("fill"); setActivePopup(null); }} title="채우기">
              <span className="flex flex-col items-center leading-none"><FillIcon /><span className="mt-0.5 text-[9px] font-semibold">채우기</span></span>
            </ToolBtn>
            <ToolBtn active={tool === "eraser"} onClick={() => { setTool("eraser"); setActivePopup(null); }} title="지우기">
              <span className="flex flex-col items-center leading-none"><EraserIcon /><span className="mt-0.5 text-[9px] font-semibold">지우기</span></span>
            </ToolBtn>

            <div className="w-10 h-px bg-white/10 my-1.5" />

            {/* 색상 */}
            <div className="relative">
              <ToolBtn active={activePopup === "color"} onClick={() => togglePopup("color")} title="색상">
                <span className="flex flex-col items-center leading-none">
                  <div className="h-5 w-5 rounded-full ring-2 ring-white/40" style={{ backgroundColor: paintColor }} />
                  <span className="mt-0.5 text-[9px] font-semibold">색상</span>
                </span>
              </ToolBtn>
              {activePopup === "color" && (
                <div className="toolbar-popup absolute left-[calc(100%+10px)] top-1/2 z-50 w-[280px] -translate-y-1/2 rounded-2xl border border-white/15 bg-zinc-950 p-4 shadow-2xl backdrop-blur-xl" onPointerDown={(e) => e.stopPropagation()}>
                  <div className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-b border-l border-white/15 bg-zinc-950" />
                  <p className="mb-2 text-[10px] font-semibold tracking-wide text-zinc-400">기본 색상</p>
                <div className="grid grid-cols-6 gap-3 mb-3">
                  {PAINT_PRESET_COLORS.map((c) => (
                    <button key={c} onClick={() => selectPaintColor(c)}
                      className={`h-9 w-9 rounded-full border border-white/20 transition-opacity ${paintColor === c ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-950 opacity-100" : "opacity-85 hover:opacity-100"}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
                <p className="mb-2 text-[10px] font-semibold tracking-wide text-zinc-400">최근 사용 색상</p>
                <div className="grid grid-cols-6 gap-3 min-h-9 mb-3">
                  {recentColors.length > 0 ? recentColors.map((c) => (
                    <button key={`recent-${c}`} onClick={() => selectPaintColor(c)}
                      className={`h-9 w-9 rounded-full border border-white/20 transition-opacity ${paintColor === c ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-950 opacity-100" : "opacity-85 hover:opacity-100"}`}
                      style={{ backgroundColor: c }} />
                  )) : <span className="col-span-6 text-[10px] text-zinc-500">아직 사용한 색상이 없습니다.</span>}
                </div>
                <label className="flex h-8 w-full cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-zinc-900/95 text-xs text-zinc-300 transition-colors hover:bg-zinc-800">
                  커스텀 색상
                  <input
                    type="color"
                    value={paintColor}
                    onInput={(e) => handleCustomColorInput((e.target as HTMLInputElement).value)}
                    onBlur={handleCustomColorBlur}
                    className="absolute opacity-0 w-0 h-0"
                  />
                </label>
                </div>
              )}
            </div>

            {/* 굵기 */}
            <div className="relative">
              <ToolBtn active={activePopup === "size"} onClick={() => togglePopup("size")} title="굵기">
              <span className="flex flex-col items-center leading-none">
                <span className="inline-block rounded-full bg-current" style={{ width: Math.max(4, Math.min(brushSize + 2, 12)), height: Math.max(4, Math.min(brushSize + 2, 12)) }} />
                <span className="mt-0.5 text-[9px] font-semibold">굵기</span>
              </span>
            </ToolBtn>
              {activePopup === "size" && (
                <div className="toolbar-popup absolute left-[calc(100%+10px)] top-1/2 z-50 w-56 -translate-y-1/2 rounded-2xl border border-white/15 bg-zinc-950 p-4 shadow-2xl backdrop-blur-xl" onPointerDown={(e) => e.stopPropagation()}>
                  <div className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-b border-l border-white/15 bg-zinc-950" />
                  <div className="flex justify-between items-center mb-2.5 text-xs text-zinc-400">
                    <span>굵기</span><span className="text-zinc-300 font-bold">{brushSize}px</span>
                  </div>
                  <input type="range" min="1" max="30" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-full h-2 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-zinc-400" />
                </div>
              )}
            </div>

            <div className="w-10 h-px bg-white/10 my-1.5" />

            {/* 실행취소 / 다시실행 / 전체삭제 */}
            <ToolBtn disabled={!drawing.canUndo} onClick={drawing.handleUndo} title="실행취소">
              <span className="flex flex-col items-center leading-none"><UndoIcon /><span className="mt-0.5 text-[9px] font-semibold">되돌리기</span></span>
            </ToolBtn>
            <ToolBtn disabled={!drawing.canRedo} onClick={drawing.handleRedo} title="다시실행">
              <span className="flex flex-col items-center leading-none"><RedoIcon /><span className="mt-0.5 text-[9px] font-semibold">다시실행</span></span>
            </ToolBtn>
            <ToolBtn onClick={() => { drawing.handleClearCanvas(); setActivePopup(null); }} title="전체 지우기">
              <span className="flex flex-col items-center leading-none"><TrashIcon /><span className="mt-0.5 text-[9px] font-semibold">초기화</span></span>
            </ToolBtn>
          </div>

          {/* 캔버스 영역 */}
          <div className="flex-1 flex flex-col items-center justify-start min-w-0 min-h-0 overflow-hidden p-3 pt-4 relative" onPointerDown={() => setActivePopup(null)}>

            {/* 가이드 메시지 */}
            <div className="z-10 bg-zinc-900/72 backdrop-blur-md border border-white/12 px-5 py-2.5 rounded-full shadow-xl pointer-events-none text-center shrink-0">
              <p className="text-xs font-bold text-zinc-400 mb-0.5">Step {stepIndex + 1}. {currentStep.title}</p>
              <p className="text-sm text-zinc-200">{currentStep.description}</p>
            </div>

            {/* 캔버스 래퍼 */}
            <div className="relative h-[min(88vw,calc(100dvh-180px))] w-[min(88vw,calc(100dvh-180px))] max-h-[760px] max-w-[760px] rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-[0_16px_64px_rgba(0,0,0,0.5)] bg-white shrink-0 mt-2 mx-auto">
              <DrawingCanvas
                canvasRef={drawing.canvasRef}
                cursor={canvasCursor}
                onPointerDown={(e) => {
                  drawing.handlePointerDown(e);
                  setTotalStrokes(s => s + 1);
                }}
                onPointerMove={drawing.handlePointerMove}
                onPointerUp={drawing.handlePointerUp}
              />
            </div>
          </div>
        </div>

        {/* 3. 결과 단계 */}
        {phase === "result" && (
          <div className="w-full h-full">
            <HTPResultView
              result={latestResult!}
              onRestart={() => setPhase("draw")}
              onComplete={() => { if (onClose) onClose(); else navigate("/", { replace: true }); }}
              saveError={saveError}
            />
          </div>
        )}

      </div>

      {isSaving && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/78 backdrop-blur-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/60 border-t-transparent mb-4" />
          <p className="text-sm uppercase tracking-[0.35em] text-zinc-200">위클리 기록을 저장 중이에요</p>
        </div>
      )}
    </div>
  );

  if (!isModal) return content;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        type="button"
        onClick={() => void handleClose()}
        className="absolute inset-0 h-full w-full cursor-default pointer-events-auto"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="pointer-events-auto relative z-10 h-full w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl"
      >
        {content}
      </motion.div>
    </div>
  );
}

export default WeeklyHtpView;
