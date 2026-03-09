import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/shared/Button";

const PROMPTS = [
  "오늘 마음속 하늘에는 어떤 구름이 떠 있나요?",
  "마음에 비가 내린다면, 어떤 색의 비일까요?",
  "오늘 나를 비춘 햇살의 온도를 색으로 칠해본다면?",
  "오늘의 마음은 어떤 별빛으로 빛나고 있나요?",
  "바람이 스친다면, 그 바람은 어떤 속도로 지나가나요?",
];

const PALETTE = ["#FBBF24", "#F472B6", "#34D399", "#60A5FA", "#A78BFA", "#F87171"];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getMoodColor = (value: number) => {
  if (value >= 80) return "#F472B6";
  if (value >= 60) return "#FBBF24";
  if (value >= 40) return "#34D399";
  if (value >= 20) return "#60A5FA";
  return "#64748B";
};


// 만다라 대칭선 SVG 컴포넌트
function MandalaPattern({ symmetryCount = 8 }: { symmetryCount: number }) {
  const size = 320;
  const center = size / 2;
  const radius = center - 8;
  const lines = [];
  for (let i = 0; i < symmetryCount; i++) {
    const angle = (2 * Math.PI * i) / symmetryCount;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    lines.push(
      <line
        key={i}
        x1={center}
        y1={center}
        x2={x}
        y2={y}
        stroke="#94a3b8"
        strokeWidth="1.2"
        opacity="0.35"
      />
    );
  }
  return (
    <svg
      className="mandala-pattern"
      aria-hidden="true"
      width={size}
      height={size}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    >
      <circle cx={center} cy={center} r={radius} fill="none" stroke="#94a3b8" strokeWidth="1.2" opacity="0.18" />
      {lines}
    </svg>
  );
}

