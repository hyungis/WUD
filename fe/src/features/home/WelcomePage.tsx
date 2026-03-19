import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/shared/Button";

const TESTS = [
  {
    key: "HTP",
    title: "집-나무-사람",
    description: "첫 별을 만드는 위클리 검사입니다. 집·나무·사람의 느낌을 그려요.",
  },
  {
    key: "PITR",
    title: "빗속의 사람",
    description: "스트레스와 대처 자원을 확인하는 주간 검사입니다.",
  },
  {
    key: "SWP",
    title: "별-파도",
    description: "감정의 파형과 지향점을 별자리로 바꿉니다.",
  },
];

function WelcomePage() {
  const navigate = useNavigate();
  const [selectedTest, setSelectedTest] = useState("HTP");

  useEffect(() => {
    const shouldShowWelcome = localStorage.getItem("showWelcomeOnce") === "true";
    if (!shouldShowWelcome) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-6 py-10 text-slate-100">
      <div className="relative mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-6 py-12">
        <div className="relative w-full max-w-2xl rounded-3xl border border-cyan-200/20 bg-slate-950/80 p-10 text-center shadow-[0_30px_80px_rgba(2,6,23,0.55)] ring-1 ring-cyan-100/10 backdrop-blur-3xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.16),transparent_52%)]" />
          <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-100/75">
            Welcome
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight text-slate-100 [font-family:'Manrope',sans-serif]">
            우주드로우에 오신 것을 환영합니다.
          </h1>
          <p className="mt-3 text-base text-slate-200">
            이곳은 당신의 마음이 별이 되는 공간입니다.
          </p>
          <p className="mt-3 text-sm text-slate-300">
            첫 위클리 분석은 HTP 검사로 시작됩니다.
          </p>

          <div className="mt-8 grid gap-3 text-left">
            {TESTS.map((test) => {
              const isSelected = selectedTest === test.key;
              const isDisabled = test.key !== "HTP";
              return (
                <button
                  key={test.key}
                  type="button"
                  onClick={() => {
                    if (isDisabled) {
                      return;
                    }
                    setSelectedTest(test.key);
                  }}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${isSelected
                    ? "border-cyan-200/60 bg-cyan-300/10"
                    : "border-white/15 bg-white/5"
                    } ${isDisabled ? "cursor-not-allowed opacity-50" : "hover:border-cyan-200/35"}`}
                  aria-pressed={isSelected}
                >
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    {test.key}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-100">
                    {test.title}
                  </p>
                  <p className="mt-2 text-xs text-slate-300">
                    {test.description}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex items-center justify-center">
            <Button
              type="button"
              onClick={() => {
                localStorage.setItem("showWelcomeOnce", "false");
                localStorage.setItem("hasSeenWelcome", "true");
                navigate("/deep/htp");
              }}
            >
              HTP 시작
            </Button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WelcomePage;
