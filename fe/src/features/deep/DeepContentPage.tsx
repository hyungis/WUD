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

function DeepContentPage() {
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
                    setError("심층 콘텐츠 정보를 불러오지 못해 기본 목록으로 표시합니다.");
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

    return (
        <div className="relative min-h-screen overflow-hidden bg-black text-slate-100">
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
                <div className="absolute inset-0 starfield z-20" />
            </div>

            <div className="relative z-20 mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center gap-8 px-6 py-12">
                <div className="w-full max-w-4xl rounded-3xl border border-white/10 bg-slate-950/50 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl ring-1 ring-white/10">
                    <div className="flex w-full flex-col items-center gap-4 text-center">
                        <div className="flex w-full items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-300">
                                심층 콘텐츠
                            </span>
                            <button
                                type="button"
                                onClick={() => navigate("/dashboard")}
                                className="liquid-btn liquid-btn--neutral px-3 py-1.5 text-xs"
                            >
                                닫기
                            </button>
                        </div>
                        <div className="mt-2 flex flex-col items-center gap-3">
                            <h1 className="text-3xl font-semibold text-slate-100 [font-family:'Manrope',sans-serif]">
                                심층 콘텐츠를 선택해요
                            </h1>
                        </div>
                        <p className="text-sm text-slate-300">
                            {loading ? "심층 콘텐츠 정보를 불러오는 중입니다." : "현재는 HTP 검사 중심으로 제공됩니다."}
                        </p>
                        {error && (
                            <p className="text-xs text-amber-300">{error}</p>
                        )}
                    </div>

                    <section className="mb-2 mt-8 grid w-full gap-6 sm:grid-cols-3">
                        {features.map((task) => (
                            <button
                                key={task.type}
                                disabled={!task.available}
                                onClick={() => task.available && navigate(routeByType(task.type))}
                                className={`group flex flex-col items-start rounded-2xl border-2 px-6 py-7 text-left shadow-lg transition-all duration-150 focus:outline-none ${task.available
                                    ? "border-white/20 bg-slate-900/55 backdrop-blur-md hover:scale-[1.02] hover:border-emerald-300/60 hover:shadow-emerald-500/20"
                                    : "cursor-not-allowed border-white/10 bg-white/5 text-slate-500 opacity-60"
                                    }`}
                            >
                                <span className="mb-1 text-base font-bold text-slate-100 transition-colors duration-100 group-hover:text-emerald-200">{task.title || task.type}</span>
                                <span className="text-xs text-slate-300 transition-colors duration-100 group-hover:text-emerald-100">{task.description}</span>
                            </button>
                        ))}
                    </section>

                    {guide && (
                        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left">
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

                    <div className="mt-4 flex items-center justify-center gap-3">
                        <Button
                            type="button"
                            onClick={() => navigate("/deep/htp")}
                            className="liquid-btn liquid-btn--deep px-8 py-3 text-lg"
                        >
                            기본 검사 시작하기
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DeepContentPage;
