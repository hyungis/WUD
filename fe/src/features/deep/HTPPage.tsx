import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/shared/Button";
import { deepApi } from "../../api/deep";
import { imageApi } from "../../api/image";
import type { DeepDetailResponse } from "../../types/deep";
import HTPResultView from "./components/HTPResultView";
import { getToolCursor } from "../../utils/toolCursors";
import { DEFAULT_PAINT_COLOR, PAINT_PRESET_COLORS, addRecentPaintColor, getRecentPaintColors, pushRecentPaintColor, saveRecentPaintColors } from "../../utils/paintColors";

type HtpStep = "house" | "tree" | "person";
type HtpPhase = "survey" | "draw" | "result";
const BRUSH_PRESETS = [2, 4, 6, 8, 12];
const WHO5_QUESTIONS = [
  "지난 2주 동안 기분이 밝고 명랑했다.",
  "지난 2주 동안 마음이 차분하고 안정적이었다.",
  "지난 2주 동안 활동적이고 활력이 있었다.",
  "지난 2주 동안 상쾌하게 잠에서 깼다.",
  "지난 2주 동안 일상생활이 흥미로웠다.",
];
const POLLING_INTERVAL_MS = 4000;
const POLLING_MAX_TRIES = 30;

type ToolType = "brush" | "fill" | "eraser";

function floodFill(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  fillColor: string,
  tolerance = 32,
) {
  const canvas = ctx.canvas;
  const w = canvas.width;
  const h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  const tmp = document.createElement("canvas");
  tmp.width = tmp.height = 1;
  const tctx = tmp.getContext("2d")!;
  tctx.fillStyle = fillColor;
  tctx.fillRect(0, 0, 1, 1);
  const [fr, fg, fb, fa] = tctx.getImageData(0, 0, 1, 1).data;

  const sx = Math.round(startX);
  const sy = Math.round(startY);
  if (sx < 0 || sy < 0 || sx >= w || sy >= h) return;

  const idx = (sy * w + sx) * 4;
  const sr = data[idx], sg = data[idx + 1], sb = data[idx + 2], sa = data[idx + 3];
  if (sr === fr && sg === fg && sb === fb && sa === fa) return;

  const match = (i: number) =>
    Math.abs(data[i] - sr) <= tolerance &&
    Math.abs(data[i + 1] - sg) <= tolerance &&
    Math.abs(data[i + 2] - sb) <= tolerance &&
    Math.abs(data[i + 3] - sa) <= tolerance;

  const stack = [sx, sy];
  const visited = new Uint8Array(w * h);

  while (stack.length > 0) {
    const cy = stack.pop()!;
    const cx = stack.pop()!;
    const pi = cy * w + cx;
    if (visited[pi]) continue;
    visited[pi] = 1;
    const ci = pi * 4;
    if (!match(ci)) continue;
    data[ci] = fr;
    data[ci + 1] = fg;
    data[ci + 2] = fb;
    data[ci + 3] = fa;
    if (cx > 0) stack.push(cx - 1, cy);
    if (cx < w - 1) stack.push(cx + 1, cy);
    if (cy > 0) stack.push(cx, cy - 1);
    if (cy < h - 1) stack.push(cx, cy + 1);
  }
  ctx.putImageData(imageData, 0, 0);
}

const BrushIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" />
  </svg>
);
const FillIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z" /><path d="m5 2 5 5" /><path d="M2 13h15" /><path d="M22 20c0 .8-.7 1.7-1.5 1.7S19 20.8 19 20s1.5-2.8 1.5-2.8S22 19.2 22 20Z" />
  </svg>
);
const EraserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" /><path d="M22 21H7" /><path d="m5 11 9 9" />
  </svg>
);
const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
);

function ToolBtn({
  active, onClick, children, title,
}: { active?: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      tabIndex={-1}
      title={title}
      className={`flex items-center justify-center rounded-lg px-2.5 py-2 text-xs transition-all duration-150 ${active
        ? "bg-indigo-500/30 text-indigo-200 ring-1 ring-indigo-400/50 shadow-[0_0_10px_rgba(99,102,241,0.25)]"
        : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
        }`}
    >
      {children}
    </button>
  );
}

type StepConfig = {
  key: HtpStep;
  title: string;
  description: string;
};

