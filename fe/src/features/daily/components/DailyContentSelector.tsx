import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../../components/shared/Button";
import { useUiStore } from "../../../store/uiStore";

const EMOTIONS = [
  { label: "기쁨", color: "#FFD54F", value: 5 },
  { label: "평온", color: "#4FC3F7", value: 4 },
  { label: "설렘", color: "#FF6FAE", value: 5 },
  { label: "만족", color: "#66BB6A", value: 4 },
  { label: "슬픔", color: "#5C6BC0", value: 2 },
  { label: "불안", color: "#9575CD", value: 2 },
  { label: "분노", color: "#EF5350", value: 1 },
  { label: "지침", color: "#90A4AE", value: 2 },
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

type DailyContentSelectorProps = {
  isModal?: boolean;
  onClose: () => void;
};

function DailyContentInner({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0: 감정 선택, 1: 컨텐츠 선택
  const [selectedEmotion, setSelectedEmotion] = useState<{ label: string; color: string; value: number } | null>(null);

  const isDailyContentModalOpen = useUiStore((state) => state.isDailyContentModalOpen);
  const setDailyContentModalOpen = useUiStore((state) => state.setDailyContentModalOpen);
  const setDailyDetailModalOpen = useUiStore((state) => state.setDailyDetailModalOpen);

  const handleOpenDailyDetail = () => {
    if (selectedEmotion) {
      localStorage.setItem("dailyMoodColor", selectedEmotion.color);
      localStorage.setItem("dailyMoodValue", String(selectedEmotion.value));
      localStorage.setItem("dailyMoodLabel", selectedEmotion.label);
    }

    if (isDailyContentModalOpen) {
      setDailyContentModalOpen(false);
      setDailyDetailModalOpen(true);
      return;
    }

    navigate("/daily/detail");
  };

  const handleSelectEmotion = (emotion: typeof EMOTIONS[0]) => {
    setSelectedEmotion(emotion);
    setStep(1);
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

          {step === 0 ? (
            <>
              <div className="mt-2 flex flex-col items-center gap-3">
                <h1 className="text-3xl font-semibold text-slate-50 [font-family:'Manrope',sans-serif] sm:text-4xl">
                  오늘의 감정은 어떤가요?
                </h1>
                <p className="max-w-2xl text-sm text-slate-300/90">
                  지금 느끼는 감정을 가장 잘 나타내는 색을 선택해주세요.
                </p>
              </div>

              <div className="mt-8 grid w-full grid-cols-2 gap-4 sm:grid-cols-4">
                {EMOTIONS.map((emotion) => (
                  <button
                    key={emotion.label}
                    onClick={() => handleSelectEmotion(emotion)}
                    className="group relative flex flex-col items-center gap-3 rounded-2xl border border-white/5 bg-slate-900/40 p-5 transition-all hover:bg-slate-900/60 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                  >
                    <div
                      className="h-12 w-12 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.3)] transition-transform group-hover:scale-110"
                      style={{ backgroundColor: emotion.color }}
                    />
                    <span className="text-sm font-medium text-slate-200">{emotion.label}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="mt-2 flex flex-col items-center gap-6">
                <div className="relative flex items-center justify-center">
                  {/* 빈 별 시각화 */}
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                      stroke={selectedEmotion?.color}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                    />
                  </svg>
                  <div
                    className="absolute inset-0 rounded-full blur-2xl opacity-20"
                    style={{ backgroundColor: selectedEmotion?.color }}
                  />
                </div>

                <h1 className="text-3xl font-semibold text-slate-50 [font-family:'Manrope',sans-serif] sm:text-4xl">
                  무엇으로 채워볼까요?
                </h1>
                <p className="max-w-2xl text-sm text-slate-300/90">
                  선택한 감정을 담아 별을 채울 활동을 선택하세요.
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

              <div className="mt-8 flex w-full items-center justify-between gap-3">
                <Button variant="secondary" onClick={() => setStep(0)}>이전 단계</Button>
                <Button
                  type="button"
                  onClick={handleOpenDailyDetail}
                  className="liquid-btn liquid-btn--daily min-w-[150px] px-8 py-3"
                >
                  다음 단계
                </Button>
              </div>
            </>
          )}
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

        <div className="relative z-10 mx-auto w-full max-w-6xl translate-y-3 overflow-x-hidden">
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
