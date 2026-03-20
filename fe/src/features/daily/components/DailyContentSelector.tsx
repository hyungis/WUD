import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUiStore } from "../../../store/uiStore";
import { DAILY_LIMIT_MESSAGE, hasTodayDailyEntryByType } from "../../../utils/dailyLimit";
import { AlertModal } from "../../../components/shared/AlertModal";

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
    id: "coloring",
    title: "명화 색칠하기",
    description: "명화 위에 자유롭게 색칠하고 AI가 색감 심리를 분석해요.",
    enabled: true,
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
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [isCheckingDailyLimit, setIsCheckingDailyLimit] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [alert, setAlert] = useState<{ isOpen: boolean; message: string; type: "success" | "error" }>({
    isOpen: false,
    message: "",
    type: "error",
  });

  const isDailyContentModalOpen = useUiStore((state) => state.isDailyContentModalOpen);
  const setDailyContentModalOpen = useUiStore((state) => state.setDailyContentModalOpen);
  const setDailyDetailModalOpen = useUiStore((state) => state.setDailyDetailModalOpen);
  const setDailyColoringModalOpen = useUiStore((state) => state.setDailyColoringModalOpen);

  const markSelectedDailyContent = (content: "MANDALA" | "COLORING") => {
    localStorage.setItem("dailySelectedContent", content);
  };

  const checkDailyLimitWithTimeout = async (dailyType: "MANDALA" | "COLORING") => {
    const timeoutMs = 3500;
    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), timeoutMs);
    });

    try {
      return await Promise.race([
        hasTodayDailyEntryByType(dailyType),
        timeoutPromise,
      ]);
    } catch {
      // 조회 실패 시에는 사용성을 위해 진행을 허용한다.
      return false;
    }
  };

  const handleOpenDailyDetail = async () => {
    if (isCheckingDailyLimit) return;

    setIsCheckingDailyLimit(true);
    try {
      const existsToday = await checkDailyLimitWithTimeout("MANDALA");
      if (existsToday) {
        setAlert({ isOpen: true, message: DAILY_LIMIT_MESSAGE, type: "error" });
        return;
      }

      if (selectedEmotion) {
        localStorage.setItem("dailyMoodColor", selectedEmotion.color);
        localStorage.setItem("dailyMoodValue", String(selectedEmotion.value));
        localStorage.setItem("dailyMoodLabel", selectedEmotion.label);
      }
      markSelectedDailyContent("MANDALA");

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

  const handleOpenDailyColoring = async () => {
    if (isCheckingDailyLimit) return;

    setIsCheckingDailyLimit(true);
    try {
      const existsToday = await checkDailyLimitWithTimeout("COLORING");
      if (existsToday) {
        setAlert({ isOpen: true, message: DAILY_LIMIT_MESSAGE, type: "error" });
        return;
      }

      if (selectedEmotion) {
        localStorage.setItem("dailyMoodColor", selectedEmotion.color);
        localStorage.setItem("dailyMoodValue", String(selectedEmotion.value));
        localStorage.setItem("dailyMoodLabel", selectedEmotion.label);
      }
      markSelectedDailyContent("COLORING");

      setIsLeaving(true);
      setTimeout(() => {
        if (isDailyContentModalOpen) {
          setDailyContentModalOpen(false);
          setDailyColoringModalOpen(true);
          return;
        }
        navigate("/daily/coloring");
      }, 280);
    } finally {
      setIsCheckingDailyLimit(false);
    }
  };

  const handleStartSelectedContent = async () => {
    if (!selectedContentId) return;

    if (selectedContentId === "mandala") {
      await handleOpenDailyDetail();
      return;
    }

    if (selectedContentId === "coloring") {
      await handleOpenDailyColoring();
      return;
    }

    navigate(`/daily/${selectedContentId}`);
  };

  const handleSelectEmotion = (emotion: typeof EMOTIONS[0]) => {
    setSelectedEmotion(emotion);
    setStep(1);
    setSelectedContentId(null);
  };

  const selectedContent = DAILY_FEATURES.find((task) => task.id === selectedContentId) ?? null;

  return (
    <div className={`relative flex flex-col w-full h-full max-h-full overflow-hidden bg-zinc-950 text-zinc-100 transition-all duration-300 ${isLeaving ? "scale-95 opacity-0" : "scale-100 opacity-100"} ${!isModal ? "rounded-[30px] border border-white/10 shadow-[0_24px_90px_rgba(0,0,0,0.62)]" : ""}`}>

      {/* 헤더 */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-3 sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">DAILY CONTENTS</p>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition hover:bg-white/10 hover:text-white"
          aria-label="닫기"
        >✕</button>
      </div>

      {/* 컨텐츠 영역 */}
      <div className="flex-1 overflow-hidden flex flex-col px-4 py-4 sm:px-8 sm:py-5 min-h-0">

        {/* 진행 단계 표시 */}
        <div className="mb-4 flex shrink-0 items-center justify-center gap-2">
          <div className={`h-1 rounded-full transition-all duration-300 ${step === 0 ? "w-8 bg-white" : "w-2 bg-zinc-500"}`} />
          <div className={`h-1 rounded-full transition-all duration-300 ${step === 1 ? "w-8 bg-white" : "w-2 bg-zinc-800"}`} />
        </div>

        {/* 🚨 스크롤 없이 가득 차게 보여주기 위한 래퍼 (flex-1, min-h-0) */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden justify-center max-w-5xl mx-auto w-full">
          {step === 0 ? (
            <div className="flex flex-col h-full justify-between gap-4">

              {/* 타이틀 */}
              <div className="text-center shrink-0">
                <h1 className="text-xl font-bold text-white sm:text-2xl">오늘의 감정은 어떤가요?</h1>
                <p className="mx-auto mt-1 text-xs text-zinc-400">지금 느끼는 감정을 가장 잘 나타내는 색을 선택해주세요.</p>
              </div>

              {/* 감정 선택 카드 그리드 (세로 크기 축소) */}
              <div className="grid gap-2 sm:gap-3 sm:grid-cols-4 grid-cols-2 flex-1 items-center justify-center max-h-[360px]">
                {EMOTIONS.map((emotion) => (
                  <button
                    key={emotion.label}
                    type="button"
                    onClick={() => handleSelectEmotion(emotion)}
                    className={`group relative flex h-full min-h-[90px] flex-col items-center justify-center rounded-2xl border transition-all duration-150 ${selectedEmotion?.label === emotion.label
                      ? "border-white/25 bg-zinc-800 shadow-lg scale-[1.02]"
                      : "border-zinc-800/80 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900"
                      }`}
                  >
                    <div
                      className="h-10 w-10 sm:h-12 sm:w-12 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.4)] transition-transform group-hover:scale-110"
                      style={{ backgroundColor: emotion.color }}
                    />
                    <span className="mt-2 text-xs sm:text-sm font-medium text-white">{emotion.label}</span>
                  </button>
                ))}
              </div>

              {/* 안내 그리드 (크기 및 여백 축소) */}
              <div className="grid gap-2.5 sm:grid-cols-2 shrink-0">
                <div className="rounded-xl bg-zinc-900/80 p-3.5">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">안내사항</p>
                  <ul className="space-y-1.5 text-xs text-zinc-300">
                    <li className="flex gap-1.5"><span className="text-zinc-600">·</span><span>감정에 정답은 없습니다. 지금 느끼는 그대로를 선택하세요.</span></li>
                    <li className="flex gap-1.5"><span className="text-zinc-600">·</span><span>선택한 감정의 색이 오늘의 별에 반영됩니다.</span></li>
                  </ul>
                </div>
                <div className="rounded-xl bg-zinc-900/80 p-3.5 flex flex-col justify-center">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">진행 흐름</p>
                  <div className="flex items-center justify-center gap-2.5 text-xs">
                    <span className="flex items-center gap-1 text-zinc-400">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-bold text-zinc-950">1</span>감정
                    </span>
                    <span className="text-zinc-700">→</span>
                    <span className="flex items-center gap-1 text-zinc-400">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-800 text-[9px] font-bold text-zinc-300">2</span>활동
                    </span>
                    <span className="text-zinc-700">→</span>
                    <span className="flex items-center gap-1 text-zinc-400">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-800 text-[9px] font-bold text-zinc-300">3</span>그리기
                    </span>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex flex-col h-full justify-between gap-4">

              {/* 활동 선택 카드 */}
              <div className="grid gap-2.5 sm:grid-cols-3 shrink-0">
                {DAILY_FEATURES.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    disabled={!task.enabled}
                    onClick={() => {
                      if (!task.enabled) return;
                      setSelectedContentId(task.id);
                    }}
                    className={`group relative flex flex-col items-start rounded-xl border px-4 py-4 text-left transition-all duration-150 ${!task.enabled
                      ? "cursor-not-allowed border-zinc-800/60 bg-zinc-900/40 opacity-60"
                      : selectedContentId === task.id
                        ? "border-white/30 bg-zinc-800"
                        : "border-zinc-800/80 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900"
                      }`}
                  >
                    <div className="flex w-full items-center justify-between mb-1.5">
                      <span className="text-base font-bold text-white">{task.title}</span>
                      {task.enabled
                        ? <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 ${selectedContentId === task.id ? "border-white" : "border-zinc-600"}`}>
                          {selectedContentId === task.id && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </span>
                        : <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[9px] font-medium text-zinc-500">SOON</span>
                      }
                    </div>
                    <p className="text-xs text-zinc-400">{task.description}</p>
                  </button>
                ))}
              </div>

              {/* 선택된 활동 상세 영역 (가변 여백 차지) */}
              <div className="flex-1 flex flex-col items-center justify-center rounded-2xl bg-zinc-900/60 p-5 sm:p-6 border border-white/5 min-h-[180px]">
                <div className="relative mb-3 flex shrink-0 items-center justify-center">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                      stroke={selectedEmotion?.color || "#fff"}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {selectedEmotion && (
                    <div className="absolute inset-0 rounded-full blur-2xl opacity-20" style={{ backgroundColor: selectedEmotion.color }} />
                  )}
                </div>
                <h2 className="text-xl font-bold text-white sm:text-2xl">{selectedContent?.title || "컨텐츠를 선택해주세요"}</h2>
                <p className="mt-1 text-xs text-zinc-400 text-center">{selectedContent?.description || "위에서 원하는 데일리 컨텐츠를 먼저 선택한 뒤 시작할 수 있어요."}</p>

                <div className="mt-5 flex shrink-0 items-center justify-center gap-2.5 w-full max-w-sm">
                  <button
                    type="button"
                    onClick={() => setStep(0)}
                    className="h-10 rounded-xl border border-zinc-700 px-6 text-xs font-medium text-zinc-300 transition hover:bg-white/5"
                  >
                    이전
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleStartSelectedContent()}
                    disabled={isCheckingDailyLimit || !selectedContentId}
                    className="flex-1 h-10 rounded-xl bg-white px-6 text-xs font-bold text-zinc-950 shadow-lg shadow-white/10 transition hover:bg-zinc-200 disabled:opacity-50"
                  >
                    {isCheckingDailyLimit ? "확인 중..." : selectedContentId ? "시작하기" : "컨텐츠를 선택하세요"}
                  </button>
                </div>
              </div>

              {/* 가이드 영역 */}
              <div className="grid gap-2.5 sm:grid-cols-2 shrink-0">
                <div className="rounded-xl bg-zinc-900/80 p-3.5">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">안내사항</p>
                  <ul className="space-y-1.5 text-xs text-zinc-300">
                    <li className="flex gap-1.5"><span className="text-zinc-600">·</span><span>대칭 기능으로 균형 잡힌 패턴을 쉽게 만들 수 있어요.</span></li>
                    <li className="flex gap-1.5"><span className="text-zinc-600">·</span><span>완성 후 메모를 남기면 별에 기록이 함께 저장됩니다.</span></li>
                  </ul>
                </div>
                <div className="rounded-xl bg-zinc-900/80 p-3.5">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">참고</p>
                  <ul className="space-y-1.5 text-xs text-zinc-300">
                    <li className="flex gap-1.5"><span className="text-zinc-600">·</span><span>하루에 한 번 만다라를 그릴 수 있습니다.</span></li>
                    <li className="flex gap-1.5"><span className="text-zinc-600">·</span><span>잘 그리려 하지 말고 편안하게 채워주세요.</span></li>
                  </ul>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
      <AlertModal
        isOpen={alert.isOpen}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

export default function DailyContentSelector({ isModal = false, onClose }: DailyContentSelectorProps) {
  if (isModal) {
    return (
      <div className="custom-scrollbar fixed inset-0 z-[80] flex items-center justify-center bg-black/80 px-4 py-4 text-zinc-100 backdrop-blur-md">
        <button
          type="button"
          aria-label="모달 닫기"
          onClick={onClose}
          className="absolute inset-0 h-full w-full cursor-default"
        />
        <div className="relative z-10 mx-auto w-full max-w-5xl h-full max-h-[85vh] overflow-hidden rounded-3xl border border-white/10 shadow-2xl flex flex-col bg-zinc-950">
          <DailyContentInner onClose={onClose} isModal />
        </div>
      </div>
    );
  }

  return <DailyContentInner onClose={onClose} />;
}