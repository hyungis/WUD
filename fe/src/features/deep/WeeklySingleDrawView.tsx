import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCanvasDrawing } from "../../hooks/useCanvasDrawing";
import type { ToolType } from "../../hooks/useCanvasDrawing";
import { deepApi } from "../../api/deep";
import { imageApi } from "../../api/image";
import type { DeepDetailResponse } from "../../types/deep";
import SingleDrawResultView from "./components/SingleDrawResultView";
import { DrawingCanvas } from "../../components/shared/DrawingCanvas";
import { useUiStore } from "../../store/uiStore";
import { WEEKLY_LIMIT_MESSAGE, hasWeeklyDeepEntryByType } from "../../utils/dailyLimit";
import { getApiErrorMessage } from "../../utils/apiError";

type DrawPhase = "survey" | "draw" | "result";

/* ── constants ── */
const PALETTE = [
  "#111827", "#374151", "#6B7280", "#F97316", "#F59E0B", "#10B981",
  "#06B6D4", "#3B82F6", "#6366F1", "#8B5CF6", "#EC4899", "#F43F5E",
];
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

type TestConfig = {
  deepType: "PERSON_IN_RAIN" | "STAR_WAVE";
  headerLabel: string;
  submissionType: "RAIN_PERSON" | "STAR_WAVE";
  drawingTitle: string;
  drawingDescription: string;
  reportLabel: string;
};

const TEST_CONFIGS: Record<string, TestConfig> = {
  PERSON_IN_RAIN: {
    deepType: "PERSON_IN_RAIN",
    headerLabel: "PERSON IN RAIN TEST",
    submissionType: "RAIN_PERSON",
    drawingTitle: "빗속의 사람",
    drawingDescription: "비가 오는 날, 한 사람을 떠올리며 자유롭게 그려보세요.",
    reportLabel: "Person in Rain Analysis Report",
  },
  STAR_WAVE: {
    deepType: "STAR_WAVE",
    headerLabel: "STAR-WAVE TEST",
    submissionType: "STAR_WAVE",
    drawingTitle: "별과 파도",
    drawingDescription: "밤하늘의 별과 바다의 파도를 자유롭게 그려보세요.",
    reportLabel: "Star-Wave Analysis Report",
  },
};

/* ── tiny SVG icons (same as HTP) ── */
const BrushIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /></svg>;
const FillIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M2.5 2.5l19 19" /><path d="M12 2v6.5L17.5 14" /><path d="M19 19c1.5 0 3-1.5 3-3s-3-5-3-5-3 3-3 5 1.5 3 3 3z" /><path d="M2 22l4-4" /><path d="M7.5 13.5L2 19" /></svg>;
const EraserIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M7 21h10" /><path d="M5.5 12.5L12 6l6 6-4.5 4.5a2.12 2.12 0 01-3 0l-5-5z" /></svg>;
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

/* ── main component ── */
type WeeklySingleDrawViewProps = {
  testType: "PERSON_IN_RAIN" | "STAR_WAVE";
  isModal?: boolean;
  onClose?: () => void;
  onBackToWeeklyContent?: () => void;
  onSaved?: (sessionId: number) => void;
};

