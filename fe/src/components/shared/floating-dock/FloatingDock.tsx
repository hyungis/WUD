import { useState, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { IcosahedronGeometry, Vector3, BufferGeometry, Float32BufferAttribute, SphereGeometry, BoxGeometry, OctahedronGeometry, TorusKnotGeometry, DodecahedronGeometry, TetrahedronGeometry } from "three";
import { Float } from "@react-three/drei";
import { useAuthStore } from "../../../store/authStore";
import { useUiStore } from "../../../store/uiStore";
import { useCustomStarStore, type StarShape } from "../../../store/customStarStore";
import { hasTodayDailyEntry } from "../../../utils/dailyLimit";
import { useAlert } from "../../../components/shared/AlertProvider";

// ── 커스텀 중심별에 사용할 geometry 캐시 (StarScene.tsx와 동기화) ──
function createStellatedPolyhedronGeometry(baseRadius = 1, spikeLength = 0.62) {
    const baseGeometry = new IcosahedronGeometry(baseRadius, 0).toNonIndexed();
    const positions = baseGeometry.getAttribute("position").array as Float32Array;
    const vertices: number[] = [];

    for (let i = 0; i < positions.length; i += 9) {
        const a = new Vector3(positions[i], positions[i + 1], positions[i + 2]);
        const b = new Vector3(positions[i + 3], positions[i + 4], positions[i + 5]);
        const c = new Vector3(positions[i + 6], positions[i + 7], positions[i + 8]);

        const centroid = new Vector3().add(a).add(b).add(c).multiplyScalar(1 / 3);
        const normal = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a)).normalize();
        if (normal.dot(centroid) < 0) {
            normal.multiplyScalar(-1);
        }

        const apex = centroid.clone().addScaledVector(normal, spikeLength);
        vertices.push(
            a.x, a.y, a.z, b.x, b.y, b.z, apex.x, apex.y, apex.z,
            b.x, b.y, b.z, c.x, c.y, c.z, apex.x, apex.y, apex.z,
            c.x, c.y, c.z, a.x, a.y, a.z, apex.x, apex.y, apex.z,
        );
    }

    const stellated = new BufferGeometry();
    stellated.setAttribute("position", new Float32BufferAttribute(vertices, 3));
    stellated.computeVertexNormals();
    baseGeometry.dispose();
    return stellated;
}

const MINI_STELLATED_GEOMETRY = createStellatedPolyhedronGeometry(1, 0.62);

const MINI_SHAPE_GEOMETRIES: Record<StarShape, BufferGeometry> = {
    sphere: new SphereGeometry(1, 16, 16),
    box: new BoxGeometry(1.2, 1.2, 1.2),
    octahedron: new OctahedronGeometry(1, 0),
    icosahedron: new IcosahedronGeometry(1, 0),
    torusKnot: new TorusKnotGeometry(0.7, 0.2, 64, 12),
    dodecahedron: new DodecahedronGeometry(1, 0),
    tetrahedron: new TetrahedronGeometry(1, 0),
    stellated: MINI_STELLATED_GEOMETRY,
};

function MiniStarMesh() {
    const meshRef = useRef<any>(null);
    const currentShape = useCustomStarStore((s) => s.currentShape);
    const currentColor = useCustomStarStore((s) => s.currentColor);
    const geometry = MINI_SHAPE_GEOMETRIES[currentShape] || MINI_STELLATED_GEOMETRY;

    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += delta * 0.8;
            meshRef.current.rotation.x += delta * 0.3;
            
            // 은은한 반짝임 효과
            const time = state.clock.elapsedTime;
            const intensity = 1.5 + Math.sin(time * 2) * 0.5;
            if (meshRef.current.material) {
                meshRef.current.material.emissiveIntensity = intensity;
            }
        }
    });

    return (
        <mesh ref={meshRef} geometry={geometry}>
            <meshStandardMaterial
                color={currentColor}
                emissive={currentColor}
                emissiveIntensity={1.5}
                roughness={0.2}
                metalness={0.5}
            />
        </mesh>
    );
}