const STEPS: StepConfig[] = [
  {
    key: "house",
    title: "집",
    description: "지금 떠오르는 집의 분위기를 편하게 그려보세요.",
  },
  {
    key: "tree",
    title: "나무",
    description: "당신의 에너지가 느껴지는 나무를 그려보세요.",
  },
  {
    key: "person",
    title: "사람",
    description: "지금의 나를 떠올리며 사람을 그려보세요.",
  },
];

type HTPPageProps = {
  isModal?: boolean;
  onClose?: () => void;
  onBackToDeepContent?: () => void;
};

function HTPPage({ isModal = false, onClose, onBackToDeepContent }: HTPPageProps) {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<HtpPhase>("survey");
  const [paintColor, setPaintColor] = useState<string>(DEFAULT_PAINT_COLOR);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [brushSize, setBrushSize] = useState(4);
  const [tool, setTool] = useState<ToolType>("brush");
  const [strokeCount, setStrokeCount] = useState(0);
  const [totalStrokes, setTotalStrokes] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [stepDrawings, setStepDrawings] = useState<Partial<Record<HtpStep, string>>>({});
  const [who5Answers, setWho5Answers] = useState<number[]>([3, 3, 3, 3, 3]);
  const [latestResult, setLatestResult] = useState<DeepDetailResponse | null>(null);
  const customColorCommitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const stored = getRecentPaintColors();
    if (stored.length > 0) {
      setRecentColors(stored);
      return;
    }
    const seeded = addRecentPaintColor(paintColor, []);
    saveRecentPaintColors(seeded);
    setRecentColors(seeded);
  }, []);

  const selectPaintColor = (color: string) => {
    setPaintColor(color);
    const nextRecent = pushRecentPaintColor(color);
    setRecentColors(nextRecent);
  };

  const lastInputColorRef = useRef<string | null>(null);

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

  const flushCustomColorCommit = () => {
    if (customColorCommitTimerRef.current !== null) {
      window.clearTimeout(customColorCommitTimerRef.current);
      customColorCommitTimerRef.current = null;
    }
    saveLastInputColor();
  };

  useEffect(() => {
    return () => {
      if (customColorCommitTimerRef.current !== null) {
        window.clearTimeout(customColorCommitTimerRef.current);
      }
    };
  }, []);

  const currentStep = STEPS[stepIndex];

  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const savedDrawing = stepDrawings[currentStep.key];
      if (savedDrawing) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, rect.width, rect.height);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, rect.width, rect.height);
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
        };
        img.src = savedDrawing;
      }
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [currentStep.key, phase, stepDrawings]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = paintColor;
  }, [brushSize, paintColor]);

  const getPoint = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    const transform = ctx?.getTransform();
    const transformX = transform?.a || 1;
    const transformY = transform?.d || 1;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (event.clientX - rect.left) * (scaleX / transformX),
      y: (event.clientY - rect.top) * (scaleY / transformY),
    };
  }, []);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    flushCustomColorCommit();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    if (tool === "fill") {
      const dpr = window.devicePixelRatio || 1;
      const point = getPoint(event);
      floodFill(ctx, point.x * dpr, point.y * dpr, paintColor);
      return;
    }

    isDrawingRef.current = true;
    lastPointRef.current = getPoint(event);
  }, [tool, paintColor, getPoint, recentColors]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !isDrawingRef.current) return;
    const point = getPoint(event);
    const lastPoint = lastPointRef.current;
    if (!lastPoint) {
      lastPointRef.current = point;
      return;
    }

    if (tool === "eraser") {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = brushSize * 2;
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.lineWidth = brushSize;
      ctx.strokeStyle = paintColor;
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
    setStrokeCount((count) => count + 1);
    setTotalStrokes((count) => count + 1);
    lastPointRef.current = point;
  }, [tool, brushSize, paintColor, getPoint]);

  const handlePointerUp = useCallback(() => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  }, []);

  const handleClearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setStrokeCount(0);
  }, []);

  const canvasCursor = getToolCursor(tool, paintColor, 18 + brushSize * 2);

  const persistCurrentStepDrawing = useCallback(() => {
    const originalCanvas = canvasRef.current;
    if (!originalCanvas) return null;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = 1024;
    exportCanvas.height = 1024;
    const exportCtx = exportCanvas.getContext("2d");
    if (!exportCtx) return null;

    exportCtx.fillStyle = "#ffffff";
    exportCtx.fillRect(0, 0, 1024, 1024);
    exportCtx.drawImage(originalCanvas, 0, 0, 1024, 1024);

    const dataUrl = exportCanvas.toDataURL("image/jpeg", 0.6);
    setStepDrawings((current) => ({
      ...current,
      [currentStep.key]: dataUrl,
    }));
    return dataUrl;
  }, [currentStep.key]);

  const uploadDrawingAndCreateImage = useCallback(async (dataUrl: string) => {
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

    return imageId;
  }, []);

  const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

  const waitUntilAnalysisDone = useCallback(async (sessionId: number) => {
    for (let attempt = 0; attempt < POLLING_MAX_TRIES; attempt += 1) {
      const statusRes = await deepApi.getAnalysisStatus(sessionId);
      const status = statusRes.data?.status;
      localStorage.setItem("latestDeepStatus", status || "ANALYZING");

      if (status === "DONE") {
        return "DONE" as const;
      }
      if (status === "FAILED") {
        return "FAILED" as const;
      }

      await sleep(POLLING_INTERVAL_MS);
    }

    return "TIMEOUT" as const;
  }, []);

  const handleNext = () => {
    persistCurrentStepDrawing();
    if (stepIndex < STEPS.length - 1) {
      setStepIndex((current) => current + 1);
      return;
    }
    handleSave();
  };

  const handleSave = async () => {
    if (isSaving) {
      return;
    }
    setSaveError(null);
    const getWeekKey = (date: Date) => {
      const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const day = target.getUTCDay() || 7;
      target.setUTCDate(target.getUTCDate() + 4 - day);
      const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      return `${target.getUTCFullYear()}-W${weekNo}`;
    };
    const getWeekLabel = (date: Date) => {
      const month = date.getMonth() + 1;
      const weekOfMonth = Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7);
      return `${month}월 ${weekOfMonth}주`;
    };
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
    const createdAt = new Date();
    const drawingImage = finalDataUrl ?? null;
    const nextStar = {
      id: `star-${Date.now()}`,
      createdAt: createdAt.toISOString(),
      weekKey: getWeekKey(createdAt),
      label: getWeekLabel(createdAt),
      tone: toneLabel,
      toneColor,
      strokes: totalStrokes,
      drawingImage,
    };
    const storedStars = localStorage.getItem("deepStars");
    const parsedStars = storedStars ? (JSON.parse(storedStars) as typeof nextStar[]) : [];
    const nextStars = [nextStar, ...parsedStars].slice(0, 24);
    localStorage.setItem("deepStars", JSON.stringify(nextStars));
    localStorage.setItem("htpToneColor", toneColor);
    localStorage.setItem("htpCompleted", "true");
    localStorage.setItem("pendingHtpRecord", JSON.stringify({
      weekKey: nextStar.weekKey,
      label: nextStar.label,
      tone: nextStar.tone,
      toneColor: nextStar.toneColor,
      strokes: nextStar.strokes,
      drawingImage,
      createdAt: nextStar.createdAt,
    }));

    try {
      const houseImageId = await uploadDrawingAndCreateImage(drawings.house);
      const treeImageId = await uploadDrawingAndCreateImage(drawings.tree);
      const personImageId = await uploadDrawingAndCreateImage(drawings.person);

      const sessionRes = await deepApi.createSession();
      const sessionId = sessionRes.data?.sessionId;
      if (sessionId) {
        localStorage.setItem("latestDeepSessionId", String(sessionId));

        await deepApi.submitWho5Assessment(sessionId, {
          answers: who5Answers,
        });

        await deepApi.submitSubmissions(sessionId, {
          houseImageId,
          treeImageId,
          personImageId,
        });

        const pollingResult = await waitUntilAnalysisDone(sessionId);
        if (pollingResult === "DONE") {
          const resultRes = await deepApi.getDeepResult(sessionId);
          if (resultRes.success && resultRes.data) {
            setLatestResult(resultRes.data);
            const resultSummary = resultRes.data.aiResult.resultSummary || resultRes.data.aiResult.result || "";
            localStorage.setItem("latestDeepResultSummary", resultSummary);
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
      }
    } catch (error) {
      console.error("deep submit failed", error);
      setSaveError("심층 API 저장에 실패해 로컬 저장 결과로 이동합니다.");
    }
    setIsSaving(false);
    window.setTimeout(() => {
      navigate("/", { replace: true });
    }, 1400);
  };



  const progressLabel = useMemo(() => `${stepIndex + 1} / ${STEPS.length}`, [stepIndex]);
  const progressPercent = phase === "result" ? 100 : ((stepIndex + 1) / STEPS.length) * 100;
  const strokeDensity = Math.min(100, Math.round((brushSize / 12) * 100));

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

  const handleBackToDeepContent = () => {
    if (onBackToDeepContent) {
      onBackToDeepContent();
      return;
    }

    navigate("/deep/content");
  };

  const content = (
    <div className="relative h-[100dvh] overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 starfield z-20" />
      </div>

      <div className="relative mx-auto flex h-full w-full max-w-none min-h-0 flex-col gap-4 px-3 py-4 sm:px-6 sm:py-6">
        <header className="shrink-0">
          <div className="flex items-start justify-between gap-4 text-center sm:text-left">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-300">
                HTP Session
              </p>
              <h1 className="mt-3 text-2xl font-semibold text-slate-100 [font-family:'Manrope',sans-serif]">
                별을 만드는 시간
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                참고용 결과를 위한 검사이며, 진단이 아닙니다.
              </p>
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
        </header>

        <section className="htp-card flex-1 min-h-0 overflow-hidden">
          {phase === "survey" ? (
            <div className="h-full min-h-0 w-full max-w-3xl mx-auto space-y-6 overflow-y-auto text-center custom-scrollbar pr-1 pb-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-300">
                  Pre-Assessment
                </p>
                <h2 className="mt-4 text-3xl font-semibold text-slate-100">
                  심층 검사 전 설문
                </h2>
                <p className="mt-3 text-sm text-slate-300">
                  최근 2주간의 기분을 솔직하게 선택해 주세요.
                </p>
              </div>

              <div className="rounded-2xl border border-white/12 bg-white/[0.06] p-4 text-left">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">WHO-5 (0-5)</p>
                <div className="mt-3 space-y-2.5">
                  {WHO5_QUESTIONS.map((question, index) => (
                    <div key={question} className="rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2.5">
                      <p className="text-sm text-slate-200">{index + 1}. {question}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {[0, 1, 2, 3, 4, 5].map((score) => (
                          <button
                            key={`${question}-${score}`}
                            type="button"
                            onClick={() => {
                              setWho5Answers((current) => {
                                const next = [...current];
                                next[index] = score;
                                return next;
                              });
                            }}
                            className={`rounded-lg px-3 py-1.5 text-xs transition ${who5Answers[index] === score
                              ? "bg-white/20 text-white ring-1 ring-white/35"
                              : "bg-white/6 text-slate-300 hover:bg-white/12"
                              }`}
                          >
                            {score}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <Button type="button" variant="secondary" onClick={handleBackToDeepContent}>
                  취소
                </Button>
                <Button type="button" onClick={() => setPhase("draw")}>
                  검사 시작하기
                </Button>
              </div>
            </div>
          ) : phase === "draw" ? (
            <div className="flex h-full min-h-0 flex-col gap-3">
              <div className="shrink-0 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-[170px]">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Step {progressLabel}</p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-100">{currentStep.title} 그리기</h2>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="mr-1 text-[11px] font-medium uppercase tracking-widest text-slate-500">도구</span>
                    <ToolBtn active={tool === "brush"} onClick={() => setTool("brush")} title="브러시">
                      <BrushIcon />
                    </ToolBtn>
                    <ToolBtn active={tool === "fill"} onClick={() => setTool("fill")} title="채우기">
                      <FillIcon />
                    </ToolBtn>
                    <ToolBtn active={tool === "eraser"} onClick={() => setTool("eraser")} title="지우개">
                      <EraserIcon />
                    </ToolBtn>
                  </div>

                  <div className="h-6 w-px bg-white/10" />

                  <div className="flex items-center gap-1.5">
                    <span className="mr-1 text-[11px] font-medium uppercase tracking-widest text-slate-500">굵기</span>
                    {BRUSH_PRESETS.map((value) => (
                      <ToolBtn key={value} active={brushSize === value} onClick={() => setBrushSize(value)}>
                        <span className="flex items-center gap-1">
                          <span
                            className="inline-block rounded-full bg-current"
                            style={{ width: Math.min(value + 2, 14), height: Math.min(value + 2, 14) }}
                          />
                          <span className="text-[10px]">{value}</span>
                        </span>
                      </ToolBtn>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="mr-1 text-[11px] font-medium uppercase tracking-widest text-slate-500">색상</span>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap gap-2.5">
                        {PAINT_PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => selectPaintColor(color)}
                            onMouseDown={(event) => event.preventDefault()}
                            tabIndex={-1}
                            className={`h-6 w-6 rounded-full border-2 transition-all duration-150 ${paintColor === color
                              ? "border-white shadow-[0_0_10px_rgba(255,255,255,0.4)]"
                              : "border-transparent hover:border-white/30"
                              }`}
                            style={{ backgroundColor: color }}
                            aria-label={`${color} 선택`}
                          />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2.5 min-h-6">
                        {recentColors.length > 0 ? recentColors.map((color) => (
                          <button
                            key={`recent-${color}`}
                            type="button"
                            onClick={() => selectPaintColor(color)}
                            onMouseDown={(event) => event.preventDefault()}
                            tabIndex={-1}
                            className={`h-6 w-6 rounded-full border-2 transition-all duration-150 ${paintColor === color
                              ? "border-white shadow-[0_0_10px_rgba(255,255,255,0.4)]"
                              : "border-white/10 hover:border-white/30"
                              }`}
                            style={{ backgroundColor: color }}
                            aria-label={`${color} 선택`}
                          />
                        )) : <span className="text-[10px] text-slate-500">최근 색상 없음</span>}
                        <input
                          type="color"
                          value={paintColor}
                          onInput={(event) => handleCustomColorInput((event.target as HTMLInputElement).value)}
                          onBlur={flushCustomColorCommit}
                          className="h-6 w-6 cursor-pointer rounded-full border-2 border-dashed border-white/20 bg-transparent transition hover:border-white/40"
                          aria-label="커스텀 색상"
                          title="커스텀 색상"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleClearCanvas}
                      onMouseDown={(event) => event.preventDefault()}
                      tabIndex={-1}
                      className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-400 transition hover:bg-red-500/15 hover:text-red-300"
                      title="전체 지우기"
                    >
                      <TrashIcon />
                      지우기
                    </button>
                  </div>
                </div>
              </div>

              <div className="mandala-surface mandala-surface-white relative z-30 flex-1 min-h-0 overflow-hidden" style={{ isolation: "isolate" }}>
                <canvas
                  ref={canvasRef}
                  className="daily-canvas h-full w-full touch-none"
                  style={{ cursor: canvasCursor, backgroundColor: "#ffffff" }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                />
              </div>

              <div className="shrink-0 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="flex-1 text-xs text-slate-300">{currentStep.description} · 현재 선의 수 {strokeCount}</p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (stepIndex === 0) {
                      setPhase("survey");
                      return;
                    }
                    setStepIndex((current) => current - 1);
                  }}
                >
                  이전
                </Button>
                <Button type="button" onClick={handleNext}>{stepIndex === STEPS.length - 1 ? "완료" : "다음"}</Button>
              </div>
            </div>
          ) : (
            <HTPResultView 
              result={latestResult || {
                sessionId: 0,
                deepType: "HTP",
                status: "DONE",
                submissions: [],
                questions: [],
                aiResult: { 
                  result: "분석 데이터를 불러올 수 없습니다.",
                  raw: {}
                },
                psychAssessments: []
              }}
              onRestart={() => setPhase("draw")}
              onComplete={() => {
                if (onClose) {
                  onClose();
                  return;
                }
                navigate("/", { replace: true });
              }}
              saveError={saveError}
            />
          )}
        </section>

        <div className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
          <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.28em] text-slate-400">
            <span>Progress</span>
            <span>{phase === "result" ? "완료" : `굵기 ${brushSize}px`}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-all duration-300 ${phase === "result" ? "bg-gradient-to-r from-zinc-300 to-zinc-100" : "bg-gradient-to-r from-zinc-500 to-zinc-300"}`}
              style={{ width: `${phase === "result" ? progressPercent : (phase === "survey" ? 0 : strokeDensity)}%` }}
            />
          </div>
        </div>
      </div>
      {isSaving && (
        <div className="htp-save-overlay" aria-live="polite">
          <div className="htp-save-star" aria-hidden="true" />
          <p className="text-sm uppercase tracking-[0.35em] text-slate-200">
            별이 생성되고 있어요
          </p>
        </div>
      )}
    </div>
  );

  if (!isModal) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-[92] flex items-center justify-center bg-black/78 px-4 py-4 text-slate-100">
      <button
        type="button"
        aria-label="모달 닫기"
        onClick={handleClose}
        className="absolute inset-0 h-full w-full cursor-default"
      />
      <div className="relative z-10 h-[94vh] w-full max-w-7xl overflow-hidden rounded-3xl border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.58)] ring-1 ring-white/10">
        {content}
      </div>
    </div>
  );
}

export default HTPPage;
