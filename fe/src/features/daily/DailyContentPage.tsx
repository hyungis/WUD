import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/shared/Button";

const PALETTE = [
  { color: "#FBBF24", label: "노랑", emotion: "기쁨, 희망", gradient: "linear-gradient(135deg, #fbbf24, #fde68a)" },
  { color: "#F472B6", label: "핑크", emotion: "사랑, 설렘", gradient: "linear-gradient(135deg, #f472b6, #fbcfe8)" },
  { color: "#34D399", label: "초록", emotion: "평온, 안정", gradient: "linear-gradient(135deg, #34d399, #bbf7d0)" },
  { color: "#60A5FA", label: "파랑", emotion: "신뢰, 차분함", gradient: "linear-gradient(135deg, #60a5fa, #bae6fd)" },
  { color: "#A78BFA", label: "보라", emotion: "창의, 신비", gradient: "linear-gradient(135deg, #a78bfa, #ddd6fe)" },
  { color: "#F87171", label: "빨강", emotion: "열정, 에너지", gradient: "linear-gradient(135deg, #f87171, #fecaca)" },
];
const DAILY_FEATURES = [
  {
    id: "mandala",
    title: "만다라 그리기",
    description: "기하학 패턴으로 감정을 채워보세요.",
    enabled: true,
  },
  {
    id: "pitr",
    title: "감정 질문",
    description: "준비중",
    enabled: false,
  },
  {
    id: "story",
    title: "감정 스토리",
    description: "준비중",
    enabled: false,
  },
];


function DailyContentPage() {
  const navigate = useNavigate();
  const [shellColor, setShellColor] = useState(() => {
    return localStorage.getItem("dailyMoodColor") || PALETTE[0].color;
  });
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);

  const selectedColorObj = useMemo(() => PALETTE.find((c) => c.color === shellColor) || PALETTE[0], [shellColor]);
  const hoveredColorObj = useMemo(() => PALETTE.find((c) => c.color === hoveredColor), [hoveredColor]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-slate-100">
      <div
        className="pointer-events-none fixed inset-0 z-10 opacity-80"
        style={{ background: "radial-gradient(circle at center, transparent 20%, rgba(10, 5, 25, 0.62) 62%, #000000 95%)" }}
      />
      <div
        className="pointer-events-none fixed left-0 right-0 top-0 z-10 bg-black"
        style={{ height: "5vh", borderBottomLeftRadius: "50% 6vh", borderBottomRightRadius: "50% 6vh" }}
      />
      <div
        className="pointer-events-none fixed bottom-0 left-0 right-0 z-10 bg-black"
        style={{ height: "5vh", borderTopLeftRadius: "50% 6vh", borderTopRightRadius: "50% 6vh" }}
      />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 starfield z-20" />
      </div>

      <div className="relative z-20 mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center gap-8 px-6 py-12">
        <div className="w-full max-w-4xl rounded-3xl border border-white/10 bg-slate-950/50 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl ring-1 ring-white/10">
          <div className="flex w-full flex-col items-center gap-4 text-center">
            <div className="flex w-full items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-300">
                데일리 콘텐츠
              </span>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="liquid-btn liquid-btn--neutral px-3 py-1.5 text-xs"
              >
                닫기
              </button>
            </div>
            <div className="mt-2 flex flex-col items-center gap-3">
              <h1 className="text-3xl font-semibold text-slate-100 [font-family:'Manrope',sans-serif]">
                오늘의 콘텐츠를 선택해요
              </h1>
              <span
                className="h-4 w-4 rounded-full border-2"
                style={{ borderColor: selectedColorObj.color }}
                aria-hidden="true"
              />
            </div>
            <p className="text-sm text-slate-300">
              1차 MVP는 만다라 그리기만 제공됩니다.
            </p>
          </div>

          <section className="mt-8 w-full rounded-3xl border border-white/10 bg-slate-950/55 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl ring-1 ring-white/10 flex flex-col items-center gap-6">
            <h2 className="text-lg font-bold tracking-tight text-slate-100 mb-1">감정 색 선택</h2>
            <p className="text-sm text-slate-300 mb-2">오늘의 감정색이 행성의 껍데기를 결정합니다.</p>
            <div className="flex flex-wrap items-center justify-center gap-4 mt-2 mb-2">
              {PALETTE.map((item) => (
                <button
                  key={item.color}
                  type="button"
                  onClick={() => {
                    setShellColor(item.color);
                    localStorage.setItem("dailyMoodColor", item.color);
                  }}
                  onMouseEnter={() => setHoveredColor(item.color)}
                  onMouseLeave={() => setHoveredColor(null)}
                  onFocus={() => setHoveredColor(item.color)}
                  onBlur={() => setHoveredColor(null)}
                  className={`h-14 w-14 rounded-full border-2 transition-all duration-150 focus:outline-none relative ${shellColor === item.color
                    ? "scale-110 ring-2 ring-white"
                    : "opacity-80 hover:scale-105"
                    }`}
                  style={{
                    background: item.color,
                    border: shellColor === item.color
                      ? `3px solid ${item.color}`
                      : `2px solid ${item.color}`,
                    boxShadow: shellColor === item.color ? '0 0 0 8px rgba(255,255,255,0.08)' : 'none',
                  }}
                  aria-label={`${item.label} (${item.emotion}) 선택`}
                />
              ))}
              <div className="w-full flex justify-center min-h-[24px] mt-2">
                {(hoveredColorObj || selectedColorObj) && (
                  <span className="text-xs text-slate-200 bg-slate-900/80 border border-white/10 rounded-full px-3 py-1 transition-all duration-100">
                    {hoveredColorObj ? `${hoveredColorObj.label}: ${hoveredColorObj.emotion}` : `${selectedColorObj.label}: ${selectedColorObj.emotion}`}
                  </span>
                )}
              </div>

            </div>
          </section>

          <section className="mt-8 mb-2 grid w-full gap-6 sm:grid-cols-3">
            {DAILY_FEATURES.map((task) => (
              <button
                key={task.id}
                disabled={!task.enabled}
                onClick={() => task.enabled && navigate(task.id === "mandala" ? "/daily/detail" : `/daily/${task.id}`)}
                className={`group rounded-2xl border-2 px-6 py-7 flex flex-col items-start shadow-lg transition-all duration-150 text-left focus:outline-none ${task.enabled
                  ? "border-white/20 bg-slate-900/55 backdrop-blur-md hover:border-sky-300/60 hover:shadow-sky-500/20 hover:scale-[1.02]"
                  : "border-white/10 bg-white/5 text-slate-500 opacity-60 cursor-not-allowed"
                  }`}
              >
                <span className="text-base font-bold text-slate-100 mb-1 group-hover:text-sky-200 transition-colors duration-100">{task.title}</span>
                <span className="text-xs text-slate-300 group-hover:text-sky-100 transition-colors duration-100">{task.description}</span>
              </button>
            ))}
          </section>

          <div className="mt-4 flex items-center justify-center gap-3">
            <Button
              type="button"
              onClick={() => navigate("/daily/detail")}
              className="liquid-btn liquid-btn--daily px-8 py-3 text-lg"
            >
              시작하기
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DailyContentPage;
