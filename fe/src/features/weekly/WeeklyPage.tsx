import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/shared/Button";

const WEEKLY_TESTS = [
  {
    key: "PITR",
    title: "빗속의 사람",
    description: "준비중",
    path: "",
    enabled: false,
  },
  {
    key: "SWP",
    title: "별-파도",
    description: "준비중",
    path: "",
    enabled: false,
  },
  {
    key: "HTP",
    title: "집-나무-사람",
    description: "행성 지형, 에너지 트리, 위성을 합쳐 한 주의 행성을 완성합니다.",
    path: "/deep/htp",
    enabled: true,
  },
];

function WeeklyPage() {
  const navigate = useNavigate();
  const ringColor = useMemo(() => {
    return localStorage.getItem("dailyMoodColor") || "#60A5FA";
  }, []);

  return (
    <div className="scrollbar-hidden relative h-screen overflow-y-auto bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 starfield z-20" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center gap-10 px-6 py-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-300">
            Weekly Constellation
          </p>
          <h1 className="text-3xl font-semibold text-slate-100 [font-family:'Manrope',sans-serif]">
            한 주의 별자리를 완성해요
          </h1>
          <p className="text-sm text-slate-300">
            일주일 기록이 연결되면 위클리 별이 탄생합니다.
          </p>
        </div>

        <div className="constellation-card w-full">
          <div className="flex flex-col gap-6 lg:flex-row">
            <section className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Progress
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-100">
                이번 주의 별빛 흐름
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                데일리 별 7개가 모이면 얇은 빛의 선이 연결됩니다.
              </p>
              <div className="mt-6 flex items-center gap-4">
                <div
                  className="relative h-16 w-16 rounded-full border-4"
                  style={{ borderColor: ringColor }}
                />
                <div className="text-sm text-slate-300">
                  <p className="text-slate-100">현재 3/7</p>
                  <p className="mt-1 text-xs text-slate-400">기록을 이어가 별자리를 완성하세요.</p>
                </div>
              </div>
              <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[42%] rounded-full bg-gradient-to-r from-sky-400 to-indigo-400" />
              </div>
            </section>

            <section className="constellation-canvas">
              {/* SVG is used for clean constellation strokes. */}
              <svg viewBox="0 0 360 280" role="img" aria-label="별자리 미리보기">
                <circle cx="60" cy="70" r="6" fill="#ffffff" />
                <circle cx="130" cy="40" r="4" fill="#e2e8f0" />
                <circle cx="210" cy="90" r="5" fill="#f8fafc" />
                <circle cx="270" cy="140" r="4" fill="#e2e8f0" />
                <circle cx="200" cy="200" r="5" fill="#ffffff" />
                <circle cx="110" cy="210" r="4" fill="#e2e8f0" />
                <line x1="60" y1="70" x2="130" y2="40" stroke="#94a3b8" strokeWidth="1.2" />
                <line x1="130" y1="40" x2="210" y2="90" stroke="#94a3b8" strokeWidth="1.2" />
                <line x1="210" y1="90" x2="270" y2="140" stroke="#94a3b8" strokeWidth="1.2" />
                <line x1="270" y1="140" x2="200" y2="200" stroke="#94a3b8" strokeWidth="1.2" />
                <line x1="200" y1="200" x2="110" y2="210" stroke="#94a3b8" strokeWidth="1.2" />
              </svg>
              <div className="constellation-glow" />
            </section>
          </div>
        </div>

        <div className="grid w-full gap-4 lg:grid-cols-3">
          {WEEKLY_TESTS.map((test) => (
            <button
              key={test.key}
              type="button"
              disabled={!test.enabled}
              onClick={() => test.enabled && navigate(test.path)}
              className={`rounded-2xl border p-5 text-left backdrop-blur transition ${test.enabled
                ? "border-white/15 bg-white/5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] hover:border-white/30"
                : "cursor-not-allowed border-white/10 bg-white/5 opacity-60"
                }`}
            >
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{test.key}</p>
              <p className="mt-2 text-sm font-semibold text-slate-100">{test.title}</p>
              <p className="mt-2 text-sm text-slate-300">{test.description}</p>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <Button type="button" onClick={() => navigate("/dashboard")}>
            메인으로
          </Button>
        </div>
      </div>
    </div>
  );
}

export default WeeklyPage;
