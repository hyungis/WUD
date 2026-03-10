import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Line, Float } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState, createContext, useContext } from "react";
import type { MutableRefObject } from "react";
import type { Group, InstancedMesh, Points } from "three";
import { Vector3, Object3D, Color, Texture } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useNavigate } from "react-router-dom";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { starApi } from "../../api/star"; // 실제 API 모듈
import type { StarItem } from "../../types/star";
import { useUiStore } from "../../store/uiStore";

// ==========================================
// 1. 타입 및 전역 유틸리티
// ==========================================
export type DailyPlanet = {
  id: string;
  shell: string;
  core: string;
  objectType?: "halo" | "shards" | "spark";
  objectColor?: string;
  memo: string;
  createdAt: string;
};

export type DeepStar = {
  id: string;
  toneColor: string;
  createdAt: string;
  weekKey?: string;
  label?: string;
};

type StarSceneProps = {
  dailyPlanets: DailyPlanet[];
  deepStars: DeepStar[];
  mypageStar: {
    id: string;
    createdAt: string;
    toneColor: string;
    label: string;
  };
  onStarClick: () => void;
  onDeepStarClick?: (star: DeepStar) => void;
  onPlanetClick: (planet: DailyPlanet) => void;
  onStarSelect?: (starId: string) => void;
  selectedStarId?: string | null;
  hoveredStarId?: string | null;
  onStarHover?: (data: { id: string | null; x?: number; y?: number }) => void;
  onViewModeChange?: (mode: "macro" | "micro") => void;
};

const hashSeed = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const gaussianRandom = () => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  num = num / 10.0 + 0.5;
  if (num > 1 || num < 0) return gaussianRandom();
  return num;
};

const seededGaussian = (seed: number) => {
  return (seededRandom(seed) + seededRandom(seed + 1) + seededRandom(seed + 2)) / 3;
};

