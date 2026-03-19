import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/shared/Button";
import { deepApi } from "../../api/deep";
import type { DeepTestGuide, DeepTestInfo } from "../../types/deep";
import { WEEKLY_LIMIT_MESSAGE, hasWeeklyDeepEntryByType } from "../../utils/dailyLimit";

const DEFAULT_FEATURES: DeepTestInfo[] = [
    { type: "HTP", title: "HTP", description: "집, 나무, 사람으로 내면을 관찰하세요.", available: true },
    { type: "PERSON_IN_RAIN", title: "PITR", description: "준비중", available: false },
    { type: "STAR_WAVE", title: "SWP", description: "준비중", available: false },
];

function routeByType(type: string) {
    if (type === "HTP") {
        return "/deep/htp";
    }
    return "/deep/content";
}

type WeeklyContentViewProps = {
    isModal?: boolean;
    onClose?: () => void;
    onStartHtp?: () => void;
};

function WeeklyContentView({ isModal = false, onClose, onStartHtp }: WeeklyContentViewProps) {
    const navigate = useNavigate();
    const [features, setFeatures] = useState<DeepTestInfo[]>(DEFAULT_FEATURES);
    const [guide, setGuide] = useState<DeepTestGuide | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCheckingDailyLimit, setIsCheckingDailyLimit] = useState(false);

    useEffect(() => {
        let mounted = true;

        const fetchDeepMeta = async () => {
            setLoading(true);
            setError(null);
            try {
                const testsRes = await deepApi.getTestTypes();
                if (mounted && testsRes.success && testsRes.data?.length) {
                    setFeatures(testsRes.data);
                }

                const htpGuideRes = await deepApi.getTestGuide("HTP");
                if (mounted && htpGuideRes.success && htpGuideRes.data) {
                    setGuide(htpGuideRes.data);
                }
            } catch {
                if (mounted) {
                    setError("위클리 콘텐츠 정보를 불러오지 못해 기본 목록으로 표시합니다.");
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        fetchDeepMeta();
        return () => {
            mounted = false;
        };
    }, []);

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

    const handleOpenByType = (type: string) => {
        if (type === "HTP" && onStartHtp) {
            onStartHtp();
            return;
        }

        navigate(routeByType(type));
    };

    const handleOpenByTypeWithLimit = async (type: string) => {
        if (isCheckingDailyLimit) return;

        setIsCheckingDailyLimit(true);
        try {
            const sessionsRes = await deepApi.getPastSessions();
            const history = (sessionsRes.data ?? []) as any[];
            if (hasWeeklyDeepEntryByType(history, type)) {
                window.alert(WEEKLY_LIMIT_MESSAGE);
                return;
            }
            handleOpenByType(type);
        } catch {
            // 조회 실패 시 기능 차단을 피하기 위해 기존 흐름으로 진행
            handleOpenByType(type);
        } finally {
            setIsCheckingDailyLimit(false);
        }
    };

    const content = (
        <div className={`relative overflow-hidden rounded-[30px] border border-white/12 bg-zinc-950/86 p-6 text-zinc-100 shadow-[0_24px_90px_rgba(0,0,0,0.62)] ring-1 ring-white/[0.08] backdrop-blur-xl sm:p-8 ${isModal ? "h-full flex flex-col" : ""}`}>
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.32)_0%,rgba(0,0,0,0.50)_100%)]" />
            <div className={`relative z-10 ${isModal ? "h-full flex flex-col" : ""}`}>
                <div className="flex w-full flex-col items-center gap-4 text-center">
                    <div className="flex w-full items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-400">
                            위클리 콘텐츠
                        </span>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/5 text-sm text-zinc-200 transition hover:bg-white/10"
                            aria-label="닫기"
                        >
                            X
                        </button>
                    </div>
                    <h1 className="mt-2 text-3xl font-semibold text-white [font-family:'Manrope',sans-serif] [text-shadow:0_1px_1px_rgba(0,0,0,0.5)]">
                        위클리 콘텐츠를 선택해요
                    </h1>
                    <p className="text-sm text-zinc-200">
                        {loading ? "위클리 콘텐츠 정보를 불러오는 중입니다." : "현재는 HTP 검사 중심으로 제공됩니다."}
                    </p>
                    {error && <p className="text-xs text-amber-300">{error}</p>}
                </div>

                <section className="mb-2 mt-8 grid w-full gap-4 sm:grid-cols-3 sm:[grid-auto-rows:1fr]">
                    {features.map((task) => (
                        <button
                            key={task.type}
                            disabled={!task.available}
                            onClick={() => task.available && void handleOpenByTypeWithLimit(task.type)}
                            className={`group flex h-full min-h-[132px] flex-col items-start rounded-2xl border-2 px-5 py-5 text-left shadow-lg transition-all duration-150 focus:outline-none ${task.available
                                ? "border-white/16 bg-zinc-900/70 backdrop-blur-md hover:scale-[1.01] hover:border-white/28 hover:bg-zinc-900/80 hover:shadow-[0_8px_30px_rgba(255,255,255,0.06)]"
                                : "cursor-not-allowed border-white/10 bg-white/5 text-zinc-500 opacity-60"
                                }`}
                        >
                            <span className="mb-1 text-base font-bold text-white transition-colors duration-100 group-hover:text-white">
                                {task.title || task.type}
                            </span>
                            <span className="text-xs text-zinc-200 transition-colors duration-100 group-hover:text-zinc-100">
                                {task.description}
                            </span>
                        </button>
                    ))}
                </section>

                {guide && (
                    <section className="rounded-2xl border border-white/16 bg-zinc-900/70 p-5 text-left backdrop-blur-sm">
                        <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">HTP Guide</p>
                        <h3 className="mt-2 text-lg font-semibold text-white">{guide.title}</h3>
                        <p className="mt-2 text-sm text-zinc-200">{guide.purpose}</p>
                        <div className="mt-3 grid gap-2 text-xs text-zinc-200 sm:grid-cols-2">
                            <div>
                                <p className="mb-1 text-zinc-400">instructions</p>
                                <p>{guide.instructions.join(" / ")}</p>
                            </div>
                            <div>
                                <p className="mb-1 text-zinc-400">cautions</p>
                                <p>{guide.cautions.join(" / ")}</p>
                            </div>
                        </div>
                    </section>
                )}

                <div className={`mt-4 flex items-center justify-between gap-3 ${isModal ? "mt-auto pt-4" : ""}`}>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleClose}
                        className="px-6 py-2.5"
                    >
                        이전 단계
                    </Button>
                    <Button
                        type="button"
                        onClick={() => void handleOpenByTypeWithLimit("HTP")}
                        disabled={isCheckingDailyLimit}
                        className="liquid-btn liquid-btn--neutral px-8 py-3"
                    >
                        {isCheckingDailyLimit ? "확인 중..." : "다음 단계"}
                    </Button>
                </div>
            </div>
        </div>
    );

    if (!isModal) {
        return content;
    }

    return (
        <div className="custom-scrollbar fixed inset-0 z-[88] flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/78 px-4 py-4 text-zinc-100 backdrop-blur-sm">
            <button
                type="button"
                aria-label="모달 닫기"
                onClick={handleClose}
                className="absolute inset-0 h-full w-full cursor-default"
            />
            <div className="relative z-10 mx-auto w-full max-w-7xl h-[94vh] overflow-hidden">
                {content}
            </div>
        </div>
    );
}

export default WeeklyContentView;
