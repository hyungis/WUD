import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/shared/Button";
import { useCanvasDrawing } from "../../hooks/useCanvasDrawing";
import type { ToolType } from "../../hooks/useCanvasDrawing";
import { deepApi } from "../../api/deep";
import { imageApi } from "../../api/image";
import type { DeepDetailResponse } from "../../types/deep";
import HTPResultView from "./components/HTPResultView";
import { DrawingCanvas } from "../../components/shared/DrawingCanvas";
import { useUiStore } from "../../store/uiStore";
import { WEEKLY_LIMIT_MESSAGE, hasWeeklyDeepEntryByType } from "../../utils/dailyLimit";

type HtpStep = "house" | "tree" | "person";
type HtpPhase = "survey" | "draw" | "result";

/* ── constants ── */
const PALETTE = [
  "#111827", "#374151", "#6B7280", "#F97316", "#F59E0B", "#10B981",
  "#06B6D4", "#3B82F6", "#6366F1", "#8B5CF6", "#EC4899", "#F43F5E",
];
const WHO5_QUESTIONS = [
  "지난 2주 동안 기분이 밝고 명랑했다.",
  "지난 2주 동안 마음이 차분하고 안정적이었다.",
  "지난 2주 동안 활동적이고 활력이 있었다.",
  "지난 2주 동안 상쾌하게 잠에서 깼다.",
  "지난 2주 동안 일상생활이 흥미로웠다.",
];
const DEFAULT_SPANE_ANSWERS = [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3];
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

/* ── tiny SVG icons ── */
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
          ? "bg-white/20 text-white shadow-md shadow-white/10 scale-105"
          : "text-slate-300 hover:bg-white/10 hover:text-white"
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
  onSaved?: () => void;
};