function WeeklySingleDrawView({ testType, isModal = false, onClose, onBackToWeeklyContent, onSaved }: WeeklySingleDrawViewProps) {
  const navigate = useNavigate();
  const addTemporaryStar = useUiStore((state) => state.addTemporaryStar);
  const setPendingBirth = useUiStore((state) => state.setPendingBirth);
  const starsRef = useUiStore((state) => state.stars);

  const config = TEST_CONFIGS[testType];

  const [phase, setPhase] = useState<DrawPhase>("survey");
  const [surveyPageIndex, setSurveyPageIndex] = useState(0);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [isSurveySkipped, setIsSurveySkipped] = useState(false);

  const [paintColor, setPaintColor] = useState(PALETTE[0]);
  const [brushSize, setBrushSize] = useState(4);
  const [tool, setTool] = useState<ToolType>("brush");
  const [activePopup, setActivePopup] = useState<string | null>(null);

  const [totalStrokes, setTotalStrokes] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (saveError) {
      const timer = setTimeout(() => setSaveError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveError]);

  const [drawingDataUrl, setDrawingDataUrl] = useState<string | null>(null);
  const [who5Answers, setWho5Answers] = useState<number[]>(Array(5).fill(-1));
  const [spaneAnswers, setSpaneAnswers] = useState<number[]>(Array(12).fill(-1));
  const [latestResult, setLatestResult] = useState<DeepDetailResponse | null>(null);

  const drawing = useCanvasDrawing({ paintColor, brushSize, tool, symmetry: 1 });

  // Weekly limit guard
  useEffect(() => {
    let alive = true;
    const guardWeeklyLimit = async () => {
      try {
        const sessionsRes = await deepApi.getPastSessions();
        const history = (sessionsRes.data ?? []) as any[];
        if (!alive || !hasWeeklyDeepEntryByType(history, config.deepType)) return;
        window.alert(WEEKLY_LIMIT_MESSAGE);
        if (onClose) { onClose(); return; }
        navigate("/", { replace: true });
      } catch { /* ignore */ }
    };
    void guardWeeklyLimit();
    return () => { alive = false; };
  }, [navigate, onClose, config.deepType]);

  // Pre-create session
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

  // Initialize canvas when entering draw phase
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

    if (drawingDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        if (typeof (drawing as any).resetHistory === "function") (drawing as any).resetHistory();
      };
      img.src = drawingDataUrl;
    } else {
      if (typeof (drawing as any).resetHistory === "function") (drawing as any).resetHistory();
    }
  }, [phase]);

  const togglePopup = (name: string) => setActivePopup(prev => prev === name ? null : name);

  const handleClose = () => {
    if (onClose) { onClose(); return; }
    if (window.history.length > 1) { navigate(-1); return; }
    navigate("/");
  };

  const handleBackToWeeklyContent = () => {
    if (onBackToWeeklyContent) { onBackToWeeklyContent(); return; }
    navigate("/deep/content");
  };

  const persistDrawing = () => {
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
      const dataUrl = exportCanvas.toDataURL("image/png");
      setDrawingDataUrl(dataUrl);
      return dataUrl;
    }
    return null;
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

  const waitUntilAnalysisDone = async (sid: number) => {
    for (let attempt = 0; attempt < POLLING_MAX_TRIES; attempt += 1) {
      const statusRes = await deepApi.getAnalysisStatus(sid);
      const status = statusRes.data?.status;
      localStorage.setItem("latestDeepStatus", status || "ANALYZING");
      if (status === "DONE") return "DONE" as const;
      if (status === "FAILED") return "FAILED" as const;
      await sleep(POLLING_INTERVAL_MS);
    }
    return "TIMEOUT" as const;
  };

  const handleSave = async () => {
    if (isSaving) return;
    setSaveError(null);

    const finalDataUrl = persistDrawing() || drawingDataUrl;
    if (!finalDataUrl) {
      setSaveError("그림을 완성한 뒤 저장해주세요.");
      return;
    }

    if (!isSurveySkipped) {
      if (who5Answers.some((a) => a < 0 || a > 5)) {
        setSaveError("WHO-5 문항 점수를 모두 선택해주세요.");
        return;
      }
      if (spaneAnswers.some((a) => a < 1 || a > 5)) {
        setSaveError("SPANE 문항 점수를 모두 선택해주세요.");
        return;
      }
    }

    setIsSaving(true);
    const toneColor = totalStrokes > 180 ? "#F59E0B" : totalStrokes > 80 ? "#38BDF8" : "#94A3B8";

    let activeSessionId = sessionId;

    try {
      const imageId = await uploadDrawingAndCreateImage(finalDataUrl);

      if (!activeSessionId) {
        const sessionRes = await deepApi.createSession();
        const newId = sessionRes.data?.sessionId;
        if (!newId) throw new Error("세션 생성 실패");
        activeSessionId = newId;
        setSessionId(newId);
      }

      if (isSurveySkipped) {
        await Promise.all([
          deepApi.submitWho5Assessment(activeSessionId, { answers: [0, 0, 0, 0, 0] }),
          deepApi.submitSpaneAssessment(activeSessionId, { answers: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] }),
        ]);
      }

      // Submit single image via generic endpoint
      await deepApi.submitSingleDrawing(activeSessionId, {
        imageId,
        type: config.submissionType,
      });

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

    setIsSaving(false);
  };

  const canvasCursor = tool === "fill" ? "crosshair" : tool === "eraser" ? "cell" : "default";

  const content = (
    <div
      className={`relative flex w-full flex-col overflow-hidden bg-zinc-950 text-zinc-100 ${isModal ? "h-full" : "h-[100dvh]"}`}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest(".toolbar-area, .toolbar-popup")) return;
        setActivePopup(null);
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%)]" />

      {saveError && phase === "draw" && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border border-red-400/50 bg-red-500/90 px-5 py-2.5 text-xs font-bold text-white shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          {saveError}
        </div>
      )}

      {/* ─── Header ─── */}
      <header className="z-10 flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-zinc-950/95 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={handleBackToWeeklyContent}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">{config.headerLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          {phase === "draw" && (
            <button type="button" onClick={handleSave}
              className="h-8 rounded-xl border border-white/20 bg-white/15 px-4 text-xs font-semibold text-white transition-colors hover:bg-white/25">
              저장
            </button>
          )}
          {isModal && (
            <button type="button" onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition text-xs"
              aria-label="닫기">
              ✕
            </button>
          )}
        </div>
      </header>

      {/* ─── Main Area ─── */}
      <div className="flex flex-1 min-h-0 relative z-10">

        {/* 1. Survey phase */}
        {phase === "survey" && (
          <div className="flex h-full w-full items-center justify-center p-4">
            <div className="flex w-full max-w-6xl h-fit max-h-[90vh] flex-col rounded-[2rem] bg-zinc-950/40 border border-white/10 p-5 sm:p-7 backdrop-blur-3xl relative overflow-hidden">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />

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
                  {surveyPageIndex === 0 ? "지난 2주 동안, 당신의 마음은 어떠했나요?" : "최근 당신은 이러한 감정들을 얼마나 자주 느꼈나요?"}
                </h2>
                <p className="text-[13px] text-zinc-300 font-medium">
                  {surveyPageIndex === 0
                    ? "각 문항을 읽고 자신에게 가장 해당되는 점수를 선택해 주세요."
                    : "제시된 감정어들이 본인에게 나타난 빈도를 선택해 주세요."}
                </p>
              </div>

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
                        <span className={`shrink-0 flex items-center justify-center w-4 h-4 rounded-full text-[8px] font-bold transition-all ${currentScore !== -1 ? "bg-white text-zinc-950" : "bg-white/10 text-zinc-500"}`}>
                          {idx + 1}
                        </span>
                        <h3 className={`text-[13px] font-medium leading-tight transition-colors ${currentScore !== -1 ? "text-white" : "text-zinc-400 group-hover:text-zinc-200"}`}>
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

              <div className="relative mt-4 flex items-center justify-between pt-3 border-t border-white/10 shrink-0">
                <div>
                  <button type="button"
                    onClick={() => { setIsSurveySkipped(true); setPhase("draw"); }}
                    className="h-10 px-4 rounded-xl text-[11px] font-medium text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all">
                    건너뛰기
                  </button>
                </div>
                <div className="flex w-full sm:w-auto gap-2">
                  {surveyPageIndex === 1 && (
                    <button type="button" onClick={() => setSurveyPageIndex(0)}
                      className="flex-1 sm:flex-none h-10 px-5 rounded-xl border border-white/10 text-[11px] font-semibold text-zinc-500 hover:bg-white/5 hover:text-white transition-all">
                      이전 단계
                    </button>
                  )}
                  <button type="button"
                    onClick={async () => {
                      if (!sessionId) { alert("세션 정보를 불러오는 중입니다. 잠시만 기다려주세요."); return; }
                      const currentAnswers = surveyPageIndex === 0 ? who5Answers : spaneAnswers;
                      if (currentAnswers.some(a => a === -1)) { alert("모든 문항에 답변을 완료해 주세요."); return; }
                      setIsSurveySkipped(false);
                      if (surveyPageIndex === 0) {
                        try {
                          await deepApi.submitWho5Assessment(sessionId, { answers: who5Answers });
                          setSurveyPageIndex(1);
                        } catch (err) { alert(getApiErrorMessage(err, "결과 전송 실패. 다시 시도해 주세요.")); }
                      } else {
                        try {
                          await deepApi.submitSpaneAssessment(sessionId, { answers: spaneAnswers });
                          setPhase("draw");
                        } catch (err) { alert(getApiErrorMessage(err, "결과 전송 실패. 다시 시도해 주세요.")); }
                      }
                    }}
                    className="flex-[2] sm:flex-none h-10 px-7 rounded-xl bg-white text-zinc-950 text-[11px] font-bold hover:bg-zinc-200 transition-all shadow-lg active:scale-95">
                    {surveyPageIndex === 0 ? "다음: SPANE 검사" : "검증 완료 및 그리기 시작"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Drawing phase */}
        <div className={`h-full w-full flex-row ${phase === "draw" ? "flex" : "hidden"}`}>

          {/* Left toolbar */}
          <div className="toolbar-area z-40 shrink-0 flex w-20 flex-col items-center gap-1.5 overflow-visible border-r border-white/10 bg-zinc-900/95 py-3 backdrop-blur-md">
            <ToolBtn active={tool === "brush"} onClick={() => { setTool("brush"); setActivePopup(null); }} title="브러시"><BrushIcon /></ToolBtn>
            <ToolBtn active={tool === "fill"} onClick={() => { setTool("fill"); setActivePopup(null); }} title="채우기"><FillIcon /></ToolBtn>
            <ToolBtn active={tool === "eraser"} onClick={() => { setTool("eraser"); setActivePopup(null); }} title="지우개"><EraserIcon /></ToolBtn>

            <div className="w-10 h-px bg-white/10 my-1.5" />

            {/* Color picker */}
            <div className="relative">
              <ToolBtn active={activePopup === "color"} onClick={() => togglePopup("color")} title="색상">
                <div className="h-5 w-5 rounded-full ring-2 ring-white/40" style={{ backgroundColor: paintColor }} />
              </ToolBtn>
              {activePopup === "color" && (
                <div className="toolbar-popup absolute left-[calc(100%+10px)] top-1/2 z-50 w-[280px] -translate-y-1/2 rounded-2xl border border-white/15 bg-zinc-950 p-4 shadow-2xl backdrop-blur-xl" onPointerDown={(e) => e.stopPropagation()}>
                  <div className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-b border-l border-white/15 bg-zinc-950" />
                  <div className="grid grid-cols-6 gap-2.5 mb-3">
                    {PALETTE.map((c) => (
                      <button key={c} onClick={() => setPaintColor(c)} className={`h-9 w-9 rounded-full transition-all ${paintColor === c ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-zinc-950" : "hover:scale-110 opacity-80 hover:opacity-100"}`} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <label className="flex h-8 w-full cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-zinc-900/95 text-xs text-zinc-300 transition-colors hover:bg-zinc-800">
                    커스텀 색상
                    <input type="color" value={paintColor} onChange={(e) => setPaintColor(e.target.value)} className="absolute opacity-0 w-0 h-0" />
                  </label>
                </div>
              )}
            </div>

            {/* Brush size */}
            <div className="relative">
              <ToolBtn active={activePopup === "size"} onClick={() => togglePopup("size")} title="굵기">
                <span className="inline-block rounded-full bg-current" style={{ width: Math.max(4, Math.min(brushSize + 2, 12)), height: Math.max(4, Math.min(brushSize + 2, 12)) }} />
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

            <ToolBtn disabled={!drawing.canUndo} onClick={drawing.handleUndo} title="실행취소"><UndoIcon /></ToolBtn>
            <ToolBtn disabled={!drawing.canRedo} onClick={drawing.handleRedo} title="다시실행"><RedoIcon /></ToolBtn>
            <ToolBtn onClick={() => { drawing.handleClearCanvas(); setActivePopup(null); }} title="전체 지우기"><TrashIcon /></ToolBtn>
          </div>

          {/* Canvas area */}
          <div className="flex-1 flex flex-col items-center justify-start min-w-0 min-h-0 overflow-hidden p-3 pt-4 relative" onPointerDown={() => setActivePopup(null)}>

            <div className="z-10 bg-zinc-900/72 backdrop-blur-md border border-white/12 px-5 py-2.5 rounded-full shadow-xl pointer-events-none text-center shrink-0">
              <p className="text-xs font-bold text-zinc-400 mb-0.5">{config.drawingTitle}</p>
              <p className="text-sm text-zinc-200">{config.drawingDescription}</p>
            </div>

            <div className="relative h-[min(88vw,calc(100dvh-180px))] w-[min(88vw,calc(100dvh-180px))] max-h-[760px] max-w-[760px] rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-[0_16px_64px_rgba(0,0,0,0.5)] bg-white shrink-0 mt-2 mx-auto">
              <DrawingCanvas
                canvasRef={drawing.canvasRef}
                cursor={canvasCursor}
                onPointerDown={(e) => { drawing.handlePointerDown(e); setTotalStrokes(s => s + 1); }}
                onPointerMove={drawing.handlePointerMove}
                onPointerUp={drawing.handlePointerUp}
              />
            </div>
          </div>
        </div>

        {/* 3. Result phase */}
        {phase === "result" && (
          <div className="w-full h-full">
            <SingleDrawResultView
              result={latestResult!}
              reportLabel={config.reportLabel}
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
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default pointer-events-auto"
      />
      <div
        className="pointer-events-auto relative z-10 h-full w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl animate-in zoom-in-95 duration-300"
      >
        {content}
      </div>
    </div>
  );
}

export default WeeklySingleDrawView;
