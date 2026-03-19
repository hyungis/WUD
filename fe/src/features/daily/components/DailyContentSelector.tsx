import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUiStore } from "../../../store/uiStore";
import { DAILY_LIMIT_MESSAGE, hasTodayDailyEntry } from "../../../utils/dailyLimit";

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

function DailyContentInner({ onClose, isModal = false }: { onClose: () => void; isModal?: boolean }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0: 감정 선택, 1: 컨텐츠 선택
  const [selectedEmotion, setSelectedEmotion] = useState<{ label: string; color: string; value: number } | null>(null);
  const [isCheckingDailyLimit, setIsCheckingDailyLimit] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const isDailyContentModalOpen = useUiStore((state) => state.isDailyContentModalOpen);
  const setDailyContentModalOpen = useUiStore((state) => state.setDailyContentModalOpen);
  const setDailyDetailModalOpen = useUiStore((state) => state.setDailyDetailModalOpen);

  const handleOpenDailyDetail = async () => {
    if (isCheckingDailyLimit) return;

    setIsCheckingDailyLimit(true);
    try {
      const existsToday = await hasTodayDailyEntry();
      if (existsToday) {
        window.alert(DAILY_LIMIT_MESSAGE);
        return;
      }

    if (selectedEmotion) {
      localStorage.setItem("dailyMoodColor", selectedEmotion.color);
      localStorage.setItem("dailyMoodValue", String(selectedEmotion.value));
      localStorage.setItem("dailyMoodLabel", selectedEmotion.label);
    }

    setIsLeaving(true);
    setTimeout(() => {
      if (isDailyContentModalOpen) {
        setDailyContentModalOpen(false);
        setDailyDetailModalOpen(true);
        return;
      }
      navigate("/daily/detail");
    }, 280);
    } finally {
      setIsCheckingDailyLimit(false);
    }
  };

  const handleSelectEmotion = (emotion: typeof EMOTIONS[0]) => {
    setSelectedEmotion(emotion);
    setStep(1);
  };

  return (
    <div className={`relative overflow-hidden bg-zinc-950 text-zinc-100 transition-all duration-300 ${isLeaving ? "scale-95 opacity-0" : "scale-100 opacity-100"} ${isModal ? "h-full flex flex-col" : "rounded-[30px] border border-white/10 shadow-[0_24px_90px_rgba(0,0,0,0.62)]"}`}>

      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">DAILY CONTENTS</p>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/10 hover:text-white"
          aria-label="닫기"
        >✕</button>
      </div>

      {/* 스크롤 콘텐츠 */}
      <div className={`custom-scrollbar overflow-y-auto px-6 py-6 sm:px-8 sm:py-8 ${isModal ? "flex-1" : ""}`}>

        {/* 진행 단계 표시 */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 0 ? "w-8 bg-white" : "w-2 bg-zinc-500"}`} />
          <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 1 ? "w-8 bg-white" : "w-2 bg-zinc-800"}`} />
        </div>

        {step === 0 ? (
          <>
            {/* ── 감정 선택 카드 ── */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-white sm:text-3xl">오늘의 감정은 어떤가요?</h1>
              <p className="mx-auto mt-2 text-sm text-zinc-400">지금 느끼는 감정을 가장 잘 나타내는 색을 선택해주세요.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-4 grid-cols-2">
              {EMOTIONS.map((emotion) => (
                <button
                  key={emotion.label}
                  type="button"
                  onClick={() => handleSelectEmotion(emotion)}
                  className={`group relative flex flex-col items-center rounded-2xl border px-5 py-5 transition-all duration-150 ${
                    selectedEmotion?.label === emotion.label
                      ? "border-white/25 bg-zinc-800 shadow-lg"
                      : "border-zinc-800/80 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900"
                  }`}
                >
                  <div
                    className="h-12 w-12 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.4)] transition-transform group-hover:scale-110"
                    style={{ backgroundColor: emotion.color }}
                  />
                  <span className="mt-3 text-sm font-medium text-white">{emotion.label}</span>
                </button>
              ))}
            </div>

            {/* ── 안내 그리드 ── */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="min-h-[120px] rounded-xl bg-zinc-900/80 p-5">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">안내사항</p>
                <ul className="space-y-2 text-sm leading-relaxed text-zinc-300">
                  <li className="flex gap-2"><span className="mt-0.5 text-zinc-600">·</span><span>감정에 정답은 없습니다. 지금 느끼는 그대로를 선택하세요.</span></li>
                  <li className="flex gap-2"><span className="mt-0.5 text-zinc-600">·</span><span>선택한 감정의 색이 오늘의 별에 반영됩니다.</span></li>
                </ul>
              </div>
              <div className="min-h-[120px] rounded-xl bg-zinc-900/80 p-5">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">진행 흐름</p>
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-zinc-950">1</span>감정
                  </span>
                  <span className="text-zinc-700">→</span>
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-300">2</span>활동
                  </span>
                  <span className="text-zinc-700">→</span>
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-300">3</span>그리기
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* ── 활동 선택 ── */}
            <div className="grid gap-3 sm:grid-cols-3">
              {DAILY_FEATURES.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  disabled={!task.enabled}
                  onClick={() => {
                    if (!task.enabled) return;
                    if (task.id === "mandala") {
                      void handleOpenDailyDetail();
                      return;
                    }
                    navigate(`/daily/${task.id}`);
                  }}
                  className={`group relative flex flex-col items-start rounded-2xl border px-5 py-5 text-left transition-all duration-150 ${
                    !task.enabled
                      ? "cursor-not-allowed border-zinc-800/60 bg-zinc-900/40 opacity-60"
                      : "border-zinc-800/80 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-lg font-bold text-white">{task.title}</span>
                    {task.enabled
                      ? <span className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-zinc-600" />
                      : <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-[10px] font-medium text-zinc-600">SOON</span>
                    }
                  </div>
                  <p className="mt-2 text-sm text-zinc-400">{task.description}</p>
                </button>
              ))}
            </div>

            {/* ── 선택된 활동 상세 ── */}
            <div className="mt-6 min-h-[220px] rounded-2xl bg-zinc-900 p-7 text-center sm:p-8">
              <div className="relative mx-auto mb-4 flex items-center justify-center">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                    stroke={selectedEmotion?.color || "#fff"}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {selectedEmotion && (
                  <div className="absolute inset-0 rounded-full blur-3xl opacity-15" style={{ backgroundColor: selectedEmotion.color }} />
                )}
              </div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">만다라 그리기</h2>
              <p className="mx-auto mt-2 text-sm text-zinc-400">기하학 대칭 패턴으로 감정을 표현하고 별을 채워보세요.</p>

              {/* 진행 흐름 */}
              <div className="mt-6 inline-flex items-center gap-3 rounded-xl bg-zinc-950/80 px-5 py-3 text-sm">
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-300">1</span>감정
                </span>
                <span className="text-zinc-700">→</span>
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-zinc-950">2</span>활동
                </span>
                <span className="text-zinc-700">→</span>
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-300">3</span>그리기
                </span>
              </div>

              <div className="mt-7 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="h-11 rounded-xl border border-zinc-800 px-7 text-sm font-medium text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
                >
                  이전
                </button>
                <button
                  type="button"
                  onClick={() => void handleOpenDailyDetail()}
                  disabled={isCheckingDailyLimit}
                  className="h-12 rounded-xl bg-white px-10 text-sm font-bold text-zinc-950 shadow-lg shadow-white/10 transition hover:bg-zinc-100 disabled:opacity-50"
                >
                  {isCheckingDailyLimit ? "확인 중..." : "그리기 시작하기"}
                </button>
              </div>
            </div>

            {/* ── 가이드 ── */}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="min-h-[120px] rounded-xl bg-zinc-900/80 p-5">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">안내사항</p>
                <ul className="space-y-2 text-sm leading-relaxed text-zinc-300">
                  <li className="flex gap-2"><span className="mt-0.5 text-zinc-600">·</span><span>대칭 기능으로 균형 잡힌 패턴을 쉽게 만들 수 있어요.</span></li>
                  <li className="flex gap-2"><span className="mt-0.5 text-zinc-600">·</span><span>완성 후 메모를 남기면 별에 기록이 함께 저장됩니다.</span></li>
                </ul>
              </div>
              <div className="min-h-[120px] rounded-xl bg-zinc-900/80 p-5">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">참고</p>
                <ul className="space-y-2 text-sm leading-relaxed text-zinc-300">
                  <li className="flex gap-2"><span className="mt-0.5 text-zinc-600">·</span><span>하루에 한 번 만다라를 그릴 수 있습니다.</span></li>
                  <li className="flex gap-2"><span className="mt-0.5 text-zinc-600">·</span><span>잘 그리려 하지 말고 편안하게 채워주세요.</span></li>
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function DailyContentSelector({ isModal = false, onClose }: DailyContentSelectorProps) {
  if (isModal) {
    return (
      <div className="custom-scrollbar fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/78 px-4 py-4 text-zinc-100 backdrop-blur-sm">
        <button
          type="button"
          aria-label="모달 닫기"
          onClick={onClose}
          className="absolute inset-0 h-full w-full cursor-default"
        />
        <div className="relative z-10 mx-auto w-full max-w-7xl max-h-[94vh] overflow-hidden rounded-3xl border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
          <DailyContentInner onClose={onClose} isModal />
        </div>
      </div>
    );
  }

  return <DailyContentInner onClose={onClose} />;
}