function WeeklyHtpView({ isModal = false, onClose, onBackToWeeklyContent, onSaved }: WeeklyHtpViewProps) {
  const navigate = useNavigate();
  const addTemporaryStar = useUiStore((state) => state.addTemporaryStar);
  const refreshStarsAfterSave = useUiStore((state) => state.refreshStarsAfterSave);

  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<HtpPhase>("survey");

  const [paintColor, setPaintColor] = useState(PALETTE[0]);
  const [brushSize, setBrushSize] = useState(4);
  const [tool, setTool] = useState<ToolType>("brush");
  const [activePopup, setActivePopup] = useState<string | null>(null);

  const [totalStrokes, setTotalStrokes] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [stepDrawings, setStepDrawings] = useState<Partial<Record<HtpStep, string>>>({});
  const [who5Answers, setWho5Answers] = useState<number[]>([3, 3, 3, 3, 3]);
  const [latestResult, setLatestResult] = useState<DeepDetailResponse | null>(null);

  const currentStep = STEPS[stepIndex];

  // HTP는 대칭이 필요 없으므로 symmetry: 1 강제 고정
  const drawing = useCanvasDrawing({ paintColor, brushSize, tool, symmetry: 1 });

  // 직접 라우트 접근(/deep/htp)까지 포함해 HTP는 주 1회만 진행 가능
  useEffect(() => {
    let alive = true;

    const guardWeeklyLimit = async () => {
      try {
        const sessionsRes = await deepApi.getPastSessions();
        const history = (sessionsRes.data ?? []) as any[];
        if (!alive || !hasWeeklyDeepEntryByType(history, "HTP")) return;

        window.alert(WEEKLY_LIMIT_MESSAGE);
        if (onClose) {
          onClose();
          return;
        }
        navigate("/", { replace: true });
      } catch {
        // 조회 실패 시에는 사용을 허용해 기능 차단을 피한다.
      }
    };

    void guardWeeklyLimit();
    return () => {
      alive = false;
    };
  }, [navigate, onClose]);

  // 단계 변경 시 그림 불러오기 + 해상도 동기화 로직
  useEffect(() => {
    if (phase !== "draw") return;

    const canvas = drawing.canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // 🚨 수동 화소 강제 동기화 (ResizeObserver가 작동하기 전에도 물리 픽셀을 CSS 사이즈와 일치시킴)
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

  // 1024x1024 해상도 고정 변환 및 저장
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
      const dataUrl = exportCanvas.toDataURL("image/png");
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

    if (who5Answers.length !== 5 || who5Answers.some((answer) => answer < 0 || answer > 5)) {
      setSaveError("WHO-5 문항 5개 점수를 모두 선택해주세요.");
      return;
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

    try {
      const houseImageId = await uploadDrawingAndCreateImage(drawings.house!);
      const treeImageId = await uploadDrawingAndCreateImage(drawings.tree!);
      const personImageId = await uploadDrawingAndCreateImage(drawings.person!);

      const sessionRes = await deepApi.createSession();
      const sessionId = sessionRes.data?.sessionId;
      if (!sessionId) {
        throw new Error("세션 생성에 실패했습니다.");
      }

      localStorage.setItem("latestDeepSessionId", String(sessionId));
      await deepApi.submitWho5Assessment(sessionId, { answers: who5Answers });
      await deepApi.submitSpaneAssessment(sessionId, { answers: DEFAULT_SPANE_ANSWERS });
      await deepApi.submitSubmissions(sessionId, { houseImageId, treeImageId, personImageId });

      addTemporaryStar({
        kind: "DEEP",
        createdAt: new Date().toISOString(),
        color: toneColor,
        targetId: sessionId,
      });
      refreshStarsAfterSave(sessionId, "DEEP");

      const pollingResult = await waitUntilAnalysisDone(sessionId);
      if (pollingResult === "DONE") {
        const resultRes = await deepApi.getDeepResult(sessionId);
        if (resultRes.success && resultRes.data) {
          setLatestResult(resultRes.data);
          localStorage.setItem("latestDeepResultSummary", resultRes.data.aiResult.resultSummary || resultRes.data.aiResult.result || "");
          localStorage.setItem("latestDeepResult", JSON.stringify(resultRes.data));

          if (isModal && onClose) {
            setIsSaving(false);
            onSaved?.();
            onClose();
            return;
          }

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
      setSaveError("위클리 저장에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
    setIsSaving(false);
  };

  const canvasCursor = tool === "fill" ? "crosshair" : tool === "eraser" ? "cell" : "default";

  const content = (
    <div
      className="flex flex-col h-[100dvh] w-full overflow-hidden bg-zinc-950/86 text-zinc-100 relative"
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('.toolbar-area, .toolbar-popup')) return;
        setActivePopup(null);
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.32)_0%,rgba(0,0,0,0.50)_100%)]" />

      {/* ─── 헤더 (컴팩트 1줄) ─── */}
      <header className="shrink-0 flex items-center justify-between px-4 h-12 border-b border-white/[0.08] z-10 bg-zinc-900/56 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={handleBackToWeeklyContent}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-sm font-medium text-zinc-300">위클리 HTP 검사</span>
        </div>
        <div className="flex items-center gap-2">
          {phase === "draw" && (
            <>
              {stepIndex > 0 && (
                <button type="button" onClick={handlePrevStep} className="h-8 px-4 rounded-xl bg-white/6 text-zinc-300 text-xs font-semibold hover:bg-white/12 transition-colors">
                  뒤로
                </button>
              )}
              <button type="button" onClick={handleNextStep}
                className="h-8 px-4 rounded-xl bg-white/15 text-white text-xs font-semibold shadow-lg shadow-white/10 hover:bg-white/25 transition-colors">
                {stepIndex === STEPS.length - 1 ? "저장" : "다음"}
              </button>
            </>
          )}
          {isModal && (
            <button
              type="button"
              onClick={handleClose}
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

        {/* 🚨 1. 설문 단계 */}
        {phase === "survey" && (
          <div className="h-full w-full min-h-0 overflow-y-auto custom-scrollbar p-6 flex justify-center">
            <div className="w-full max-w-xl text-center space-y-8 pb-12">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-400">Pre-Assessment</p>
                <h2 className="mt-4 text-3xl font-semibold text-zinc-100">위클리 검사 전 설문</h2>
                <p className="mt-3 text-sm text-zinc-300">최근 2주간의 기분을 솔직하게 선택해 주세요.</p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-zinc-900/72 p-5 text-left backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">WHO-5 (0-5)</p>
                <div className="mt-4 space-y-3">
                  {WHO5_QUESTIONS.map((question, index) => (
                    <div key={question} className="rounded-xl border border-white/12 bg-white/[0.04] p-3">
                      <p className="text-sm text-zinc-200">{index + 1}. {question}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {[0, 1, 2, 3, 4, 5].map((score) => (
                          <button
                            key={`${question}-${score}`} type="button"
                            onClick={() => setWho5Answers((curr) => { const next = [...curr]; next[index] = score; return next; })}
                            className={`rounded-lg px-4 py-2 text-xs transition font-medium ${who5Answers[index] === score ? "bg-white/20 text-white shadow-lg" : "bg-white/6 text-zinc-300 hover:bg-white/12"}`}
                          >
                            {score}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex w-full items-center justify-end">
                <Button type="button" className="liquid-btn liquid-btn--neutral px-6 py-2.5" onClick={() => setPhase("draw")}>다음 단계</Button>
              </div>
            </div>
          </div>
        )}

        {/* 🚨 2. 그리기 단계 (CSS hidden을 사용하여 렌더링 타이밍 버그 해결) */}
        <div className={`w-full h-full flex flex-row ${phase === "draw" ? "flex" : "hidden"}`}>

          {/* 좌측 세로 툴바 */}
          <div className="toolbar-area shrink-0 flex flex-col items-center w-20 py-3 gap-1.5 bg-zinc-900/66 border-r border-white/[0.08] z-40 overflow-visible backdrop-blur-md">
            <ToolBtn active={tool === "brush"} onClick={() => { setTool("brush"); setActivePopup(null); }} title="브러시"><BrushIcon /></ToolBtn>
            <ToolBtn active={tool === "fill"} onClick={() => { setTool("fill"); setActivePopup(null); }} title="채우기"><FillIcon /></ToolBtn>
            <ToolBtn active={tool === "eraser"} onClick={() => { setTool("eraser"); setActivePopup(null); }} title="지우개"><EraserIcon /></ToolBtn>

            <div className="w-10 h-px bg-white/10 my-1.5" />

            {/* 색상 */}
            <div className="relative">
              <ToolBtn active={activePopup === "color"} onClick={() => togglePopup("color")} title="색상">
                <div className="h-5 w-5 rounded-full ring-2 ring-white/40" style={{ backgroundColor: paintColor }} />
              </ToolBtn>
              {activePopup === "color" && (
                <div className="toolbar-popup absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 w-[280px] bg-zinc-950 border border-white/15 p-4 rounded-2xl shadow-2xl backdrop-blur-xl z-50" onPointerDown={(e) => e.stopPropagation()}>
                  <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 bg-zinc-950 border-l border-b border-white/15" />
                  <div className="grid grid-cols-6 gap-2.5 mb-3">
                    {PALETTE.map((c) => (
                      <button key={c} onClick={() => setPaintColor(c)} className={`h-9 w-9 rounded-full transition-all ${paintColor === c ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-zinc-950" : "hover:scale-110 opacity-80 hover:opacity-100"}`} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <label className="flex items-center justify-center w-full h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer text-xs text-zinc-400 transition-colors">
                    커스텀 색상
                    <input type="color" value={paintColor} onChange={(e) => setPaintColor(e.target.value)} className="absolute opacity-0 w-0 h-0" />
                  </label>
                </div>
              )}
            </div>

            {/* 굵기 */}
            <div className="relative">
              <ToolBtn active={activePopup === "size"} onClick={() => togglePopup("size")} title="굵기">
                <span className="inline-block rounded-full bg-current" style={{ width: Math.max(4, Math.min(brushSize + 2, 12)), height: Math.max(4, Math.min(brushSize + 2, 12)) }} />
              </ToolBtn>
              {activePopup === "size" && (
                <div className="toolbar-popup absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 w-56 bg-zinc-950 border border-white/15 p-4 rounded-2xl shadow-2xl backdrop-blur-xl z-50" onPointerDown={(e) => e.stopPropagation()}>
                  <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 bg-zinc-950 border-l border-b border-white/15" />
                  <div className="flex justify-between items-center mb-2.5 text-xs text-zinc-400">
                    <span>굵기</span><span className="text-zinc-300 font-bold">{brushSize}px</span>
                  </div>
                  <input type="range" min="1" max="30" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-full h-2 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-zinc-400" />
                </div>
              )}
            </div>

            <div className="w-10 h-px bg-white/10 my-1.5" />

            {/* 실행취소 / 다시실행 / 전체삭제 */}
            <ToolBtn disabled={!drawing.canUndo} onClick={drawing.handleUndo} title="실행취소"><UndoIcon /></ToolBtn>
            <ToolBtn disabled={!drawing.canRedo} onClick={drawing.handleRedo} title="다시실행"><RedoIcon /></ToolBtn>
            <ToolBtn onClick={() => { drawing.handleClearCanvas(); setActivePopup(null); }} title="전체 지우기"><TrashIcon /></ToolBtn>
          </div>

          {/* 캔버스 영역 */}
          <div className="flex-1 flex flex-col items-center justify-center min-w-0 min-h-0 overflow-hidden p-4 relative" onPointerDown={() => setActivePopup(null)}>

            {/* 가이드 메시지 */}
            <div className="absolute top-4 z-10 bg-zinc-900/72 backdrop-blur-md border border-white/12 px-5 py-2.5 rounded-full shadow-xl pointer-events-none text-center">
              <p className="text-xs font-bold text-zinc-400 mb-0.5">Step {stepIndex + 1}. {currentStep.title}</p>
              <p className="text-sm text-zinc-200">{currentStep.description}</p>
            </div>

            {/* 캔버스 래퍼 - 🚨 max-w 제거 및 유연한 높이/너비 적용 */}
            <div className="relative w-full max-w-[min(90vw,700px)] aspect-square rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-[0_16px_64px_rgba(0,0,0,0.5)] bg-white shrink-0 mt-8 mx-auto">
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

        {/* 🚨 3. 결과 단계 */}
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
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/78 backdrop-blur-sm px-4 py-4 text-zinc-100">
      <button type="button" aria-label="모달 닫기" onClick={handleClose} className="absolute inset-0 h-full w-full cursor-default" />
      <div className="relative z-10 w-full max-w-7xl h-[94vh] overflow-hidden rounded-3xl border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
        {content}
      </div>
    </div>
  );
}

export default WeeklyHtpView;