export const getWeekKey = (date: Date) => {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${target.getUTCFullYear()}-W${weekNo}`;
};

export const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
};

const ZOOM_THRESHOLD = 120;
// 눈 감기 효과를 위해 거리를 충분히 확보
const MAX_DISTANCE = 500;
const MIN_DISTANCE = 6;

// ── 색상 분석 헬퍼 ──
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function getColorMood(hex: string): { label: string; desc: string } {
  try {
    const { h, s, l } = hexToHsl(hex);
    if (l < 20) return { label: "깊은 어둠", desc: "내면 깊은 곳에 머무르는 조용한 에너지가 느껴집니다." };
    if (l > 80) return { label: "밝은 여백", desc: "열린 마음과 가벼운 숨결이 감지됩니다." };
    if (s < 20) return { label: "차분한 중립", desc: "감정의 소용돌이 없이 고요하게 중심을 잡고 있습니다." };
    if (h < 30 || h >= 340) return { label: "열정적인 붉음", desc: "뜨거운 감정과 강한 의지가 표면으로 올라오고 있습니다." };
    if (h < 60) return { label: "생동하는 활기", desc: "따뜻한 에너지와 낙관적인 기운이 감돕니다." };
    if (h < 150) return { label: "치유의 초록", desc: "자연스러운 성장과 회복의 흐름이 나타납니다." };
    if (h < 200) return { label: "맑은 시안", desc: "명료한 사고와 자유로운 의식이 펼쳐집니다." };
    if (h < 260) return { label: "고요한 파랑", desc: "안정된 내면과 사색적인 에너지가 자리잡고 있습니다." };
    return { label: "신비로운 보라", desc: "직관과 상상이 교차하는 깊은 내면의 흐름입니다." };
  } catch { return { label: "미지의 색", desc: "특별한 감정의 조합이 감지됩니다." }; }
}

function getObjectTypeAnalysis(type?: string): { label: string; desc: string } | null {
  if (!type) return null;
  if (type === "halo") return { label: "헤일로", desc: "주변을 감싸는 포용의 에너지. 타인을 향한 따뜻함이 오늘의 나를 감쌉니다." };
  if (type === "shards") return { label: "파편", desc: "날카로운 감각이 깨어있는 상태. 내면의 전환점 혹은 새로운 각성의 신호입니다." };
  if (type === "spark") return { label: "스파크", desc: "작지만 강렬한 점화. 지금 이 순간에 집중된 에너지가 빛납니다." };
  return null;
}

function getDailyAnalysis(planet: DailyPlanet): { mood: ReturnType<typeof getColorMood>; object: ReturnType<typeof getObjectTypeAnalysis>; summary: string } {
  const mood = getColorMood(planet.shell);
  const object = getObjectTypeAnalysis(planet.objectType);
  const summary = "AI 분석이 완료되면 이 영역에 개인 맞춤 리포트가 표시됩니다.";
  return {
    mood: {
      ...mood,
      desc: "색채 기반 해석 문장은 AI 분석 완료 후 자동으로 채워집니다.",
    },
    object: object
      ? {
        ...object,
        desc: "오브젝트 해석 문장은 AI 분석 완료 후 자동으로 채워집니다.",
      }
      : null,
    summary,
  };
}

function getDeepStarAnalysis(strokes: number | null | undefined, tone: string | null | undefined, toneColor: string): { energy: { label: string; desc: string }; tone: { label: string; desc: string }; summary: string } {
  const strokeCount = strokes ?? 0;
  const energy = strokeCount > 180
    ? { label: "활력 넘침", desc: "드로잉 에너지 해석 문장은 AI 분석 완료 후 자동으로 채워집니다." }
    : strokeCount > 80
      ? { label: "안정된 흐름", desc: "드로잉 에너지 해석 문장은 AI 분석 완료 후 자동으로 채워집니다." }
      : { label: "여백의 고요", desc: "드로잉 에너지 해석 문장은 AI 분석 완료 후 자동으로 채워집니다." };

  const colorMood = getColorMood(toneColor);
  const toneLabel = tone || colorMood.label;
  const toneResult = {
    label: toneLabel,
    desc: "내면 색채 해석 문장은 AI 분석 완료 후 자동으로 채워집니다.",
  };

  const summary = "AI 분석이 완료되면 이 영역에 HTP 기반 개인 맞춤 리포트가 표시됩니다.";
  return { energy, tone: toneResult, summary };
}

// ==========================================
// 2. 3D 컴포넌트
// ==========================================

function DeepPlanet({
  onClick, onHover, color, size = 1, glow = 1.1, seed = 0, variant = "star",
}: {
  onClick: () => void; onHover?: (data: { isHovered: boolean; x?: number; y?: number }) => void;
  color: string; size?: number; glow?: number; seed?: number; variant?: "star" | "planet";
}) {
  const [isHovered, setIsHovered] = useState(false);
  const handlers = {
    onClick,
    onPointerOver: (event: any) => { setIsHovered(true); onHover?.({ isHovered: true, x: event.clientX, y: event.clientY }); },
    onPointerOut: () => { setIsHovered(false); onHover?.({ isHovered: false }); },
  };

  return (
    <Float speed={1 + seededRandom(seed) * 1.5} rotationIntensity={variant === "star" ? 0.5 : 0.2} floatIntensity={0.5}>
      <group>
        {variant === "planet" ? (
          /* ── 데일리 행성: 정팔면체 + 고리 ── */
          <>
            {/* 메인 정팔면체 */}
            <mesh {...handlers} scale={isHovered ? [1.25, 1.25, 1.25] : [1, 1, 1]}>
              <octahedronGeometry args={[size, 0]} />
              <meshPhysicalMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isHovered ? 4.0 : 1.8}
                transparent
                opacity={0.92}
                roughness={0.15}
                metalness={0.0}
                transmission={0.4}
                thickness={0.8}
              />
            </mesh>
            {/* 외곽 글로우 */}
            <mesh scale={[1.4, 1.4, 1.4]}>
              <octahedronGeometry args={[glow * 0.55, 0]} />
              <meshBasicMaterial color={color} transparent opacity={isHovered ? 0.18 : 0.08} blending={2} depthWrite={false} />
            </mesh>
          </>
        ) : (
          /* ── 심층별: 정팔면체 결정체 ── */
          <>
            {/* 메인 별 */}
            <mesh {...handlers} scale={isHovered ? [1.2, 1.2, 1.2] : [1, 1, 1]}>
              <octahedronGeometry args={[size, 0]} />
              <meshPhysicalMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isHovered ? 5.0 : 2.5}
                transparent
                opacity={0.9}
                transmission={0.9}
                thickness={1.5}
                roughness={0}
                metalness={0.1}
                ior={2.4}
              />
            </mesh>
            {/* 잔상 후광 */}
            <mesh scale={isHovered ? [1.3, 1.3, 1.3] : [1.1, 1.1, 1.1]} rotation={[0, Math.PI / 4, 0]}>
              <octahedronGeometry args={[glow * 0.8, 0]} />
              <meshBasicMaterial color={color} transparent opacity={isHovered ? 0.3 : 0.15} blending={2} depthWrite={false} />
            </mesh>
            {/* 핵심 광원 */}
            <mesh scale={[0.3, 0.3, 0.3]}>
              <octahedronGeometry args={[size, 0]} />
              <meshBasicMaterial color="#ffffff" toneMapped={false} />
            </mesh>
          </>
        )}
      </group>
    </Float>
  );
}

/* 진입 시 별들이 중심에서 퍼져나가는 애니메이션 – 위치만 보간 (크기 유지) */
const SpreadCtx = createContext<MutableRefObject<number>>({ current: 1 });

function SpreadDriver() {
  const ref = useContext(SpreadCtx);
  const elapsed = useRef(0);
  const done = useRef(false);
  useFrame((_, delta) => {
    if (done.current) return;
    elapsed.current += delta;
    const t = Math.min(elapsed.current / 8.0, 1); // 8초간 퍼짐
    // 초반 바로 움직임(0.05 오프셋) + 후반 가속 정착
    ref.current = 0.05 * t + 0.95 * t * t * t;
    if (t >= 1) { ref.current = 1; done.current = true; }
  });
  return null;
}

/* 개별 별 위치를 (0,0,0)→target으로 useFrame 보간 */
function SpreadItem({ target, children }: { target: [number, number, number]; children: React.ReactNode }) {
  const ref = useContext(SpreadCtx);
  const groupRef = useRef<Group>(null);
  useFrame(() => {
    if (!groupRef.current) return;
    const p = ref.current;
    groupRef.current.position.set(target[0] * p, target[1] * p, target[2] * p);
  });
  return <group ref={groupRef}>{children}</group>;
}

/* constellationLines 전용: 위치만 scale (lineWidth는 px이라 불변) */
function SpreadScaleGroup({ children }: { children: React.ReactNode }) {
  const ref = useContext(SpreadCtx);
  const groupRef = useRef<Group>(null);
  useFrame(() => {
    if (!groupRef.current) return;
    const p = Math.max(ref.current, 0.001);
    groupRef.current.scale.set(p, p, p);
  });
  return <group ref={groupRef} scale={[0.001, 0.001, 0.001]}>{children}</group>;
}

function MacroGalaxy({ timelineItems, positionMap, starTone, hiddenIds }: any) {
  const meshRef = useRef<InstancedMesh>(null);
  const tempObject = useMemo(() => new Object3D(), []);
  const tempColor = useMemo(() => new Color(), []);
  const spreadRef = useContext(SpreadCtx);
  const prevSpread = useRef(-1);
  const initialized = useRef(false);

  // 색상은 한 번만 설정 + 초기 위치를 (0,0,0)으로 설정
  useEffect(() => {
    if (!meshRef.current) return;
    timelineItems.forEach((item: any, i: number) => {
      // 초기 위치 0,0,0 (spread가 아직 0이므로)
      tempObject.position.set(0, 0, 0);
      const isHidden = hiddenIds.has(item.id);
      const scale = isHidden ? 0 : (item.kind === "deep" ? 0.4 : 0.25);
      tempObject.scale.set(scale, scale, scale);
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);

      const baseColor = new Color(item.kind === "deep" ? (item.toneColor || starTone) : item.planet.shell);
      baseColor.multiplyScalar(1.2);
      meshRef.current!.setColorAt(i, new Color().set(baseColor));
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    initialized.current = true;
  }, [timelineItems, starTone, hiddenIds]);

  // 위치는 매 프레임 spread에 따라 보간
  useFrame((state) => {
    if (!meshRef.current || !initialized.current) return;
    const p = spreadRef.current;
    // spread가 변하지 않고 이미 완료된 상태면 매트릭스 안 건드림
    if (p === prevSpread.current && p >= 1) {
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.5;
      return;
    }
    prevSpread.current = p;
    timelineItems.forEach((item: any, i: number) => {
      const pos = positionMap.get(item.id) || [0, 0, 0];
      tempObject.position.set(pos[0] * p, pos[1] * p, pos[2] * p);
      const isHidden = hiddenIds.has(item.id);
      const scale = isHidden ? 0 : (item.kind === "deep" ? 0.4 : 0.25);
      tempObject.scale.set(scale, scale, scale);
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.5;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, timelineItems.length]}>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshBasicMaterial transparent opacity={0.9} blending={2} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  );
}

function GalacticDust({ count = 12500, maxRadius }: { count?: number, maxRadius: number }) {
  const pointsRef = useRef<Points>(null);

  const particleTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new Texture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const colorObj = new Color();

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * 2 * Math.PI;
      let rFactor = Math.abs(gaussianRandom() - 0.5) * 2;
      rFactor = Math.pow(rFactor, 1.5);
      const r = rFactor * (maxRadius * 3.5);
      const yFactor = (gaussianRandom() - 0.5) * 2;
      const thicknessFactor = Math.exp(-Math.pow(r / (maxRadius * 1.2), 2));
      const y = yFactor * 20.0 * thicknessFactor;

      pos[i * 3] = r * Math.cos(theta);
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = r * Math.sin(theta);

      const isCore = rFactor < 0.1 && Math.abs(yFactor) < 0.2;
      // 이미지의 색감을 반영 (코어: 불타는 오렌지/핑크, 외곽: 짙은 보라/푸른색 및 시안)
      const palette = isCore
        ? ["#fffbeb", "#fdba74", "#f97316", "#ef4444", "#ec4899"]
        : ["#a855f7", "#6366f1", "#1e1b4b", "#0f172a", "#0ea5e9"];

      colorObj.set(palette[Math.floor(Math.random() * palette.length)]);
      const fadeOut = Math.max(0.01, Math.exp(-Math.pow(r / (maxRadius * 1.5), 2)) * Math.exp(-Math.pow(yFactor * 1.5, 2)));
      col[i * 3] = colorObj.r * fadeOut;
      col[i * 3 + 1] = colorObj.g * fadeOut;
      col[i * 3 + 2] = colorObj.b * fadeOut;
    }
    return [pos, col];
  }, [count, maxRadius]);

  // 초기 위치는 0,0,0 (spread=0에서 시작)
  const zeroPositions = useMemo(() => new Float32Array(positions.length), [positions.length]);

  const spreadRef = useContext(SpreadCtx);
  const targetPositions = useRef(positions);
  targetPositions.current = positions;
  const spreadDone = useRef(false);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const p = spreadRef.current;
    // spread 진행 중일 때만 위치 보간
    if (!spreadDone.current) {
      const geo = pointsRef.current.geometry;
      const posAttr = geo.getAttribute('position');
      const arr = posAttr.array as Float32Array;
      const tgt = targetPositions.current;
      for (let i = 0; i < arr.length; i++) {
        arr[i] = tgt[i] * p;
      }
      posAttr.needsUpdate = true;
      if (p >= 1) spreadDone.current = true;
    }
    pointsRef.current.rotation.y = state.clock.elapsedTime * 0.002;
    pointsRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.2) * 1.0;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[zeroPositions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        vertexColors
        map={particleTexture}
        transparent
        opacity={0.08}
        blending={2}
        depthWrite={false}
        sizeAttenuation
        toneMapped={true} // Bloom에 과하게 반응하지 않도록 toneMapping 적용 (0~1 범위 유지)
      />
    </points>
  );
}

function ViewModeTracker({ controlsRef, onModeChange }: any) {
  const { camera } = useThree();
  const lastMode = useRef<"macro" | "micro">("micro");
  const setDockHidden = useUiStore((state: any) => state.setDockHidden);

  useFrame(() => {
    if (!controlsRef.current) return;
    const dist = camera.position.distanceTo(controlsRef.current.target);
    const currentMode = dist > ZOOM_THRESHOLD ? "macro" : "micro";

    if (currentMode !== lastMode.current) {
      lastMode.current = currentMode;
      onModeChange(currentMode);
    }

    const zoomEl = document.getElementById("zoom-indicator");
    if (zoomEl) {
      const percent = Math.max(0, Math.min(100, ((MAX_DISTANCE - dist) / (MAX_DISTANCE - MIN_DISTANCE)) * 100));
      zoomEl.style.height = `${percent}%`;
    }

    // 🔥 [시네마틱 눈 감기 로직]: DOM 요소들을 직접 제어하여 성능 확보
    const irisEl = document.getElementById("cinematic-iris");
    const topLidEl = document.getElementById("cinematic-lid-top");
    const bottomLidEl = document.getElementById("cinematic-lid-bottom");

    if (irisEl && topLidEl && bottomLidEl) {
      // 1. 홍채 비네팅 페이드인 (거리 200 ~ 350 구간)
      const irisOpacity = Math.max(0, Math.min(1, (dist - 200) / 150));
      irisEl.style.opacity = irisOpacity.toString();

      // 2. 눈꺼풀 닫힘 (거리 350 ~ 490 구간)
      const lidProgress = Math.max(0, Math.min(1, (dist - 350) / 140));
      // 부드러운 가속/감속(Easing) 곡선 적용
      const easedLid = lidProgress < 0.5 ? 2 * lidProgress * lidProgress : 1 - Math.pow(-2 * lidProgress + 2, 2) / 2;

      const lidHeightPercent = easedLid * 50; // 최고 50vh까지 내려옴
      topLidEl.style.height = `${lidHeightPercent}vh`;
      bottomLidEl.style.height = `${lidHeightPercent}vh`;

      // 3. Dock 숨김 처리 (zoom이 350 이상일 때)
      if (dist > 350) {
        setDockHidden(true);
      } else {
        setDockHidden(false);
      }
    }
  });
  return null;
}

function CameraFocus({ focusPosition, focusKey, controlsRef }: any) {
  const { camera } = useThree();
  const isActiveRef = useRef(false);
  const lastKeyRef = useRef<string | null>(null);
  const isFirstMount = useRef(true);

  useFrame(() => {
    if (!focusPosition || !controlsRef.current) return;
    if (focusKey && focusKey !== lastKeyRef.current) {
      const wasNull = lastKeyRef.current === null;
      lastKeyRef.current = focusKey;
      // 최초 마운트 시 자동 포커스는 건너뜀 (초기 카메라 위치 유지)
      if (wasNull && isFirstMount.current) {
        isFirstMount.current = false;
        return;
      }
      isActiveRef.current = true;
    }
    if (!isActiveRef.current) return;

    let targetPos = new Vector3();

    if (focusPosition.lengthSq() < 0.01) {
      const currentDir = camera.position.clone().normalize();
      if (currentDir.lengthSq() < 0.01) currentDir.set(0, 0, 1);
      targetPos = currentDir.multiplyScalar(18);
    } else {
      const dir = focusPosition.clone().normalize();
      targetPos = focusPosition.clone().add(dir.multiplyScalar(6));
    }

    camera.position.lerp(targetPos, 0.05);

    if (controlsRef.current) {
      controlsRef.current.target.lerp(new Vector3(0, 0, 0), 0.08);
      controlsRef.current.update();
    }

    // autoRotate로 인해 완벽한 수렴이 불가능하여 줌이 갇히는 현상을 방지
    if (camera.position.distanceTo(targetPos) < 2.5 && controlsRef.current?.target.lengthSq() < 0.5) {
      isActiveRef.current = false;
    }
  });
  return null;
}

function AnimatedConstellationLine({ weekKey, pts, isHovered }: { weekKey: string; pts: Vector3[]; isHovered: boolean }) {
  const lineRef = useRef<any>(null);
  const seed = useMemo(() => hashSeed(weekKey), [weekKey]);

  const { subdividedPts, vertexColors } = useMemo(() => {
    const sPts: Vector3[] = [];
    const vCols: [number, number, number][] = [];

    // 블룸 효과를 극대화하기 위해 다소 1.0을 초과하는 색상값으로 꼭짓점을 설정 (빛나는 현상 유도)
    const bright: [number, number, number] = [3.0, 3.5, 6.0];
    // 선분의 가운데로 갈수록 어두워지게 하여 블룸이 꼭짓점에만 집중되게 설정
    const faint: [number, number, number] = [0.05, 0.05, 0.1];

    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const mid = p1.clone().lerp(p2, 0.5);

      if (i === 0) {
        sPts.push(p1);
        vCols.push(bright);
      }

      sPts.push(mid);
      vCols.push(faint);

      sPts.push(p2);
      vCols.push(bright);
    }
    return { subdividedPts: sPts, vertexColors: vCols };
  }, [pts]);

  useFrame((state, delta) => {
    if (!lineRef.current?.material) return;

    if (isHovered) {
      lineRef.current.material.opacity += (0.8 - lineRef.current.material.opacity) * (delta * 10);
      lineRef.current.material.linewidth = 1.0;
    } else {
      const time = state.clock.elapsedTime;
      const speed = 0.5 + (seed % 5) * 0.1;
      const phase = seed % 100;

      const wave = Math.sin(time * speed + phase);

      let targetOpacity = 0.0;
      if (wave > 0.6) {
        targetOpacity = ((wave - 0.6) / 0.4) * 0.25;
      }

      lineRef.current.material.opacity += (targetOpacity - lineRef.current.material.opacity) * (delta * 8);
      lineRef.current.material.linewidth = 0.5;
    }
  });

  return (
    <Line
      ref={lineRef}
      points={subdividedPts}
      vertexColors={vertexColors}
      transparent
      blending={2}
      opacity={0}
      lineWidth={0.5}
    />
  );
}

function GalaxyStars() {
  const starsRef = useRef<Group>(null);
  useFrame((state) => {
    if (starsRef.current) {
      starsRef.current.rotation.y = state.clock.elapsedTime * 0.0005;
      starsRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.1) * 2.0;
    }
  });
  return (
    <group ref={starsRef}>
      <Stars radius={150} depth={50} count={6000} factor={4} saturation={0.8} fade speed={1} />
    </group>
  );
}

// ==========================================
// 3. 메인 3D Scene 컴포넌트
// ==========================================

function StarScene({
  dailyPlanets, deepStars, mypageStar, onStarClick, onDeepStarClick, onPlanetClick, onStarSelect, selectedStarId, hoveredStarId, onStarHover, onViewModeChange,
}: StarSceneProps) {
  const [viewMode, setViewMode] = useState<"macro" | "micro">("micro");
  const spreadRef = useRef(0);
  const starTone = useMemo(() => localStorage.getItem("htpToneColor") || "#f8fafc", []);

  const timelineItems = useMemo(() => {
    const deepItems = deepStars.map((star) => ({
      id: star.id, createdAt: star.createdAt, kind: "deep" as const, toneColor: star.toneColor, weekKey: star.weekKey || getWeekKey(new Date(star.createdAt))
    }));
    const dailyItems = dailyPlanets.map((planet) => ({
      id: planet.id, createdAt: planet.createdAt, kind: "daily" as const, planet, weekKey: getWeekKey(new Date(planet.createdAt))
    }));
    return [...deepItems, ...dailyItems].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [dailyPlanets, deepStars]);

  const uniqueWeeksCount = useMemo(() => Array.from(new Set(timelineItems.map(item => item.weekKey))).filter(Boolean).length, [timelineItems]);
  const minRadius = 12.0;
  const maxRadius = Math.max(18.0, minRadius + Math.pow(uniqueWeeksCount, 0.6) * 3.5);

  const timelinePositions = useMemo(() => {
    const uniqueWeeks = Array.from(new Set(timelineItems.map(item => item.weekKey))).filter(Boolean) as string[];
    const weekCenters = new Map<string, Vector3>();
    const THICKNESS = 20.0;

    uniqueWeeks.forEach((weekKey) => {
      const seed = hashSeed(weekKey);
      const theta = seededRandom(seed) * 2 * Math.PI;
      const rBias = Math.pow(seededRandom(seed + 1), 1.5);
      const radius = minRadius + rBias * (maxRadius - minRadius);

      const thicknessRatio = Math.exp(-Math.pow((radius - minRadius) / (maxRadius * 0.6), 2));
      const yNoise = (seededGaussian(seed + 2) - 0.5) * 2.0;
      const y = yNoise * THICKNESS * thicknessRatio;

      const x = radius * Math.cos(theta);
      const z = radius * Math.sin(theta);

      weekCenters.set(weekKey, new Vector3(x, y, z));
    });

    return timelineItems.map((item) => {
      const centerPos = (item.weekKey ? weekCenters.get(item.weekKey) : null) || new Vector3(20, 0, 0);

      if (item.kind === "deep") {
        return { id: item.id, position: [centerPos.x, centerPos.y, centerPos.z] as [number, number, number] };
      }

      const seed = hashSeed(item.id);
      const localTheta = seededRandom(seed) * 2 * Math.PI;
      const localPhi = Math.acos(2 * seededRandom(seed + 1) - 1);
      const localR = 2.0 + seededRandom(seed + 2) * 5.0;

      const dx = localR * Math.sin(localPhi) * Math.cos(localTheta);
      const dy = localR * Math.cos(localPhi);
      const dz = localR * Math.sin(localPhi) * Math.sin(localTheta);

      return { id: item.id, position: [centerPos.x + dx, centerPos.y + dy, centerPos.z + dz] as [number, number, number] };
    });
  }, [timelineItems, maxRadius, minRadius]);

  const positionMap = useMemo(() => new Map(timelinePositions.map((i) => [i.id, i.position])), [timelinePositions]);

  const constellationLines = useMemo(() => {
    const groups = new Map<string, typeof timelineItems>();
    timelineItems.forEach(item => {
      if (!item.weekKey) return;
      if (!groups.has(item.weekKey)) groups.set(item.weekKey, []);
      groups.get(item.weekKey)!.push(item);
    });

    const lines: { weekKey: string, pts: Vector3[] }[] = [];
    groups.forEach((items, weekKey) => {
      const hasDeep = items.some(i => i.kind === "deep");
      if (hasDeep) {
        const sorted = [...items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const pts = sorted
          .map(i => positionMap.get(i.id))
          .filter(Boolean)
          .map(pos => new Vector3(...(pos as [number, number, number])));

        if (pts.length > 1) lines.push({ weekKey, pts });
      }
    });
    return lines;
  }, [timelineItems, positionMap]);

  const selectedFocus = useMemo(() => {
    if (selectedStarId === mypageStar.id) return new Vector3(0, 0, 0);
    const match = selectedStarId ? positionMap.get(selectedStarId) : null;
    return match ? new Vector3(...match) : null;
  }, [positionMap, selectedStarId, mypageStar]);

  const hoveredWeekKey = useMemo(() => {
    if (!hoveredStarId || hoveredStarId === mypageStar.id) return null;
    const hoveredItem = timelineItems.find(item => item.id === hoveredStarId);
    return hoveredItem ? hoveredItem.weekKey : null;
  }, [hoveredStarId, timelineItems, mypageStar.id]);

  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  const detailedItems = useMemo(() => {
    if (viewMode === "macro") return [];
    const focusPos = selectedFocus || new Vector3(0, 0, 0);
    return timelineItems
      .map(item => {
        const pos = positionMap.get(item.id) || [0, 0, 0];
        const distSq = Math.pow(pos[0] - focusPos.x, 2) + Math.pow(pos[1] - focusPos.y, 2) + Math.pow(pos[2] - focusPos.z, 2);
        return { item, distSq };
      })
      .sort((a, b) => a.distSq - b.distSq)
      .map(d => d.item);
  }, [timelineItems, positionMap, selectedFocus, viewMode]);

  const detailedItemIds = useMemo(() => new Set(detailedItems.map(i => i.id)), [detailedItems]);

  return (
    <div className="absolute inset-0 bg-[#000000]">
      <Canvas camera={{ position: [0, 105, 0.1], fov: 45 }}>
        <ambientLight intensity={0.15} color="#4c1d95" />
        <pointLight position={[0, 0, 0]} intensity={150} color="#f97316" distance={60} decay={2} />

        <EffectComposer enableNormalPass={false} multisampling={0}>
          {/* Threshold를 1.0 이상으로 높여 Emissive가 높은 핵심 광원만 Bloom이 발생하도록 설정 */}
          <Bloom luminanceThreshold={1.1} mipmapBlur luminanceSmoothing={0.1} intensity={1.5} />
        </EffectComposer>

        <SpreadCtx.Provider value={spreadRef}>
        <SpreadDriver />

        <GalaxyStars />

        <ViewModeTracker controlsRef={controlsRef} onModeChange={(m: "macro" | "micro") => { setViewMode(m); onViewModeChange?.(m); }} />

        <group position={[0, 0, 0]}>
          <Float speed={1.2} rotationIntensity={0.5} floatIntensity={0.8} floatingRange={[-0.3, 0.3]}>
            <DeepPlanet onClick={() => { onStarSelect?.(mypageStar.id); onStarClick(); }} color={mypageStar.toneColor} size={viewMode === "macro" ? 0.5 : 0.8} glow={1.0} seed={999} />
          </Float>
        </group>

        <GalacticDust count={12500} maxRadius={maxRadius} />

        <SpreadScaleGroup>
          {constellationLines.map(({ weekKey, pts }, idx) => (
            <AnimatedConstellationLine
              key={`constellation-${idx}`}
              weekKey={weekKey}
              pts={pts}
              isHovered={hoveredWeekKey === weekKey}
            />
          ))}
        </SpreadScaleGroup>

        <MacroGalaxy timelineItems={timelineItems} positionMap={positionMap} starTone={starTone} hiddenIds={detailedItemIds} />

        {detailedItems.map((item) => {
          const position = positionMap.get(item.id) || [0, 0, 0];
          return (
            <SpreadItem key={item.id} target={position as [number, number, number]}>
              <DeepPlanet
                onClick={() => { onStarSelect?.(item.id); item.kind === "deep" ? onDeepStarClick?.(item as unknown as DeepStar) : onPlanetClick(item.planet); }}
                onHover={(data) => onStarHover?.({ id: data.isHovered ? item.id : null, x: data.x, y: data.y })}
                color={item.kind === "deep" ? (item.toneColor || starTone) : item.planet.shell}
                variant={item.kind === "deep" ? "star" : "planet"}
                size={item.kind === "deep" ? 0.55 : 0.22}
                glow={item.kind === "deep" ? 0.8 : 0.35}
                seed={hashSeed(item.id)}
              />
            </SpreadItem>
          );
        })}
        </SpreadCtx.Provider>

        <CameraFocus focusPosition={selectedFocus} focusKey={selectedStarId} controlsRef={controlsRef} />

        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          minDistance={MIN_DISTANCE}
          maxDistance={MAX_DISTANCE}
          autoRotate
          autoRotateSpeed={0.05}
          zoomSpeed={1}
        />
      </Canvas>
    </div>
  );
}

// ==========================================
// 4. My Universe 모달
// ==========================================

function MyUniverseModal({ isOpen, onClose, mypageStar, dailyPlanets, deepStars }: {
  isOpen: boolean;
  onClose: () => void;
  mypageStar: { id: string; toneColor: string; label: string; createdAt: string };
  dailyPlanets: DailyPlanet[];
  deepStars: DeepStar[];
}) {
  const [tab, setTab] = useState<"overview" | "daily" | "deep">("overview");
  const [selectedItem, setSelectedItem] = useState<
    | { type: "daily"; data: DailyPlanet }
    | { type: "deep"; data: DeepStar & { tone?: string; strokes?: number; drawingImage?: string | null } }
    | null
  >(null);

  useEffect(() => {
    if (isOpen) { setTab("overview"); setSelectedItem(null); }
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedItem) setSelectedItem(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, selectedItem]);

  if (!isOpen) return null;

  const totalRecords = dailyPlanets.length + deepStars.length;
  const uniqueWeeks = new Set([
    ...dailyPlanets.map(p => getWeekKey(new Date(p.createdAt))),
    ...deepStars.map(s => s.weekKey || getWeekKey(new Date(s.createdAt))),
  ]).size;

  const TABS = [
    { key: "overview" as const, label: "개요" },
    { key: "daily" as const, label: `데일리 (${dailyPlanets.length})` },
    { key: "deep" as const, label: `심층 (${deepStars.length})` },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative mx-4 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/95 shadow-2xl">
        {/* 상단 헤더 */}
        <div className="relative px-7 pt-7 pb-5 flex-shrink-0">
          {/* 배경 글로우 */}
          <div
            className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 h-40 w-40 rounded-full blur-3xl opacity-30"
            style={{ backgroundColor: mypageStar.toneColor }}
          />
          <div className="flex items-center gap-4 relative z-10">
            {/* 중심별 아이콘 */}
            <div
              className="flex-shrink-0 h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ backgroundColor: mypageStar.toneColor + "33", border: `1px solid ${mypageStar.toneColor}55` }}
            >
              <div className="h-6 w-6 rotate-45 rounded-sm" style={{ backgroundColor: mypageStar.toneColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400 mb-1">My Universe</p>
              <h2 className="text-xl font-bold text-slate-100 truncate">{mypageStar.label}</h2>
              <p className="text-xs text-slate-400 mt-0.5">총 {totalRecords}개 기록 · {uniqueWeeks}주</p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 h-8 w-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              aria-label="닫기"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>

          {/* 탭 */}
          <div className="flex gap-1 mt-5 rounded-xl bg-white/5 p-1">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setSelectedItem(null); }}
                className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all duration-200 ${tab === t.key
                  ? "bg-white/15 text-slate-100 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 탭 콘텐츠 */}
        <div className="flex-1 overflow-y-auto px-7 pb-7 custom-scrollbar">

          {/* ── 개요 탭 ── */}
          {tab === "overview" && (
            <div className="space-y-4">
              {/* 통계 카드 */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "전체 기록", value: totalRecords, unit: "개" },
                  { label: "데일리", value: dailyPlanets.length, unit: "개" },
                  { label: "심층 (HTP)", value: deepStars.length, unit: "개" },
                ].map(stat => (
                  <div key={stat.label} className="rounded-2xl border border-white/8 bg-white/5 p-4 text-center">
                    <p className="text-2xl font-bold text-slate-100">{stat.value}<span className="text-sm font-normal text-slate-400 ml-0.5">{stat.unit}</span></p>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* 나의 톤 */}
              <div className="rounded-2xl border border-white/8 bg-white/5 p-5">
                <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400 mb-3">나의 감정 톤</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl flex-shrink-0" style={{ backgroundColor: mypageStar.toneColor, boxShadow: `0 0 20px ${mypageStar.toneColor}66` }} />
                  <div>
                    <p className="text-base font-semibold text-slate-100">{mypageStar.toneColor}</p>
                    <p className="text-xs text-slate-400 mt-0.5">중심별 색상</p>
                  </div>
                </div>
              </div>

              {/* 최근 활동 */}
              {totalRecords > 0 && (
                <div className="rounded-2xl border border-white/8 bg-white/5 p-5">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400 mb-3">최근 활동</p>
                  <div className="space-y-2">
                    {[
                      ...dailyPlanets.map(p => ({ type: "daily" as const, id: p.id, color: p.shell, label: p.memo || "데일리 기록", date: p.createdAt, raw: p })),
                      ...deepStars.map(s => ({ type: "deep" as const, id: s.id, color: s.toneColor, label: s.label || "심층 기록", date: s.createdAt, raw: s })),
                    ]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 5)
                      .map((item, i) => (
                        <button
                          key={i}
                          onClick={() => item.type === "daily"
                            ? setSelectedItem({ type: "daily", data: item.raw as DailyPlanet })
                            : setSelectedItem({ type: "deep", data: item.raw as any })
                          }
                          className="w-full flex items-center gap-3 rounded-xl hover:bg-white/5 px-2 py-1.5 transition-colors text-left"
                        >
                          <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="flex-1 text-xs text-slate-300 truncate">{item.label}</span>
                          <span className="text-[10px] text-slate-500 flex-shrink-0">{formatDate(item.date)}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${item.type === "deep" ? "bg-violet-500/20 text-violet-300" : "bg-sky-500/20 text-sky-300"}`}>
                            {item.type === "deep" ? "심층" : "데일리"}
                          </span>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 text-slate-600 flex-shrink-0"><path d="M9 18l6-6-6-6" /></svg>
                        </button>
                      ))
                    }
                  </div>
                </div>
              )}

              {totalRecords === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
                  <p className="text-slate-400 text-sm">아직 기록이 없어요</p>
                  <p className="text-slate-500 text-xs mt-1">데일리 또는 HTP 기록을 시작해보세요</p>
                </div>
              )}
            </div>
          )}

          {/* ── 데일리 탭 ── */}
          {tab === "daily" && (
            <div className="space-y-3">
              {dailyPlanets.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
                  <p className="text-slate-400 text-sm">데일리 기록이 없어요</p>
                </div>
              ) : (
                [...dailyPlanets]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((planet, i) => (
                    <button
                      key={planet.id || i}
                      onClick={() => setSelectedItem({ type: "daily", data: planet })}
                      className="w-full rounded-2xl border border-white/8 bg-white/5 hover:bg-white/10 p-4 flex items-start gap-4 transition-colors text-left"
                    >
                      {/* 행성 색상 */}
                      <div
                        className="flex-shrink-0 mt-0.5 h-9 w-9 rounded-xl"
                        style={{
                          background: `radial-gradient(circle at 35% 35%, ${planet.shell}cc, ${planet.core || planet.shell}88)`,
                          boxShadow: `0 0 12px ${planet.shell}44`,
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-medium text-slate-200 truncate">
                            {planet.memo ? planet.memo.slice(0, 30) + (planet.memo.length > 30 ? "…" : "") : "데일리 행성"}
                          </span>
                          <span className="text-[10px] text-slate-500 flex-shrink-0">{formatDate(planet.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300">데일리</span>
                          {planet.objectType && <span className="text-[10px] text-slate-500">{planet.objectType}</span>}
                        </div>
                      </div>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-slate-600 flex-shrink-0 mt-2"><path d="M9 18l6-6-6-6" /></svg>
                    </button>
                  ))
              )}
            </div>
          )}

          {/* ── 심층 탭 ── */}
          {tab === "deep" && (
            <div className="space-y-3">
              {deepStars.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
                  <p className="text-slate-400 text-sm">심층 기록이 없어요</p>
                  <p className="text-slate-500 text-xs mt-1">HTP 검사를 통해 심층 별을 만들어보세요</p>
                </div>
              ) : (
                [...deepStars]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((star, i) => (
                    <button
                      key={star.id || i}
                      onClick={() => setSelectedItem({ type: "deep", data: star as any })}
                      className="w-full rounded-2xl border border-white/8 bg-white/5 hover:bg-white/10 p-4 flex items-start gap-4 transition-colors text-left"
                    >
                      {/* 별 아이콘 */}
                      <div
                        className="flex-shrink-0 mt-0.5 h-9 w-9 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: star.toneColor + "22", border: `1px solid ${star.toneColor}44` }}
                      >
                        <div className="h-4 w-4 rotate-45 rounded-sm" style={{ backgroundColor: star.toneColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-medium text-slate-200">{star.label || "심층 별"}</span>
                          <span className="text-[10px] text-slate-500 flex-shrink-0">{formatDate(star.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300">HTP</span>
                          {star.weekKey && <span className="text-[10px] text-slate-500">{star.weekKey}</span>}
                        </div>
                      </div>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-slate-600 flex-shrink-0 mt-2"><path d="M9 18l6-6-6-6" /></svg>
                    </button>
                  ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 상세 리포트 패널 ── */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedItem(null); }}
        >
          <div className="relative mx-4 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl">
            {/* 리포트 헤더 */}
            <div className="relative px-8 pt-7 pb-5 flex-shrink-0">
              <div
                className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 h-28 w-28 rounded-full blur-3xl opacity-40"
                style={{ backgroundColor: selectedItem.type === "daily" ? selectedItem.data.shell : (selectedItem.data as any).toneColor }}
              />
              <div className="flex items-center gap-3 relative z-10">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="flex-shrink-0 h-8 w-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                  aria-label="뒤로"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">
                    {selectedItem.type === "daily" ? "Daily Report" : "Deep Star Report"}
                  </p>
                  <h3 className="text-base font-bold text-slate-100 truncate mt-0.5">
                    {selectedItem.type === "daily"
                      ? (selectedItem.data.memo?.slice(0, 24) || "데일리 행성")
                      : ((selectedItem.data as any).label || "심층 별")}
                  </h3>
                </div>
                <span className="text-[10px] text-slate-500 flex-shrink-0">
                  {formatDate(selectedItem.data.createdAt)}
                </span>
              </div>
            </div>

            {/* 리포트 본문 */}
            <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar space-y-5">

              {/* ── 데일리 리포트 ── */}
              {selectedItem.type === "daily" && (() => {
                const p = selectedItem.data;
                return (
                  <>
                    {/* 행성 시각화 */}
                    <div className="flex justify-center py-4">
                      <div
                        className="h-24 w-24 rounded-full shadow-2xl"
                        style={{
                          background: `radial-gradient(circle at 35% 30%, ${p.shell}ff, ${p.core || p.shell}88, ${p.shell}33)`,
                          boxShadow: `0 0 40px ${p.shell}66, 0 0 80px ${p.shell}33`,
                        }}
                      />
                    </div>

                    {/* 색상 정보 */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">Shell 색상</p>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-lg flex-shrink-0" style={{ backgroundColor: p.shell }} />
                          <span className="text-xs text-slate-200 font-mono">{p.shell}</span>
                        </div>
                      </div>
                      {p.core && (
                        <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">Core 색상</p>
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-lg flex-shrink-0" style={{ backgroundColor: p.core }} />
                            <span className="text-xs text-slate-200 font-mono">{p.core}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 메모 */}
                    {p.memo && (
                      <div className="rounded-2xl border border-white/8 bg-white/5 p-5">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">오늘의 한 줄</p>
                        <p className="text-sm text-slate-200 leading-relaxed">"{p.memo}"</p>
                      </div>
                    )}

                    {/* 오브젝트 타입 */}
                    {p.objectType && (
                      <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">오브젝트 타입</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-1 rounded-full bg-sky-500/15 text-sky-300">{p.objectType}</span>
                          {p.objectColor && <div className="h-5 w-5 rounded-full" style={{ backgroundColor: p.objectColor }} />}
                        </div>
                      </div>
                    )}

                    {/* 날짜 */}
                    <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">기록 일시</p>
                      <p className="text-sm text-slate-200">{new Date(p.createdAt).toLocaleString("ko-KR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </>
                );
              })()}

              {/* ── 심층 리포트 ── */}
              {selectedItem.type === "deep" && (() => {
                const s = selectedItem.data as any;
                return (
                  <>
                    {/* 별 시각화 */}
                    <div className="flex justify-center py-4">
                      <div
                        className="h-20 w-20 rotate-45 rounded-2xl shadow-2xl"
                        style={{
                          backgroundColor: s.toneColor,
                          boxShadow: `0 0 40px ${s.toneColor}88, 0 0 80px ${s.toneColor}44`,
                        }}
                      />
                    </div>

                    {/* 톤 정보 */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">감정 톤</p>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-lg flex-shrink-0" style={{ backgroundColor: s.toneColor }} />
                          <span className="text-xs text-slate-200">{s.tone || "—"}</span>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">에너지</p>
                        <p className="text-sm font-semibold text-slate-100">
                          {s.strokes != null ? (s.strokes > 180 ? "활력" : s.strokes > 80 ? "안정" : "여백") : "—"}
                        </p>
                      </div>
                    </div>

                    {/* 주차 & 라벨 */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">주차</p>
                        <p className="text-sm text-slate-200">{s.weekKey || "—"}</p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">라벨</p>
                        <p className="text-sm text-slate-200">{s.label || "—"}</p>
                      </div>
                    </div>

                    {/* 획 수 */}
                    {s.strokes != null && (
                      <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">총 획 수</p>
                        <p className="text-2xl font-bold text-slate-100">{s.strokes}<span className="text-sm font-normal text-slate-400 ml-1">획</span></p>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.min(100, (s.strokes / 200) * 100)}%`, backgroundColor: s.toneColor }}
                          />
                        </div>
                      </div>
                    )}

                    {/* HTP 드로잉 이미지 */}
                    {s.drawingImage && (
                      <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-3">HTP 드로잉</p>
                        <img
                          src={s.drawingImage}
                          alt="HTP 드로잉"
                          className="w-full rounded-xl object-contain max-h-48 bg-white/5"
                        />
                      </div>
                    )}

                    {/* 날짜 */}
                    <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">기록 일시</p>
                      <p className="text-sm text-slate-200">{new Date(s.createdAt).toLocaleString("ko-KR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 5. 메인 페이지 (UI)
// ==========================================

function HomePage() {
  const navigate = useNavigate();
  const [isMyUniverseOpen, setIsMyUniverseOpen] = useState(false);
  const [selectedDeepStar, setSelectedDeepStar] = useState<any>(null);
  const [isDailyReportOpen, setIsDailyReportOpen] = useState(false);
  const [selectedDailyPlanet, setSelectedDailyPlanet] = useState<DailyPlanet | null>(null);
  const [selectedStarId, setSelectedStarId] = useState<string | null>(null);
  const [hoveredPlanet, setHoveredPlanet] = useState<{ id: string; x: number; y: number } | null>(null);
  const [viewMode, setViewMode] = useState<"macro" | "micro">("micro");
  const [isTimelineOpen, setIsTimelineOpen] = useState(true);

  const isMacro = viewMode === "macro";
  const hoverClearTimerRef = useRef<number | null>(null);
  const isTooltipHoverRef = useRef(false);


  const mypageStar = useMemo(() => {
    const s = localStorage.getItem("mypageStar");
    if (s) {
      try {
        const parsed = JSON.parse(s);
        if (parsed && parsed.id) return parsed;
      } catch { }
    }
    return {
      id: "center-mypage-star",
      createdAt: new Date().toISOString(),
      toneColor: "#f8fafc",
      label: "나의 중심",
    };
  }, []);

  const [stars, setStars] = useState<StarItem[]>([]);
  const [timelineItems, setTimelineItems] = useState<any[]>([]);

  // 컴포넌트 로드 시 지도(별) 조회
  useEffect(() => {
    const fetchStars = async () => {
      try {
        const res = await starApi.getStarMap();
        // res는 ApiResponse<StarMapResponse> 이므로 res.success와 res.data를 바로 참조
        if (res.success && res.data?.stars && res.data.stars.length > 0) {
          const fetchedStars = res.data.stars;
          setStars(fetchedStars);

          const grouped = fetchedStars.map(s => ({
            id: s.id.toString(),
            kind: (s.kind || "daily").toLowerCase(),
            color: s.starColor,
            label: s.kind === "DAILY" ? "데일리 행성" : "심층 별",
            weekKey: s.weekStartDate || getWeekKey(new Date()),
            createdAt: new Date().toISOString(), // 정렬용
            x: s.x,
            y: s.y,
            original: s
          }));
          setTimelineItems(grouped);
        } else {
          throw new Error("No data from API or success is false");
        }
      } catch (e) {
        console.error("fetch star map fail, using fallback mock data:", e);

        // 백엔드 미동작 시 임시 Mock 표시를 위한 Fallback 로직
        const sDaily = localStorage.getItem("dailyPlanets");
        const sDeep = localStorage.getItem("deepStars");

        let dPlanets = sDaily ? JSON.parse(sDaily) : [];
        let dStars = sDeep ? JSON.parse(sDeep) : [];

        const processFallback = (dp: any[], ds: any[]) => {
          const mappedDaily = dp.map(p => ({
            id: p.id,
            kind: "DAILY",
            starColor: p.shell,
            x: 0, y: 0, size: 0.8, shapeType: "CIRCLE",
            createdAt: p.createdAt,
            weekStartDate: getWeekKey(new Date(p.createdAt)),
            original: p
          }));
          const mappedDeep = ds.map(p => ({
            id: p.id,
            kind: "DEEP",
            starColor: p.toneColor,
            x: 0, y: 0, size: 1.5, shapeType: "OCTAHEDRON",
            createdAt: p.createdAt,
            weekStartDate: getWeekKey(new Date(p.createdAt)),
            original: p
          }));

          const fetchedStars = [...mappedDaily, ...mappedDeep];
          setStars(fetchedStars as any);

          const grouped = fetchedStars.map(s => ({
            id: s.id.toString(),
            kind: s.kind.toLowerCase(),
            color: s.starColor,
            label: s.kind === "daily" ? s.original.memo?.slice(0, 8) || "데일리 행성" : s.original.label || "심층 별",
            weekKey: s.weekStartDate || getWeekKey(new Date(s.createdAt)),
            createdAt: s.createdAt,
            x: s.x,
            y: s.y,
            original: s.original
          }));
          setTimelineItems(grouped);
        };

        if (dPlanets.length === 0 || dStars.length === 0) {
          import("../../utils/mockData").then(({ generateMockPlanets }) => {
            const mocks = generateMockPlanets();
            processFallback(mocks.dailyPlanets, mocks.deepStars);
          });
        } else {
          processFallback(dPlanets, dStars);
        }
      }
    };
    fetchStars();
  }, []);

  const dailyPlanets = useMemo(() => stars.filter(s => s.kind === "DAILY") as any[], [stars]);
  const deepStars = useMemo(() => stars.filter(s => s.kind === "DEEP") as any[], [stars]);

  useEffect(() => {
    if (!selectedStarId && mypageStar) {
      setSelectedStarId(mypageStar.id);
    }
  }, [selectedStarId, mypageStar]);

  const hoveredPlanetMeta = useMemo(() => (hoveredPlanet ? timelineItems.find(i => i.id === hoveredPlanet.id) : null), [hoveredPlanet, timelineItems]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-slate-100 animate-[fadeIn_0.6s_ease-out]"
      style={{ animation: "fadeIn 0.6s ease-out" }}
    >

      {/* 🔥 [시네마틱 눈꺼풀 & 눈동자 UI 레이어] */}
      {/* 홍채(Iris): 화면 밖으로 멀어질수록 비네팅처럼 눈동자 경계선 생성 */}
      <div
        id="cinematic-iris"
        className="pointer-events-none fixed inset-0 z-30 opacity-0 transition-opacity duration-100"
        style={{ background: 'radial-gradient(circle at center, transparent 20%, rgba(10, 5, 25, 0.7) 60%, #000000 95%)' }}
      />
      {/* 위 눈꺼풀 */}
      <div
        id="cinematic-lid-top"
        className="pointer-events-none fixed top-0 left-0 right-0 z-40 bg-black"
        style={{ height: '0vh', borderBottomLeftRadius: '50% 10vh', borderBottomRightRadius: '50% 10vh' }}
      />
      {/* 아래 눈꺼풀 */}
      <div
        id="cinematic-lid-bottom"
        className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 bg-black"
        style={{ height: '0vh', borderTopLeftRadius: '50% 10vh', borderTopRightRadius: '50% 10vh' }}
      />

      <div className={`pointer-events-none fixed left-0 right-0 top-24 z-20 flex justify-center transition-opacity duration-700 ${isMacro ? "opacity-100" : "opacity-0"}`}>
        <div className="rounded-full border border-white/10 bg-black/40 px-6 py-2 text-xs tracking-widest text-slate-300 backdrop-blur-md shadow-lg">
          마우스 휠을 당겨 상세 기록을 확인하세요
        </div>
      </div>

      <div className="pointer-events-none fixed right-6 top-1/2 z-40 h-48 w-1.5 -translate-y-1/2 rounded-full bg-slate-800/40 shadow-inner backdrop-blur-md">
        <div
          id="zoom-indicator"
          className="absolute bottom-0 w-full rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all duration-75"
          style={{ height: "0%" }}
        />
      </div>

      <StarScene
        dailyPlanets={dailyPlanets} deepStars={deepStars} mypageStar={mypageStar}
        onViewModeChange={setViewMode} onStarSelect={setSelectedStarId}
        hoveredStarId={hoveredPlanet?.id || null}
        onStarClick={() => setIsMyUniverseOpen(true)}
        onDeepStarClick={(star) => setSelectedDeepStar(star)}
        onPlanetClick={(p) => { setSelectedDailyPlanet(p); setIsDailyReportOpen(true); }}
        onStarHover={(d) => {
          if (d.id) {
            if (hoverClearTimerRef.current) window.clearTimeout(hoverClearTimerRef.current);
            setHoveredPlanet({ id: d.id, x: d.x!, y: d.y! });
          } else {
            hoverClearTimerRef.current = window.setTimeout(() => { if (!isTooltipHoverRef.current) setHoveredPlanet(null); }, 200);
          }
        }}
        selectedStarId={selectedStarId}
      />

      {!isMacro && hoveredPlanetMeta && hoveredPlanet && (
        <div
          className="fixed z-40 w-44 rounded-xl border border-white/15 bg-slate-950/80 p-3 text-xs text-slate-200 backdrop-blur shadow-2xl pointer-events-auto"
          style={{ left: hoveredPlanet.x + 12, top: hoveredPlanet.y + 12 }}
          onMouseEnter={() => isTooltipHoverRef.current = true}
          onMouseLeave={() => { isTooltipHoverRef.current = false; setHoveredPlanet(null); }}
        >
          <div className="flex items-center justify-between font-medium">
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: hoveredPlanetMeta.color }} />{hoveredPlanetMeta.label}</span>
          </div>
        </div>
      )}

      {/* Timeline HUD Panel */}
      <div
        className={`fixed left-6 top-24 z-30 flex flex-col rounded-2xl border border-white/10 bg-slate-950/50 shadow-2xl backdrop-blur-md transition-all duration-700 overflow-hidden w-72 ${isMacro ? "-translate-x-[120%] opacity-0 pointer-events-none" : "translate-x-0 opacity-100 pointer-events-auto"} ${isTimelineOpen ? "max-h-[calc(100vh-14rem)]" : "max-h-[64px]"}`}
      >
        <div
          className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/5 transition-colors"
          onClick={() => setIsTimelineOpen(!isTimelineOpen)}
        >
          <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">Timeline</p>
          <button
            className="text-slate-400 hover:text-white transition group p-1"
            aria-label={isTimelineOpen ? "최소화" : "펼치기"}
          >
            {isTimelineOpen ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
            )}
          </button>
        </div>

        <div className={`flex flex-col flex-1 overflow-hidden px-5 transition-opacity duration-300 ${isTimelineOpen ? "opacity-100 pb-5" : "opacity-0 pb-0"}`}>
          <div className="flex justify-between rounded-xl bg-white/5 p-3 text-xs font-bold text-slate-100">
            <div>전체 {timelineItems.length}</div>
            <div>데일리 {dailyPlanets.length}</div>
          </div>
          <div className="mt-4 flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
            <button onClick={() => setSelectedStarId(mypageStar.id)} className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-xs transition-colors hover:bg-white/10 ${selectedStarId === mypageStar.id ? "bg-white/15 ring-1 ring-white/20" : ""}`}>
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: mypageStar.toneColor }} />{mypageStar.label} (중심)</span>
            </button>
            {timelineItems.map((item) => (
              <button key={item.id} onClick={() => setSelectedStarId(item.id)} className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-xs transition-colors hover:bg-white/10 ${selectedStarId === item.id ? "bg-white/15 ring-1 ring-white/20" : ""}`}>
                <span className="flex items-center gap-2"><span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</span>
                <span className="text-[10px] text-slate-400 flex-shrink-0">{formatDate(item.createdAt)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`fixed bottom-7 left-1/2 z-30 transition-all duration-700 ${isMacro ? "translate-y-[120%] -translate-x-1/2 opacity-0" : "translate-y-0 -translate-x-1/2 opacity-100 pointer-events-auto"}`}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/daily/content")}
            className="liquid-btn liquid-btn--daily min-w-[108px] px-4 py-2 text-sm"
          >
            데일리
          </button>
          <button
            onClick={() => navigate("/deep/content")}
            className="liquid-btn liquid-btn--deep min-w-[108px] px-4 py-2 text-sm"
          >
            심층
          </button>
        </div>
      </div>

      <MyUniverseModal
        isOpen={isMyUniverseOpen}
        onClose={() => setIsMyUniverseOpen(false)}
        mypageStar={mypageStar}
        dailyPlanets={dailyPlanets}
        deepStars={deepStars}
      />

      {/* 3D씬에서 비중심 심층별 클릭 시 직접 리포트 모달 */}
      {selectedDeepStar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedDeepStar(null); }}
        >
          <div className="relative mx-4 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl">
            {/* 헤더 */}
            <div className="relative px-8 pt-7 pb-5 flex-shrink-0">
              <div
                className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 h-28 w-28 rounded-full blur-3xl opacity-40"
                style={{ backgroundColor: selectedDeepStar.toneColor }}
              />
              <div className="flex items-center gap-3 relative z-10">
                <div
                  className="flex-shrink-0 h-10 w-10 flex items-center justify-center ml-2 mr-2"
                >
                  {/* 심층별 헤더 아이콘: 뾰족한 정팔면체 (다이아몬드) */}
                  <div
                    className="h-8 w-8 rotate-45 rounded-sm shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${selectedDeepStar.toneColor}ff, ${selectedDeepStar.toneColor}88)`,
                      boxShadow: `0 0 15px ${selectedDeepStar.toneColor}66`
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">Deep Star Report</p>
                  <h3 className="text-base font-bold text-slate-100 truncate mt-0.5">{selectedDeepStar.label || "심층 별"}</h3>
                </div>
                <button
                  onClick={() => setSelectedDeepStar(null)}
                  className="flex-shrink-0 h-8 w-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            {/* 본문 */}
            <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar space-y-5">
              {/* 별 시각화 */}
              <div className="flex justify-center py-6">
                {/* 심층별 본문 시각화: 큰 정팔면체 */}
                <div
                  className="h-20 w-20 rotate-45 rounded-sm shadow-2xl"
                  style={{
                    background: `linear-gradient(135deg, ${selectedDeepStar.toneColor}ff, ${selectedDeepStar.toneColor}88)`,
                    boxShadow: `0 0 40px ${selectedDeepStar.toneColor}88, 0 0 80px ${selectedDeepStar.toneColor}44`
                  }}
                />
              </div>
              {/* ── 분석 ── */}
              {(() => {
                const analysis = getDeepStarAnalysis(selectedDeepStar.strokes, selectedDeepStar.tone, selectedDeepStar.toneColor);
                return (
                  <>
                    <div className="rounded-2xl border border-white/8 bg-gradient-to-br from-white/5 to-white/[0.02] p-5">
                      <p className="mb-2 text-[10px] uppercase tracking-[0.35em] text-slate-400">✦ AI 분석 리포트</p>
                      <p className="text-sm text-slate-200 leading-relaxed">{analysis.summary}</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">드로잉 에너지</p>
                        <p className="text-sm font-semibold text-slate-100 mb-1">{analysis.energy.label}</p>
                        <p className="text-xs text-slate-300 leading-relaxed">{analysis.energy.desc.split('.')[0]}.</p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">내면의 색채</p>
                        <p className="text-sm font-semibold text-slate-100 mb-1">{analysis.tone.label}</p>
                        <p className="text-xs text-slate-300 leading-relaxed">{analysis.tone.desc.split('.')[0]}.</p>
                      </div>
                    </div>
                  </>
                );
              })()}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">감정 톤</p>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg flex-shrink-0" style={{ backgroundColor: selectedDeepStar.toneColor }} />
                    <span className="text-xs text-slate-200">{selectedDeepStar.tone || "—"}</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">에너지</p>
                  <p className="text-sm font-semibold text-slate-100">
                    {selectedDeepStar.strokes != null ? (selectedDeepStar.strokes > 180 ? "활력" : selectedDeepStar.strokes > 80 ? "안정" : "여백") : "—"}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">주차</p>
                  <p className="text-sm text-slate-200">{selectedDeepStar.weekKey || "—"}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">라벨</p>
                  <p className="text-sm text-slate-200">{selectedDeepStar.label || "—"}</p>
                </div>
              </div>
              {selectedDeepStar.strokes != null && (
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">총 획 수</p>
                  <p className="text-2xl font-bold text-slate-100">{selectedDeepStar.strokes}<span className="text-sm font-normal text-slate-400 ml-1">획</span></p>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (selectedDeepStar.strokes / 200) * 100)}%`, backgroundColor: selectedDeepStar.toneColor }} />
                  </div>
                </div>
              )}
              {selectedDeepStar.drawingImage && (
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-3">HTP 드로잉</p>
                  <img src={selectedDeepStar.drawingImage} alt="HTP 드로잉" className="w-full rounded-xl object-contain max-h-48 bg-white/5" />
                </div>
              )}
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">기록 일시</p>
                <p className="text-sm text-slate-200">{new Date(selectedDeepStar.createdAt).toLocaleString("ko-KR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4">
                <p className="text-xs text-amber-100">현재 문구는 임시 안내입니다. AI 분석 완료 후 자동 생성된 리포트 문장으로 대체됩니다.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 데일리 행성 클릭 시 리포트 모달 */}
      {isDailyReportOpen && selectedDailyPlanet && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto"
          onClick={(e) => { if (e.target === e.currentTarget) { setIsDailyReportOpen(false); setSelectedDailyPlanet(null); } }}
        >
          <div className="relative mx-4 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl">
            {/* 헤더 */}
            <div className="relative px-8 pt-7 pb-5 flex-shrink-0">
              <div
                className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 h-28 w-28 rounded-full blur-3xl opacity-40"
                style={{ backgroundColor: selectedDailyPlanet.shell }}
              />
              <div className="flex items-center gap-3 relative z-10">
                {/* 데일리 헤더 아이콘: 다이아몬드 + 고리 */}
                <div className="relative flex-shrink-0 h-12 w-12 flex items-center justify-center ml-1 mx-2">
                  <div
                    className="absolute h-9 w-9 rotate-45 rounded-sm z-10"
                    style={{
                      background: `linear-gradient(135deg, ${selectedDailyPlanet.shell}ff, ${selectedDailyPlanet.core || selectedDailyPlanet.shell}88)`,
                      boxShadow: `0 0 15px ${selectedDailyPlanet.shell}66`,
                    }}
                  />
                  <div
                    className="absolute w-14 h-5 rounded-[100%] border-2"
                    style={{ borderColor: `${selectedDailyPlanet.shell}88`, transform: 'rotate(-15deg)' }}
                  />
                  <div
                    className="absolute w-14 h-5 rounded-[100%] border-t-2 border-transparent z-20"
                    style={{ borderBottomColor: `${selectedDailyPlanet.shell}aa`, transform: 'rotate(-15deg)' }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">Daily Report</p>
                  <h3 className="text-base font-bold text-slate-100 truncate mt-0.5">
                    {selectedDailyPlanet.memo?.slice(0, 24) || "데일리 행성"}
                  </h3>
                </div>
                <button
                  onClick={() => { setIsDailyReportOpen(false); setSelectedDailyPlanet(null); }}
                  className="flex-shrink-0 h-8 w-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            {/* 본문 */}
            <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar space-y-5">
              {/* 데일리 본문 시각화: 다이아몬드 + 큰 궤도 고리 */}
              <div className="relative flex justify-center py-8 my-2">
                <div
                  className="relative z-10 h-20 w-20 rotate-45 rounded-sm shadow-2xl"
                  style={{
                    background: `linear-gradient(135deg, ${selectedDailyPlanet.shell}ff, ${selectedDailyPlanet.core || selectedDailyPlanet.shell}88, ${selectedDailyPlanet.shell}33)`,
                    boxShadow: `0 0 40px ${selectedDailyPlanet.shell}66, 0 0 80px ${selectedDailyPlanet.shell}33`,
                  }}
                />
                {/* 뒤쪽 고리 반원 */}
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-12 rounded-[100%] border-4"
                  style={{ borderColor: `${selectedDailyPlanet.shell}66`, transform: 'translate(-50%, -50%) rotate(-15deg)' }}
                />
                {/* 앞쪽 고리 반원 (행성 위로 렌더링되도록 Z-index 높임) */}
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-12 rounded-[100%] border-t-4 border-transparent z-20"
                  style={{ borderBottomColor: `${selectedDailyPlanet.shell}cc`, transform: 'translate(-50%, -50%) rotate(-15deg)' }}
                />
              </div>
              {/* ── 분석 ── */}
              {(() => {
                const analysis = getDailyAnalysis(selectedDailyPlanet);
                return (
                  <>
                    {/* 요약 */}
                    <div className="rounded-2xl border border-white/8 bg-gradient-to-br from-white/5 to-white/[0.02] p-5">
                      <p className="mb-2 text-[10px] uppercase tracking-[0.35em] text-slate-400">✦ AI 분석 리포트</p>
                      <p className="text-sm text-slate-200 leading-relaxed">{analysis.summary}</p>
                    </div>
                    {/* 색상 무드 */}
                    <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">색채 에너지</p>
                      <p className="text-sm font-semibold text-slate-100 mb-1">{analysis.mood.label}</p>
                      <p className="text-xs text-slate-300 leading-relaxed">{analysis.mood.desc}</p>
                    </div>
                    {/* 오브젝트 분석 */}
                    {analysis.object && (
                      <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">오브젝트 해석</p>
                        <p className="text-sm font-semibold text-slate-100 mb-1">{analysis.object.label}</p>
                        <p className="text-xs text-slate-300 leading-relaxed">{analysis.object.desc}</p>
                      </div>
                    )}
                  </>
                );
              })()}
              {/* 색상 정보 */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">Shell 색상</p>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg flex-shrink-0" style={{ backgroundColor: selectedDailyPlanet.shell }} />
                    <span className="text-xs text-slate-200 font-mono">{selectedDailyPlanet.shell}</span>
                  </div>
                </div>
                {selectedDailyPlanet.core && (
                  <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">Core 색상</p>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-lg flex-shrink-0" style={{ backgroundColor: selectedDailyPlanet.core }} />
                      <span className="text-xs text-slate-200 font-mono">{selectedDailyPlanet.core}</span>
                    </div>
                  </div>
                )}
              </div>
              {/* 메모 */}
              {selectedDailyPlanet.memo && (
                <div className="rounded-2xl border border-white/8 bg-white/5 p-5">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">오늘의 한 줄</p>
                  <p className="text-sm text-slate-200 leading-relaxed">"{selectedDailyPlanet.memo}"</p>
                </div>
              )}
              {/* 오브젝트 타입 */}
              {selectedDailyPlanet.objectType && (
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">오브젝트 타입</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-sky-500/15 text-sky-300">{selectedDailyPlanet.objectType}</span>
                    {selectedDailyPlanet.objectColor && (
                      <div className="h-5 w-5 rounded-full" style={{ backgroundColor: selectedDailyPlanet.objectColor }} />
                    )}
                  </div>
                </div>
              )}
              {/* 날짜 */}
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">기록 일시</p>
                <p className="text-sm text-slate-200">{new Date(selectedDailyPlanet.createdAt).toLocaleString("ko-KR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4">
                <p className="text-xs text-amber-100">현재 문구는 임시 안내입니다. AI 분석 완료 후 자동 생성된 리포트 문장으로 대체됩니다.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;