function DailyPage() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const [step, setStep] = useState<"prompt" | "draw" | "result">("prompt");
  const [emotionValue, setEmotionValue] = useState(55);
  const [paintColor, setPaintColor] = useState(PALETTE[0]);
  const [brushSize, setBrushSize] = useState(4);
  const [memo, setMemo] = useState("");
  const [strokeCount, setStrokeCount] = useState(0);
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [colorUsage, setColorUsage] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  // 대칭선 개수 상태 추가 (기본값 8)
  const [symmetryCount, setSymmetryCount] = useState(8);

  const moodColor = useMemo(() => getMoodColor(emotionValue), [emotionValue]);

  useEffect(() => {
    const randomPrompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
    setPrompt(randomPrompt);
  }, []);

  useEffect(() => {
    if (step !== "draw") {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    // Resize canvas for crisp strokes on high-DPI screens.
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = paintColor;
  }, [step, brushSize, paintColor]);

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return { x: 0, y: 0 };
    }
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) {
      return;
    }
    isDrawingRef.current = true;
    const point = getPoint(event);
    lastPointRef.current = { x: point.x, y: point.y, time: Date.now() };
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    setStrokeCount((count) => count + 1);
    setColorUsage((current) => (current.includes(paintColor) ? current : [...current, paintColor]));
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !isDrawingRef.current) {
      return;
    }
    const point = getPoint(event);
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = paintColor;
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    const lastPoint = lastPointRef.current;
    if (lastPoint) {
      const dx = point.x - lastPoint.x;
      const dy = point.y - lastPoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const duration = Date.now() - lastPoint.time;
      setTotalDistance((current) => current + distance);
      setTotalDuration((current) => current + duration);
      lastPointRef.current = { x: point.x, y: point.y, time: Date.now() };
    }

  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) {
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setStrokeCount(0);
    setTotalDistance(0);
    setTotalDuration(0);
    setColorUsage([]);
  };

  const averageSpeed = totalDuration > 0 ? totalDistance / totalDuration : 0;
  const energyLabel = averageSpeed > 0.35 ? "활발" : averageSpeed > 0.2 ? "잔잔" : "느림";
  const densityLabel = strokeCount > 18 ? "밀도 높은" : strokeCount > 8 ? "부드러운" : "여백이 많은";
  const paletteLabel = colorUsage.length > 3 ? "다채로운" : colorUsage.length > 1 ? "차분한" : "단색의";
  const summaryText = `오늘은 ${paletteLabel} 색감과 ${energyLabel} 선의 흐름이 교차하는 ${densityLabel} 날씨예요.`;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 pb-[100px]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 starfield z-20" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-12">
        <div className="daily-shell w-full max-w-md">
          {step === "prompt" && (
            <div className="daily-card text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-300">
                Daily Prompt
              </p>
              <h1 className="mt-4 text-3xl font-semibold text-slate-100 [font-family:'Manrope',sans-serif]">
                오늘의 마음 날씨
              </h1>
              <p className="mt-4 text-lg text-slate-200">{prompt}</p>
              <p className="mt-3 text-sm text-slate-400">
                슬라이더로 오늘의 감정 농도를 조절해 보세요.
              </p>

              <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 px-6 py-6">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
                  <span>낮음</span>
                  <span>높음</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={emotionValue}
                  onChange={(event) => setEmotionValue(clamp(Number(event.target.value), 0, 100))}
                  className="mt-4 w-full accent-white"
                />
                <div className="mt-4 flex items-center justify-center gap-3 text-sm text-slate-200">
                  <span className="h-4 w-4 rounded-full" style={{ backgroundColor: moodColor }} />
                  감정값 {emotionValue}
                </div>
              </div>

              <div className="mt-10 flex items-center justify-center">
                <Button
                  type="button"
                  onClick={() => {
                    localStorage.setItem("dailyMoodColor", moodColor);
                    localStorage.setItem("dailyMoodValue", String(emotionValue));
                    setStep("draw");
                  }}
                >
                  시작하기
                </Button>
              </div>
            </div>
          )}

          {step === "draw" && (
            <div className="daily-card">
              <div className="flex flex-col gap-6 lg:flex-row">
                <section className="flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                        Step 02
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-slate-100">
                        만다라 위에 감정을 채워요
                      </h2>
                    </div>
                    <Button type="button" variant="secondary" onClick={handleClearCanvas}>
                      지우기
                    </Button>
                  </div>


                  <div className="mandala-surface">
                    {/* 대칭선 개수 조절 UI */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-slate-400">대칭선 개수</span>
                      <input
                        type="range"
                        min={2}
                        max={24}
                        value={symmetryCount}
                        onChange={e => setSymmetryCount(Number(e.target.value))}
                        className="w-32 accent-white"
                      />
                      <input
                        type="number"
                        min={2}
                        max={24}
                        value={symmetryCount}
                        onChange={e => {
                          const v = Number(e.target.value);
                          if (v >= 2 && v <= 24) setSymmetryCount(v);
                        }}
                        className="w-12 rounded-md border border-white/20 bg-slate-900/80 px-1.5 py-0.5 text-center text-xs text-slate-100 focus:border-white/50 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </div>
                    <MandalaPattern symmetryCount={symmetryCount} />
                    <canvas
                      ref={canvasRef}
                      className="daily-canvas"
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerLeave={handlePointerUp}
                    />
                  </div>


                  <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      {PALETTE.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setPaintColor(color)}
                          className={`h-10 w-10 rounded-full border transition ${paintColor === color
                            ? "border-white shadow-[0_0_16px_rgba(255,255,255,0.45)]"
                            : "border-white/20"
                            }`}
                          style={{ backgroundColor: color }}
                          aria-label={`${color} 선택`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between gap-4 text-xs text-slate-300">
                      <span>브러시 굵기</span>
                      <input
                        type="range"
                        min={2}
                        max={12}
                        value={brushSize}
                        onChange={(event) => setBrushSize(Number(event.target.value))}
                        className="w-full accent-white"
                      />
                    </div>
                  </div>
                </section>

                <section className="w-full space-y-4 lg:max-w-sm">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm font-semibold text-slate-100">오늘의 한 줄</p>
                    <p className="mt-2 text-xs text-slate-400">오늘 느꼈던 감정을 문장으로 정리해요.</p>
                    <textarea
                      value={memo}
                      onChange={(event) => setMemo(event.target.value)}
                      placeholder="지금의 마음을 짧게 남겨보세요."
                      rows={6}
                      className="mt-4 w-full resize-none rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-white/40 focus:outline-none"
                    />
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300">
                    기록한 감정은 별빛으로 저장되고, 이후 별자리의 재료가 됩니다.
                  </div>

                  <div className="flex items-center justify-between">
                    <Button type="button" variant="secondary" onClick={() => setStep("prompt")}>
                      이전
                    </Button>
                    <Button
                      type="button"
                      disabled={!memo.trim()}
                      onClick={() => {
                        localStorage.setItem("dailyMemo", memo.trim());
                        localStorage.setItem("dailyPaintColor", paintColor);
                        setStep("result");
                      }}
                    >
                      결과 보기
                    </Button>
                  </div>
                </section>
              </div>
            </div>
          )}

          {step === "result" && (
            <div className="daily-card text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-300">
                Unconscious Weather
              </p>
              <h2 className="mt-4 text-3xl font-semibold text-slate-100">오늘의 무의식 날씨</h2>
              <p className="mt-4 text-base text-slate-200">{summaryText}</p>
              <div className="mt-6 grid gap-4 text-sm text-slate-300 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">선의 흐름</p>
                  <p className="mt-2 text-base text-slate-100">{energyLabel}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">밀도</p>
                  <p className="mt-2 text-base text-slate-100">{densityLabel}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">색채</p>
                  <p className="mt-2 text-base text-slate-100">{paletteLabel}</p>
                </div>
              </div>

              <p className="mt-6 text-xs text-slate-400">
                결과는 참고용이며 진단이 아닙니다.
              </p>

              <div className="mt-8 flex items-center justify-center gap-3">
                <Button type="button" variant="secondary" onClick={() => setStep("draw")}>
                  다시 보기
                </Button>
                <Button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    if (isSaving) {
                      return;
                    }
                    setIsSaving(true);
                    localStorage.setItem("dailyPlanetReady", "true");
                    localStorage.setItem("dailyMoodColor", moodColor);
                    window.setTimeout(() => {
                      navigate("/dashboard");
                    }, 1200);
                  }}
                >
                  저장하고 돌아가기
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      {isSaving && (
        <div className="daily-save-overlay" aria-live="polite">
          <div className="daily-save-star" aria-hidden="true" />
          <p className="text-sm uppercase tracking-[0.35em] text-slate-200">
            별이 생성되고 있어요
          </p>
        </div>
      )}
    </div>
  );
}

export default DailyPage;