export default function FloatingDock() {
    const user = useAuthStore((state) => state.user);
    const isDockHidden = useUiStore((state) => state.isDockHidden);
    const isOverlayOpen = useUiStore((state) => state.isOverlayOpen);
    const isDailyContentModalOpen = useUiStore((state) => state.isDailyContentModalOpen);
    const isDailyDetailModalOpen = useUiStore((state) => state.isDailyDetailModalOpen);
    const setDailyContentModalOpen = useUiStore((state) => state.setDailyContentModalOpen);
    const setDailyDetailModalOpen = useUiStore((state) => state.setDailyDetailModalOpen);
    const setWeeklyContentModalOpen = useUiStore((state) => state.setWeeklyContentModalOpen);
    const setWeeklyHtpModalOpen = useUiStore((state) => state.setWeeklyHtpModalOpen);
    const setIsMyUniverseOpen = useUiStore((state) => state.setIsMyUniverseOpen);
    const setSelectedStarId = useUiStore((state) => state.setSelectedStarId);

    const setPreferredCameraView = useUiStore((state) => state.setPreferredCameraView);
    const isCinematicMode = useUiStore((state) => state.isCinematicMode);

    const { showAlert } = useAlert();

    const [isCheckingWeekly, setIsCheckingWeekly] = useState(false);
    const [isDailyCompleted, setIsDailyCompleted] = useState(false);

    useEffect(() => {
        const checkDailyStatus = async () => {
            try {
                const done = await hasTodayDailyEntry();
                setIsDailyCompleted(done);
            } catch (error) {
                console.error("데일리 상태 확인 실패:", error);
            }
        };

        if (!isOverlayOpen && !isDailyContentModalOpen && !isDailyDetailModalOpen) {
            void checkDailyStatus();
        }
    }, [isOverlayOpen, isDailyContentModalOpen, isDailyDetailModalOpen]);

    const glassButtonClass = "inline-flex h-8 sm:h-9 lg:h-10 items-center justify-center rounded-[12px] border border-white/22 bg-white/14 px-2.5 sm:px-3 lg:px-4 text-[11px] sm:text-xs lg:text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] backdrop-blur-md transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/24 hover:border-white/45 hover:backdrop-blur-xl hover:shadow-[0_8px_24px_rgba(148,163,184,0.26),inset_0_1px_0_rgba(255,255,255,0.58)]";

    const displayName = user?.nickname || user?.name || user?.email?.split("@")[0] || "사용자";

    const handleWeeklyClick = async () => {
        if (isCheckingWeekly) {
            return;
        }
        setPreferredCameraView("default");

        setIsCheckingWeekly(true);
        try {
            setWeeklyHtpModalOpen(false);
            setWeeklyContentModalOpen(true);
        } catch {
            setWeeklyHtpModalOpen(false);
            setWeeklyContentModalOpen(true);
        } finally {
            setIsCheckingWeekly(false);
        }
    };

    const handleDailyClick = () => {
        if (isDailyCompleted) {
            showAlert("이미 빛나는 별 하나를 심으셨네요! 내일 또 다른 별을 만들어봐요.", "success");
            return;
        }
        setPreferredCameraView("default");
        setDailyDetailModalOpen(false);
        setDailyContentModalOpen(true);
    };

    const incrementTimelineFocusNonce = useUiStore((state) => state.incrementTimelineFocusNonce);

    return (
        <>
            <div
                id="floating-dock-container"
                className={`fixed bottom-3 sm:bottom-4 lg:bottom-6 left-1/2 z-50 flex w-[min(calc(100vw-0.75rem),44rem)] sm:w-[min(calc(100vw-1rem),48rem)] lg:w-auto -translate-x-1/2 flex-wrap items-center justify-center gap-1.5 sm:gap-2 lg:gap-3 px-1 transition-all duration-700 ${isDockHidden
                    || isOverlayOpen
                    || isCinematicMode
                    ? "translate-y-[150%] opacity-0 pointer-events-none"
                    : "translate-y-0 opacity-100 pointer-events-auto"
                    }`}
            >
                <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 flex-shrink-0">
                    <button
                        id="weekly-star-btn"
                        onClick={handleWeeklyClick}
                        disabled={isCheckingWeekly}
                        className={`${glassButtonClass} min-w-[64px] sm:min-w-[76px] lg:min-w-[90px]`}
                    >
                        {isCheckingWeekly ? "CHECKING..." : "WEEKLY"}
                    </button>

                    <button
                        id="daily-star-btn"
                        onClick={handleDailyClick}
                        className={`${glassButtonClass} min-w-[64px] sm:min-w-[76px] lg:min-w-[90px]`}
                    >
                        DAILY
                    </button>

                    {/* 🌟 미니어처 커스텀 별 버튼 */}
                    <button
                        id="mini-custom-star-btn"
                        onClick={() => {
                            setPreferredCameraView("top-distant");
                            setSelectedStarId("center-mypage-star");
                            incrementTimelineFocusNonce();
                        }}
                        className="relative flex h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10 flex-shrink-0 items-center justify-center rounded-[12px] border border-white/25 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] backdrop-blur-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/20 hover:border-white/50 hover:shadow-[0_8px_20px_rgba(255,255,255,0.15)] overflow-hidden group"
                        title="중심별 감상"
                    >
                        <div className="absolute inset-0 z-0 h-full w-full">
                            <Canvas camera={{ position: [0, 0, 3.2], fov: 45 }} gl={{ antialias: true, alpha: true }}>
                                <ambientLight intensity={1.2} />
                                <pointLight position={[5, 5, 5]} intensity={50} />
                                <Float speed={2} rotationIntensity={1} floatIntensity={1}>
                                    <MiniStarMesh />
                                </Float>
                            </Canvas>
                        </div>
                        {/* 글로우 효과 (커서 호버 시) */}
                        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </button>
                </div>

                <div className="flex items-center">
                    <button
                        id="mypage-btn"
                        type="button"
                        onClick={() => {
                            setPreferredCameraView("default");
                            setSelectedStarId("center-mypage-star");
                            setIsMyUniverseOpen(true);
                            incrementTimelineFocusNonce();
                        }}
                        className="inline-flex h-8 sm:h-9 lg:h-10 max-w-[44vw] sm:max-w-[40vw] lg:max-w-none items-center gap-1.5 sm:gap-2 rounded-[12px] border border-white/22 bg-white/14 px-2.5 sm:px-3 lg:px-4 text-[11px] sm:text-xs lg:text-sm font-semibold text-white cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.38)] backdrop-blur-md transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/24 hover:border-white/45 hover:backdrop-blur-xl hover:shadow-[0_8px_24px_rgba(148,163,184,0.26),inset_0_1px_0_rgba(255,255,255,0.58)]"
                    >
                        <span className="flex h-5.5 w-5.5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[11px] font-semibold">
                            {displayName.slice(0, 1)}
                        </span>
                        <span className="hidden lg:inline max-w-[8rem] truncate text-sm font-semibold text-slate-100">{displayName}</span>
                        <span className="text-[10px] sm:text-[11px] lg:text-xs font-semibold tracking-wide text-slate-300">MYPAGE</span>
                    </button>
                </div>
            </div>
        </>
    );
}