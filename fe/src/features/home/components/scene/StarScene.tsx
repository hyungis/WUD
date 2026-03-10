import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Line, Float } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState, createContext, useContext } from "react";
import type { MutableRefObject } from "react";
import type { Group, InstancedMesh, Points } from "three";
import { Vector3, Object3D, Color, Texture } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useUiStore } from "../../../../store/uiStore";

import type { DeepStar, StarSceneProps } from "../../utils/homeHelpers";
import {
  hashSeed, seededRandom, gaussianRandom, seededGaussian,
  getWeekKey,
  ZOOM_THRESHOLD, MAX_DISTANCE, MIN_DISTANCE
} from "../../utils/homeHelpers";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MacroGalaxy({ timelineItems, positionMap, starTone, hiddenIds }: any) {
  const meshRef = useRef<InstancedMesh>(null);
  const tempObject = useMemo(() => new Object3D(), []);
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
  }, [timelineItems, starTone, hiddenIds, tempObject]);

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
      const theta = seededRandom(i) * 2 * Math.PI;
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

      colorObj.set(palette[Math.floor(seededRandom(count + i) * palette.length)]);
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
  useEffect(() => {
    targetPositions.current = positions;
  }, [positions]);
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    const irisEl = document.getElementById("cinematic-iris");
    const topLidEl = document.getElementById("cinematic-lid-top");
    const bottomLidEl = document.getElementById("cinematic-lid-bottom");

    if (irisEl && topLidEl && bottomLidEl) {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export function StarScene({
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
                  onClick={() => { 
                    onStarSelect?.(item.id); 
                    if (item.kind === "deep") { onDeepStarClick?.(item as unknown as DeepStar); } 
                    else { onPlanetClick(item.planet); } 
                  }}
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
