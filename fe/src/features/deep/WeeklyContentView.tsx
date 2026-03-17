import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/shared/Button";
import { deepApi } from "../../api/deep";
import type { DeepTestGuide, DeepTestInfo } from "../../types/deep";

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

    const content = (
        <div className="relative overflow-hidden rounded-[30px] border border-cyan-200/20 bg-slate-950/80 p-6 text-slate-100 shadow-[0_24px_90px_rgba(2,6,23,0.55)] ring-1 ring-cyan-100/10 sm:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.16),transparent_52%)]" />
            <div className="relative z-10">
                <div className="flex w-full flex-col items-center gap-4 text-center">
                    <div className="flex w-full items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-100/75">
                            위클리 콘텐츠
                        </span>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/5 text-sm text-slate-200 transition hover:bg-white/10"
                            aria-label="닫기"
                        >
                            X
                        </button>
                    </div>
                    <h1 className="mt-2 text-3xl font-semibold text-slate-100 [font-family:'Manrope',sans-serif]">
                        위클리 콘텐츠를 선택해요
                    </h1>
                    <p className="text-sm text-slate-300">
                        {loading ? "위클리 콘텐츠 정보를 불러오는 중입니다." : "현재는 HTP 검사 중심으로 제공됩니다."}
                    </p>
                    {error && <p className="text-xs text-amber-300">{error}</p>}
                </div>

                <section className="mb-2 mt-8 grid w-full gap-4 sm:grid-cols-3">
                    {features.map((task) => (
                        <button
                            key={task.type}
                            disabled={!task.available}
                            onClick={() => task.available && handleOpenByType(task.type)}
                            className={`group flex flex-col items-start rounded-2xl border-2 px-6 py-7 text-left shadow-lg transition-all duration-150 focus:outline-none ${task.available
                                ? "border-cyan-100/20 bg-slate-900/55 backdrop-blur-md hover:scale-[1.02] hover:border-cyan-300/60 hover:shadow-cyan-500/20"
                                : "cursor-not-allowed border-white/10 bg-white/5 text-slate-500 opacity-60"
                                }`}
                        >
                            <span className="mb-1 text-base font-bold text-slate-100 transition-colors duration-100 group-hover:text-cyan-200">
                                {task.title || task.type}
                            </span>
                            <span className="text-xs text-slate-300 transition-colors duration-100 group-hover:text-cyan-100">
                                {task.description}
                            </span>
                        </button>
                    ))}
                </section>

                {guide && (
                    <section className="rounded-2xl border border-cyan-100/15 bg-slate-900/55 p-5 text-left">
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">HTP Guide</p>
                        <h3 className="mt-2 text-lg font-semibold text-slate-100">{guide.title}</h3>
                        <p className="mt-2 text-sm text-slate-300">{guide.purpose}</p>
                        <div className="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
                            <div>
                                <p className="mb-1 text-slate-400">instructions</p>
                                <p>{guide.instructions.join(" / ")}</p>
                            </div>
                            <div>
                                <p className="mb-1 text-slate-400">cautions</p>
                                <p>{guide.cautions.join(" / ")}</p>
                            </div>
                        </div>
                    </section>
                )}

                <div className="mt-4 flex items-center justify-between gap-3">
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
                        onClick={() => handleOpenByType("HTP")}
                        className="liquid-btn liquid-btn--deep px-8 py-3"
                    >
                        다음 단계
                    </Button>
                </div>
            </div>
        </div>
    );

    if (!isModal) {
        return content;
    }

    return (
        <div className="custom-scrollbar fixed inset-0 z-[88] flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/35 px-4 py-8 text-slate-100">
            <button
                type="button"
                aria-label="모달 닫기"
                onClick={handleClose}
                className="absolute inset-0 h-full w-full cursor-default"
            />
            <div className="relative z-10 mx-auto w-full max-w-6xl translate-y-3 overflow-x-hidden">
                {content}
            </div>
        </div>
    );
}

export default WeeklyContentView;
