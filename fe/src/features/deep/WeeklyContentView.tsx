import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deepApi } from "../../api/deep";
import type { DeepTestGuide, DeepTestInfo } from "../../types/deep";
import { WEEKLY_LIMIT_MESSAGE, hasWeeklyDeepEntryByType } from "../../utils/dailyLimit";

const DEFAULT_FEATURES: DeepTestInfo[] = [
    { type: "HTP", title: "HTP 검사", description: "집, 나무, 사람을 그리며 현재 감정과 자기표현을 돌아보는 심층 콘텐츠", available: true },
    { type: "PERSON_IN_RAIN", title: "빗속의 사람", description: "비와 사람의 구성을 통해 스트레스 상황에서의 감정을 돌아보는 콘텐츠", available: false },
    { type: "STAR_WAVE", title: "별-파도 검사", description: "별과 파도의 이미지를 통해 내면 상태를 표현해보는 콘텐츠", available: false },
];

const DEFAULT_GUIDE: DeepTestGuide = {
    type: "HTP",
    title: "HTP(HOUSE-TREE-PERSON)",
    purpose: "집, 나무, 사람을 그리며 내면의 심리 상태를 탐색합니다.",
    instructions: [
        "집, 나무, 사람을 각각 한 장씩 그려주세요.",
        "잘 그리려고 하기보다 떠오르는 느낌대로 표현해 주세요.",
        "정답은 없으니 편안하게 진행하시면 됩니다.",
    ],
    cautions: [
        "이 결과는 의학적 또는 임상적 진단이 아닙니다.",
        "현재 기분이나 상황에 따라 표현이 달라질 수 있습니다.",
    ],
    disclaimer: "참고용 결과이며 필요 시 전문가 상담을 권장합니다.",
};

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
    const [guide, setGuide] = useState<DeepTestGuide>(DEFAULT_GUIDE);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<string>("HTP");
    const [isCheckingDailyLimit, setIsCheckingDailyLimit] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    useEffect(() => {
        let mounted = true;

        const fetchDeepMeta = async () => {
            setLoading(true);
            setError(null);
            try {
                const testsRes = await deepApi.getTestTypes();
                if (mounted && testsRes.success && testsRes.data?.length) {
                    const locked = new Set(DEFAULT_FEATURES.filter(f => !f.available).map(f => f.type));
                    setFeatures(testsRes.data.map(f => locked.has(f.type) ? { ...f, available: false } : f));
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
            // 애니메이션 후 전환
            setIsLeaving(true);
            setTimeout(() => {
                handleOpenByType(type);
            }, 280);
        } catch {
            setIsLeaving(true);
            setTimeout(() => {
                handleOpenByType(type);
            }, 280);
        } finally {
            setIsCheckingDailyLimit(false);
        }
    };

    const selectedFeature = features.find((f) => f.type === selected);

    const content = (
        <div className={`relative overflow-hidden bg-zinc-950 text-zinc-100 transition-all duration-300 ${isLeaving ? "scale-95 opacity-0" : "scale-100 opacity-100"} ${isModal ? "h-full flex flex-col" : "rounded-[30px] border border-white/10 shadow-[0_24px_90px_rgba(0,0,0,0.62)]"}`}>

            {/* 헤더 */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 sm:px-8">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">WEEKLY CONTENTS</p>
                <button
                    type="button"
                    onClick={handleClose}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/10 hover:text-white"
                    aria-label="닫기"
                >✕</button>
            </div>

            {/* 스크롤 영역 */}
            <div
                aria-busy={loading}
                className={`custom-scrollbar overflow-y-auto px-6 py-6 sm:px-8 sm:py-8 ${isModal ? "flex-1" : ""}`}
            >
                {error && <p className="mb-4 text-xs text-zinc-500">{error}</p>}

                {/* ── 테스트 선택 카드 ── */}
                <div className="grid gap-3 sm:grid-cols-3">
                    {features.map((task) => (
                        <button
                            key={task.type}
                            type="button"
                            disabled={!task.available}
                            onClick={() => task.available && setSelected(task.type)}
                            className={`group relative flex flex-col items-start rounded-2xl border px-5 py-5 text-left transition-all duration-150 ${!task.available
                                    ? "cursor-not-allowed border-zinc-800/60 bg-zinc-900/40 opacity-60"
                                    : selected === task.type
                                        ? "border-white/25 bg-zinc-800 shadow-lg"
                                        : "border-zinc-800/80 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900"
                                }`}
                        >
                            <div className="flex w-full items-center justify-between">
                                <span className="text-lg font-bold text-white">{task.title}</span>
                                {task.available
                                    ? <span className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-zinc-600">
                                        {selected === task.type && <span className="h-2 w-2 rounded-full bg-white" />}
                                    </span>
                                    : <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-[10px] font-medium text-zinc-600">SOON</span>
                                }
                            </div>
                            <p className="mt-2 text-sm text-zinc-400">{task.description}</p>
                        </button>
                    ))}
                </div>

                {/* ── 선택된 테스트 상세 ── */}
                {selectedFeature?.available && (
                    <div className="mt-6 min-h-[220px] rounded-2xl bg-zinc-900 p-7 text-center sm:p-8">
                        <h2 className="text-2xl font-bold text-white sm:text-3xl">HTP(HOUSE-TREE-PERSON)</h2>
                        <p className="mx-auto mt-2 text-sm text-zinc-400">
                            {selectedFeature.type === "HTP" && "집, 나무, 사람을 그리며 내면의 심리 상태를 탐색합니다."}
                        </p>

                        {/* 진행 흐름 */}
                        <div className="mt-6 inline-flex items-center gap-3 rounded-xl bg-zinc-950/80 px-5 py-3 text-sm">
                            <span className="flex items-center gap-1.5 text-zinc-400">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-300">1</span>설문
                            </span>
                            <span className="text-zinc-700">→</span>
                            <span className="flex items-center gap-1.5 text-zinc-400">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-300">2</span>그리기
                            </span>
                            <span className="text-zinc-700">→</span>
                            <span className="flex items-center gap-1.5 text-zinc-400">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-300">3</span>AI 분석
                            </span>
                        </div>

                        <div className="mt-7">
                            <button
                                type="button"
                                onClick={() => void handleOpenByTypeWithLimit(selectedFeature.type)}
                                disabled={isCheckingDailyLimit}
                                className="h-12 rounded-xl bg-white px-10 text-sm font-bold text-zinc-950 shadow-lg shadow-white/10 transition hover:bg-zinc-100 disabled:opacity-50"
                            >
                                {isCheckingDailyLimit ? "확인 중..." : "검사 시작하기"}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── 가이드 ── */}
                {selected === "HTP" && (
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <div className="min-h-[170px] rounded-xl bg-zinc-900/80 p-5">
                            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">안내사항</p>
                            <ul className="space-y-2 text-sm leading-relaxed text-zinc-300">
                                {guide.instructions.map((inst, i) => (
                                    <li key={i} className="flex gap-2">
                                        <span className="mt-0.5 text-zinc-600">·</span>
                                        <span>{inst}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="min-h-[170px] rounded-xl bg-zinc-900/80 p-5">
                            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">주의사항</p>
                            <ul className="space-y-2 text-sm leading-relaxed text-zinc-300">
                                {guide.cautions.map((caut, i) => (
                                    <li key={i} className="flex gap-2">
                                        <span className="mt-0.5 text-zinc-600">·</span>
                                        <span>{caut}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
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
            <div className="relative z-10 mx-auto w-full max-w-7xl h-[94vh] overflow-hidden rounded-3xl border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
                {content}
            </div>
        </div>
    );
}

export default WeeklyContentView;
