import { useNavigate } from "react-router-dom";
import Button from "../../components/shared/Button";
function WeeklyColorPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 starfield z-20" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center gap-6 px-6 py-12 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-300">
          Daily 02
        </p>
        <h1 className="text-3xl font-semibold text-slate-100 [font-family:'Manrope',sans-serif]">
          색으로 감정을 채워보세요.
        </h1>
        <p className="text-sm text-slate-300">
          여기에서 주간 행성을 색칠하는 흐름을 추가할 예정입니다.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <Button type="button" onClick={() => navigate("/daily")}>
            데일리로
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate("/dashboard")}>
            메인으로
          </Button>
        </div>
      </div>
    </div>
  );
}

export default WeeklyColorPage;
