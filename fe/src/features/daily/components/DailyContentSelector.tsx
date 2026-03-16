import { useNavigate } from "react-router-dom";
import Button from "../../../components/shared/Button";
import { useUiStore } from "../../../store/uiStore";

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

type DailyContentSelectorProps = {
  isModal?: boolean;
  onClose: () => void;
};

function DailyContentInner({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const isDailyContentModalOpen = useUiStore((state) => state.isDailyContentModalOpen);
  const setDailyContentModalOpen = useUiStore((state) => state.setDailyContentModalOpen);
  const setDailyDetailModalOpen = useUiStore((state) => state.setDailyDetailModalOpen);

  const handleOpenDailyDetail = () => {
    if (isDailyContentModalOpen) {
      setDailyContentModalOpen(false);
      setDailyDetailModalOpen(true);
      return;
    }

    navigate("/daily/detail");
  };

  return (
    <div className="relative z-20 mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-8">
      <div className="relative w-full overflow-hidden rounded-[30px] border border-cyan-200/20 bg-slate-950/80 p-6 shadow-[0_24px_90px_rgba(2,6,23,0.55)] ring-1 ring-cyan-100/10 backdrop-blur-xl sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.14),transparent_52%)]" />

        <div className="relative z-10 flex w-full flex-col items-center gap-4 text-center">
          <div className="flex w-full items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-100/75">
              Daily Content
            </span>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/5 text-sm text-slate-200 transition hover:bg-white/10"
              aria-label="닫기"
            >
              X
            </button>
          </div>
          <div className="mt-2 flex flex-col items-center gap-3">
            <h1 className="text-3xl font-semibold text-slate-50 [font-family:'Manrope',sans-serif] sm:text-4xl">
              오늘의 콘텐츠를 선택해요
            </h1>
          </div>
          <p className="max-w-2xl text-sm text-slate-300/90">
            1차 MVP는 만다라 그리기만 제공됩니다.
          </p>
        </div>

        <section className="relative z-10 mt-8 mb-2 grid w-full gap-6 sm:grid-cols-3">
          {DAILY_FEATURES.map((task) => (
            <button
              key={task.id}
              disabled={!task.enabled}
              onClick={() => {
                if (!task.enabled) return;
                if (task.id === "mandala") {
                  handleOpenDailyDetail();
                  return;
                }

                navigate(`/daily/${task.id}`);
              }}
              className={`group flex min-h-[146px] flex-col items-start rounded-2xl border px-6 py-7 text-left transition-all duration-200 focus:outline-none ${task.enabled
                ? "border-cyan-100/15 bg-slate-900/55 shadow-[0_18px_40px_rgba(2,6,23,0.3)] backdrop-blur-md hover:-translate-y-0.5 hover:border-cyan-300/45"
                : "cursor-not-allowed border-white/10 bg-white/5 text-slate-500 opacity-60"
                }`}
            >
              <span className="mb-2 text-base font-bold text-slate-100 transition-colors duration-100 group-hover:text-cyan-100">{task.title}</span>
              <span className="text-xs text-slate-300 transition-colors duration-100 group-hover:text-cyan-50">{task.description}</span>
            </button>
          ))}
        </section>

        <div className="relative z-10 mt-4 flex items-center justify-center gap-3">
          <Button
            type="button"
            onClick={handleOpenDailyDetail}
            className="liquid-btn liquid-btn--daily min-w-[180px] px-8 py-3 text-lg"
          >
            시작하기
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function DailyContentSelector({ isModal = false, onClose }: DailyContentSelectorProps) {
  if (isModal) {
    return (
      <div className="custom-scrollbar fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/35 px-4 py-8 text-slate-100">
        <button
          type="button"
          aria-label="모달 닫기"
          onClick={onClose}
          className="absolute inset-0 h-full w-full cursor-default"
        />

        <div className="relative z-10 mx-auto w-full max-w-6xl translate-y-3 overflow-x-hidden rounded-3xl border border-white/10 bg-slate-950/65 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.42)] ring-1 ring-white/10 backdrop-blur-xl sm:p-8">
          <div
            className="pointer-events-none absolute inset-0 z-10 opacity-35"
            style={{ background: "radial-gradient(circle at center, transparent 34%, rgba(10, 5, 25, 0.28) 70%, rgba(0, 0, 0, 0.36) 100%)" }}
          />

          <DailyContentInner onClose={onClose} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black px-6 py-12 text-slate-100">
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
        <div className="starfield absolute inset-0 z-20" />
      </div>

      <div className="relative z-20 mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center">
        <DailyContentInner onClose={onClose} />
      </div>
    </div>
  );
}
