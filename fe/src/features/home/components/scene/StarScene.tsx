import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Line, Float } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState, createContext, useContext } from "react";
import type { MutableRefObject } from "react";
import type { Group, InstancedMesh, Points } from "three";
import { Vector3, Object3D, Color, Texture, IcosahedronGeometry, BufferGeometry, Float32BufferAttribute } from "three";
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

    // 각 삼각면 위에 3개의 삼각 스파이크 면을 생성
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

const STAR_STELLATED_GEOMETRY = createStellatedPolyhedronGeometry(1, 0.62);

function DeepPlanet({
  onClick, onOpen, onHover, color, size = 1, seed = 0, variant = "star", isSelected = false, freezeMotion = false,
  isNewborn = false,
}: {
  onClick: () => void;
  onOpen?: () => void;
  onHover?: (data: { isHovered: boolean; x?: number; y?: number }) => void;
  color: string; size?: number; seed?: number; variant?: "star" | "planet";
  isSelected?: boolean;
  freezeMotion?: boolean;
  isNewborn?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const birthProgress = useRef(isNewborn ? 0 : 1);
  const [isBirthFinished, setIsBirthFinished] = useState(!isNewborn);

  useEffect(() => {
    if (isNewborn) {
      birthProgress.current = 0;
      setIsBirthFinished(false);
    }
  }, [isNewborn]);

  useFrame((_, delta) => {
    if (isBirthFinished) return;
    birthProgress.current = Math.min(birthProgress.current + delta * 0.8, 1);
    if (birthProgress.current >= 1) {
      setIsBirthFinished(true);
    }
  });

  const isActive = isHovered || isSelected;
  const currentSize = isBirthFinished ? size : size * birthProgress.current;
  const currentEmissiveIntensity = isBirthFinished
    ? (isActive ? (variant === "star" ? 3.0 : 4.0) : (variant === "star" ? 1.4 : 1.8))
    : (10.0 * (1 - birthProgress.current) + 2.0); // 초기에는 아주 밝게 빛남

  const handlers = {
    onClick,
    onDoubleClick: onOpen,
    onPointerOver: (event: any) => { setIsHovered(true); onHover?.({ isHovered: true, x: event.clientX, y: event.clientY }); },
    onPointerOut: () => { setIsHovered(false); onHover?.({ isHovered: false }); },
  };

  const planetBody = (
    <group>
      {variant === "planet" ? (
        /* ── 데일리 행성: 정팔면체 ── */
        <>
          {/* 메인 정팔면체 */}
          <mesh
            {...handlers}
            scale={isActive ? [currentSize * 1.25, currentSize * 1.25, currentSize * 1.25] : [currentSize, currentSize, currentSize]}
            rotation={[0.16, 0.28, isActive ? 0.2 : 0.06]}
          >
            <octahedronGeometry args={[1, 0]} />
            <meshPhysicalMaterial
              color={color}
              emissive={color}
              emissiveIntensity={currentEmissiveIntensity}
              transparent
              opacity={0.92}
              roughness={0.15}
              metalness={0.0}
              transmission={0.4}
              thickness={0.8}
            />
          </mesh>

        </>
      ) : (
        /* ── 심층별: 성형 다면체(stellated polyhedron) ── */
        <>
          {/* 메인 성형 다면체 */}
          <mesh
            {...handlers}
            geometry={STAR_STELLATED_GEOMETRY}
            rotation={[0.2, 0.4, isActive ? 0.24 : 0.08]}
            scale={isActive ? [currentSize * 1.2, currentSize * 1.2, currentSize * 1.2] : [currentSize, currentSize, currentSize]}
          >
            <meshPhysicalMaterial
              color={color}
              emissive={color}
              emissiveIntensity={currentEmissiveIntensity}
              transparent
              opacity={0.95}
              transmission={0.08}
              thickness={1.1}
              roughness={0.12}
              clearcoat={0.9}
              clearcoatRoughness={0.12}
              metalness={0.18}
              ior={1.5}
            />
          </mesh>

          {/* 중심 광원 */}
          <mesh scale={[currentSize * 0.18, currentSize * 0.18, currentSize * 0.18]} position={[currentSize * 0.2, currentSize * 0.2, currentSize * 0.18]}>
            <sphereGeometry args={[1, 20, 20]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} opacity={isBirthFinished ? 1 : 1} transparent />
          </mesh>
        </>
      )}
    </group>
  );

  if (freezeMotion) {
    return planetBody;
  }

  return (
    <Float speed={1 + seededRandom(seed) * 1.5} rotationIntensity={variant === "star" ? 0.5 : 0.2} floatIntensity={0.5}>
      {planetBody}
    </Float>
  );
}

/* 진입 시 별들이 중심에서 퍼져나가는 애니메이션 – 위치만 보간 (크기 유지) */
const SpreadCtx = createContext<MutableRefObject<number>>({ current: 1 });

function SpreadDriver({ freezeMotion = false }: { freezeMotion?: boolean }) {
  const ref = useContext(SpreadCtx);
  const elapsed = useRef(0);
  const done = useRef(false);
  useFrame((_, delta) => {
    if (freezeMotion) return;
    if (done.current) return;
    elapsed.current += delta;
    const durationSec = 6.0;
    const t = Math.min(elapsed.current / durationSec, 1);

    // 초반 3초(=t 0.5)는 의도적으로 천천히 퍼지고,
    // 이후 3초 동안 빠르게 따라가며 최종 위치로 수렴한다.
    if (t < 0.5) {
      const u = t / 0.5;
      ref.current = 0.18 * Math.pow(u, 1.25);
    } else {
      const u = (t - 0.5) / 0.5;
      ref.current = 0.18 + 0.82 * (1 - Math.pow(1 - u, 2.1));
    }

    if (t >= 1) { ref.current = 1; done.current = true; }
  });
  return null;
}

/* 개별 별 위치를 (0,0,0)→target으로 useFrame 보간 */
function SpreadItem({ target, children }: { target: [number, number, number]; children: React.ReactNode }) {
  const ref = useContext(SpreadCtx);
  const groupRef = useRef<Group>(null);
  useFrame((_, _delta) => {
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
  useFrame((_, _delta) => {
    if (!groupRef.current) return;
    const p = Math.max(ref.current, 0.001);
    groupRef.current.scale.set(p, p, p);
  });
  return <group ref={groupRef} scale={[0.001, 0.001, 0.001]}>{children}</group>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MacroGalaxy({ timelineItems, positionMap, starTone, hiddenIds, freezeMotion = false }: any) {
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
      const scale = isHidden ? 0 : (item.kind === "deep" ? 0.5 : 0.25);
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
    if (freezeMotion) return;
    if (!meshRef.current || !initialized.current) return;
    const p = spreadRef.current;

    // spread가 변하지 않고 이미 완료된 상태여도, 새로 추가된 아이템이 있을 수 있으므로 체크
    const needsUpdate = p !== prevSpread.current || p < 1;

    if (!needsUpdate) {
      // 애니메이션 완료 상태에서는 가벼운 y축 움직임만 처리
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.5;

      // 새로 추가된 아이템(인스턴스)이 있는지 확인하여 마지막으로 한 번 더 강제 동기화 (간단히 처리)
      // 실제로는 useEffect에서도 처리하지만, instancedMesh 특성상 여기서 한 번 더 해주면 확실함
      return;
    }

    prevSpread.current = p;
    timelineItems.forEach((item: any, i: number) => {
      const pos = positionMap.get(item.id) || [0, 0, 0];
      tempObject.position.set(pos[0] * p, pos[1] * p, pos[2] * p);
      const isHidden = hiddenIds.has(item.id);
      const scale = isHidden ? 0 : (item.kind === "deep" ? 0.5 : 0.25);
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

function GalacticDust({ count = 12500, maxRadius, freezeMotion = false }: { count?: number, maxRadius: number; freezeMotion?: boolean }) {
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
    if (freezeMotion) return;
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
function ViewModeTracker({ controlsRef, onModeChange, zoomThreshold, minDistance, maxDistance, forceHideDock }: any) {
  const { camera } = useThree();
  const lastMode = useRef<"macro" | "micro">("micro");
  const lastIsHidden = useRef<boolean | null>(null);
  const setDockHidden = useUiStore((state) => state.setDockHidden);

  useFrame(() => {
    if (!controlsRef.current) return;
    const dist = camera.position.distanceTo(controlsRef.current.target);
    const currentMode = dist > zoomThreshold ? "macro" : "micro";

    if (currentMode !== lastMode.current) {
      lastMode.current = currentMode;
      onModeChange(currentMode);
    }

    const zoomEl = document.getElementById("zoom-indicator");
    if (zoomEl) {
      const percent = Math.max(0, Math.min(100, ((maxDistance - dist) / (maxDistance - minDistance)) * 100));
      zoomEl.style.height = `${percent}%`;
    }

    // ── Dock 및 시네마틱 가시성 가드 ──
    let goalHidden = false;
    if (forceHideDock) {
      goalHidden = true;
    } else if (dist > 350) {
      goalHidden = true;
    }

    if (goalHidden !== lastIsHidden.current) {
      lastIsHidden.current = goalHidden;
      setDockHidden(goalHidden);
    }
  });
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CameraFocus({ focusPosition, focusKey, controlsRef, countRatio, reportPanelOpen, newbornStarId }: any) {
  const { camera } = useThree();
  const isTransitioningRef = useRef(false);
  const progressRef = useRef(0);
  const fromCamRef = useRef(new Vector3());
  const toCamRef = useRef(new Vector3());
  const fromTargetRef = useRef(new Vector3());
  const toTargetRef = useRef(new Vector3());
  const lastKeyRef = useRef<string | number | null>(null);
  const isFirstMount = useRef(true);

  useFrame((_, delta) => {
    if (!focusPosition || !controlsRef.current) return;

    const keyChanged = focusKey !== lastKeyRef.current;

    if (keyChanged) {
      const wasNull = lastKeyRef.current === null;
      lastKeyRef.current = focusKey ?? null;

      const baseTarget = focusPosition.lengthSq() < 0.01
        ? new Vector3(0, 0, 0)
        : focusPosition.clone();

      // 최초 마운트 시 자동 포커스는 건너뜀 (초기 카메라 위치 유지)
      const isNewborn = focusKey.includes("temp-") || (newbornStarId && focusKey.startsWith(newbornStarId));
      if (wasNull && isFirstMount.current && !isNewborn) {
        isFirstMount.current = false;
        toTargetRef.current.copy(baseTarget);
        return;
      }
      isFirstMount.current = false;

      const currentTarget = controlsRef.current.target.clone();
      let viewDir = camera.position.clone().sub(currentTarget).normalize();

      if (viewDir.lengthSq() < 0.01) {
        viewDir.set(0.45, 0.28, 1).normalize();
      }

      let nextTarget = baseTarget.clone();
      if (reportPanelOpen && baseTarget.lengthSq() > 0.01) {
        const desiredDistanceForOffset = Math.max(25, 30 * countRatio);
        const right = new Vector3().crossVectors(new Vector3(0, 1, 0), viewDir).normalize();

        // 화면을 반으로 나눴을 때, 별이 좌측 반의 중심(x=25%)에 오도록 lookAt 타깃을 계산한다.
        // 목표 NDC x = -0.5 (전체 화면 기준 왼쪽 반 중앙)
        const targetNdcX = -0.5;
        const fov = (camera as any).fov ?? 45;
        const aspect = (camera as any).aspect ?? (window.innerWidth / Math.max(window.innerHeight, 1));
        const vFovRad = (fov * Math.PI) / 180;
        const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * aspect);
        const horizontalOffset = Math.abs(targetNdcX) * Math.tan(hFovRad / 2) * desiredDistanceForOffset;

        // 높이는 별의 원래 높이를 유지하여 좌측 반의 중앙선 근처에 안정적으로 배치한다.
        nextTarget = new Vector3(baseTarget.x, baseTarget.y, baseTarget.z)
          .add(right.multiplyScalar(horizontalOffset));
      }

      const baseDistance = baseTarget.lengthSq() < 0.01 ? 40 * countRatio : Math.max(25, 30 * countRatio);
      // 리포트가 열리면 선택 별을 살짝 더 가까이 보여주고, 닫히면 원래 거리로 되돌린다.
      const desiredDistance = reportPanelOpen && baseTarget.lengthSq() > 0.01
        ? baseDistance * 0.78
        : baseDistance;
      const desiredCam = nextTarget
        .clone()
        .add(viewDir.multiplyScalar(desiredDistance))
        .add(new Vector3(0, desiredDistance * (reportPanelOpen ? 0.04 : 0), 0));

      fromCamRef.current.copy(camera.position);
      toCamRef.current.copy(desiredCam);
      fromTargetRef.current.copy(currentTarget);
      toTargetRef.current.copy(nextTarget);
      progressRef.current = 0;
      isTransitioningRef.current = true;
    }

    if (!isTransitioningRef.current) return;

    const transitionDuration = 1.0;
    progressRef.current = Math.min(progressRef.current + delta / transitionDuration, 1);
    const t = progressRef.current;
    const eased = 1 - Math.pow(1 - t, 3);

    camera.position.lerpVectors(fromCamRef.current, toCamRef.current, eased);
    controlsRef.current.target.lerpVectors(fromTargetRef.current, toTargetRef.current, eased);
    controlsRef.current.update();

    if (t >= 1) {
      isTransitioningRef.current = false;
    }
  });
  return null;
}

// 🚨 [수정됨] 별자리 선 애니메이션 개선 (비활성 상태에서도 은은하게 반짝임 유지)
function AnimatedConstellationLine({ weekKey, pts, isHovered, freezeMotion = false }: { weekKey: string; pts: Vector3[]; isHovered: boolean; freezeMotion?: boolean }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineRef = useRef<any>(null);

  // 고유 시드 생성
  const seed = useMemo(() => hashSeed(weekKey), [weekKey]);

  const { subdividedPts, vertexColors } = useMemo(() => {
    const sPts: Vector3[] = [];
    const vCols: [number, number, number][] = [];

    // Bloom 임계값을 넘기 위한 강한 색상
    const bright: [number, number, number] = [8.0, 10.0, 15.0];
    const faint: [number, number, number] = [0.5, 0.5, 1.0];

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

  const currentOpacity = useRef(0);
  const currentLineWidth = useRef(0.8);

  useFrame((state, delta) => {
    if (!lineRef.current?.material) return;
    if (freezeMotion) return;

    const dt = Math.min(delta, 0.1);

    let goalOpacity: number;
    let goalWidth: number;

    if (isHovered) {
      // 마우스를 올렸을 때는 무조건 뚜렷하게 점등
      goalOpacity = 0.9;
      goalWidth = 1.5;
    } else {
      const time = state.clock.elapsedTime;
      // 속도를 낮추어 매우 천천히 파동이 지나가게 설정
      const speed = 0.2 + (seed % 10) * 0.02;
      const phase = (seed % 100);

      // -1 ~ 1 사이를 진동하는 사인파
      const wave = Math.sin(time * speed + phase);

      // 상위 20% 구간(약 0.6 이상)에서만 반응하도록 임계값 설정
      const threshold = 0.6;

      if (wave > threshold) {
        // 0.6 ~ 1.0 사이의 파동 값을 0 ~ 1 비율로 정규화
        const normalized = (wave - threshold) / (1 - threshold);

        // Smoothstep 공식을 통해 곡선의 양 끝을 둥글게 깎아 은은한 페이드 인/아웃 생성
        const smooth = normalized * normalized * (3 - 2 * normalized);

        // 평소(0.02)에서 최대 0.35까지 부드럽게 밝아짐
        goalOpacity = 0.02 + (smooth * 0.33);
        goalWidth = 0.8 + (smooth * 0.2);
      } else {
        // 나머지 80%의 시간 동안은 거의 꺼진 상태(0.02) 유지
        goalOpacity = 0.0;
        goalWidth = 0.8;
      }
    }

    // 보간(Lerp) 속도. 평상시에는 dt * 0.5를 사용하여 목표값으로 스르륵 이동하게 만듦
    const lerpSpeed = isHovered ? dt * 4.0 : dt * 0.5;

    currentOpacity.current += (goalOpacity - currentOpacity.current) * lerpSpeed;
    currentLineWidth.current += (goalWidth - currentLineWidth.current) * lerpSpeed;

    if (currentOpacity.current < 0.002) currentOpacity.current = 0;

    lineRef.current.material.opacity = currentOpacity.current;
    lineRef.current.material.linewidth = currentLineWidth.current;
  });

  return (
    <Line
      ref={lineRef}
      points={subdividedPts}
      vertexColors={vertexColors}
      transparent
      blending={2}
      opacity={0}
      lineWidth={0.8}
      toneMapped={false}
    />
  );
}
function GalaxyStars({ freezeMotion = false }: { freezeMotion?: boolean }) {
  const starsRef = useRef<Group>(null);
  useFrame((state) => {
    if (freezeMotion) return;
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
  dailyPlanets, deepStars, mypageStar, onStarClick, onDeepStarClick, onPlanetClick, onStarSelect, selectedStarId, hoveredStarId, selectedWeekKey, onStarHover, onViewModeChange,
  isReportOpen, newbornStarId,
}: StarSceneProps) {
  const [viewMode, setViewMode] = useState<"macro" | "micro">("micro");
  const [focusRequestNonce, setFocusRequestNonce] = useState(0);
  const spreadRef = useRef(0);
  const starTone = useMemo(() => localStorage.getItem("htpToneColor") || "#f8fafc", []);
  const freezeSceneMotion = Boolean(isReportOpen);

  const requestFocus = (id: string) => {
    onStarSelect?.(id);
    setFocusRequestNonce((prev) => prev + 1);
  };

  const timelineItems = useMemo(() => {
    const deepItems = deepStars.map((star) => ({
      id: star.id,
      targetId: (star as any).targetId,
      constellationId: star.constellationId,
      createdAt: star.createdAt,
      kind: "deep" as const,
      toneColor: star.toneColor,
      weekKey: star.weekKey || getWeekKey(new Date(star.createdAt)),
    }));
    const dailyItems = dailyPlanets.map((planet) => ({
      id: planet.id, targetId: (planet as any).targetId, createdAt: planet.createdAt, kind: "daily" as const, planet, weekKey: getWeekKey(new Date(planet.createdAt))
    }));
    return [...deepItems, ...dailyItems].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [dailyPlanets, deepStars]);

  const itemCount = timelineItems.length;
  const countRatio = useMemo(() => {
    const baselineCount = 50;
    if (itemCount <= 0) return 1;
    // 하한선을 1.0으로 높여 신규 계정에서도 우주가 위축되지 않게 함 (Premium Feel)
    return Math.max(1.0, Math.min(2.2, Math.sqrt(itemCount / baselineCount)));
  }, [itemCount]);

  const dynamicZoomThreshold = Math.max(60, ZOOM_THRESHOLD * countRatio);
  const dynamicMaxDistance = Math.max(180, MAX_DISTANCE * countRatio);
  const dynamicMinDistance = Math.max(2.2, MIN_DISTANCE * 0.35 * countRatio);
  const dynamicDustCount = Math.round(Math.max(3500, Math.min(9500, 3200 + itemCount * 35)));

  const uniqueWeeksCount = useMemo(() => Array.from(new Set(timelineItems.map(item => item.weekKey))).filter(Boolean).length, [timelineItems]);
  // 기본 최소 반경을 16 -> 22로 상향하여 한 개만 있어도 '나의 중심'과 확실히 멀어지게 함
  const minRadius = 22.0 * countRatio;
  // 기본 간격을 12 -> 20으로 상향하여 신규 계정에서도 우주 공간이 텅 비어 보이지 않고 광활하게 펼쳐지도록 함
  const maxRadius = Math.max(minRadius + 20.0, (minRadius + Math.pow(uniqueWeeksCount, 0.6) * 5.0) * countRatio);

  const timelinePositions = useMemo(() => {
    const uniqueWeeks = Array.from(new Set(timelineItems.map(item => item.weekKey))).filter(Boolean) as string[];
    const weekCenters = new Map<string, Vector3>();

    uniqueWeeks.forEach((weekKey) => {
      const seed = hashSeed(weekKey);
      const theta = seededRandom(seed) * 2 * Math.PI;
      const rBias = Math.pow(seededRandom(seed + 1), 1.5);
      const radius = minRadius + rBias * (maxRadius - minRadius);

      // 🚨 [수정됨] 심층별 Y축: 급격한 지수 함수 대신 부드러운 분수 함수(로렌츠 곡선) 사용
      const rRatio = radius / maxRadius;

      // rRatio가 커질수록 값이 부드럽게 0으로 수렴합니다. (0.3은 팽창부의 너비 조절값)
      const smoothFactor = 1 / (1 + Math.pow(rRatio / 0.3, 2.5));

      // 중심부 두께(maxRadius * 0.25)와 외곽 기본 두께(maxRadius * 0.05)가 스무스하게 합쳐짐
      const currentThickness = (maxRadius * 0.05) + (maxRadius * 0.25 * smoothFactor);

      const yNoise = (seededGaussian(seed + 2) - 0.5) * 2.0;
      const y = yNoise * currentThickness;

      const x = radius * Math.cos(theta);
      const z = radius * Math.sin(theta);

      weekCenters.set(weekKey, new Vector3(x, y, z));
    });

    return timelineItems.map((item) => {
      const centerPos = (item.weekKey ? weekCenters.get(item.weekKey) : null) || new Vector3(20, 0, 0);

      if (item.kind === "deep") {
        return { id: item.id, position: [centerPos.x, centerPos.y, centerPos.z] as [number, number, number] };
      }

      // 데일리 행성 배치
      const seed = hashSeed(String(item.targetId ?? item.id));
      const localTheta = seededRandom(seed) * 2 * Math.PI;
      const localPhi = Math.acos(2 * seededRandom(seed + 1) - 1);
      const localR = 8.0 + seededRandom(seed + 2) * 12.0;

      const dx = localR * Math.sin(localPhi) * Math.cos(localTheta);
      const dz = localR * Math.sin(localPhi) * Math.sin(localTheta);

      // 🚨 [수정됨] 데일리 행성 Y축 퍼짐: 심층별과 동일한 곡률을 따라가도록 일치시킴
      const centerDistance = Math.sqrt(centerPos.x * centerPos.x + centerPos.z * centerPos.z);
      const distanceRatio = centerDistance / maxRadius;

      const smoothSquash = 1 / (1 + Math.pow(distanceRatio / 0.35, 2.5));

      // 중심(1.2배)에서 외곽(0.15배)으로 빨간 선처럼 부드럽게 줄어듦
      const yMultiplier = 0.15 + (smoothSquash * 1.05);

      const dy = localR * Math.cos(localPhi) * yMultiplier;

      return { id: item.id, position: [centerPos.x + dx, centerPos.y + dy, centerPos.z + dz] as [number, number, number] };
    });
  }, [timelineItems, maxRadius, minRadius]);

  const positionMap = useMemo(() => new Map(timelinePositions.map((i) => [i.id, i.position])), [timelinePositions]);

  const constellationLines = useMemo(() => {
    // 1. 주차(weekKey)별로 모든 별(데일리, 딥)을 그룹화합니다.
    const groups = new Map<string, typeof timelineItems>();

    timelineItems.forEach((item) => {
      // 🚨 [수정 1] 심층별만 필터링하던 로직 제거
      const groupKey = item.weekKey; // 주차 키를 그대로 사용
      if (!groupKey) return;

      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey)!.push(item);
    });

    const lines: { weekKey: string, pts: Vector3[] }[] = [];

    // 2. 그룹별로 선 만들기
    groups.forEach((items, groupKey) => {
      // 🚨 [수정 2] 해당 주차의 모든 별을 날짜순(오름차순)으로 정렬
      const sorted = [...items].sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      const pts = sorted
        .map((i) => positionMap.get(i.id))
        .filter(Boolean) // 위치가 없는 별 제외
        .map((pos) => new Vector3(...(pos as [number, number, number])));

      // 🚨 [수정 3] 점이 2개 이상일 때만 선을 긋습니다.
      if (pts.length > 1) {
        lines.push({ weekKey: groupKey, pts });
      }
    });

    return lines;
  }, [timelineItems, positionMap]);

  const selectedFocus = useMemo(() => {
    if (selectedStarId === mypageStar.id) return new Vector3(0, 0, 0);
    const match = selectedStarId ? positionMap.get(selectedStarId) : null;
    return match ? new Vector3(...match) : null;
  }, [positionMap, selectedStarId, mypageStar]);

  // 🚨 [수정 4] 하이라이트를 위한 그룹 키 매칭도 weekKey 하나로 통일
  const hoveredLineGroupKey = useMemo(() => {
    if (!hoveredStarId || hoveredStarId === mypageStar.id) return null;
    const hoveredItem = timelineItems.find(item => item.id === hoveredStarId);
    return hoveredItem ? hoveredItem.weekKey : null;
  }, [hoveredStarId, timelineItems, mypageStar.id]);

  const selectedLineGroupKey = useMemo(() => {
    if (!selectedStarId || selectedStarId === mypageStar.id) return null;
    const selectedItem = timelineItems.find((item) => item.id === selectedStarId);
    return selectedItem ? selectedItem.weekKey : null;
  }, [selectedStarId, timelineItems, mypageStar.id]);

  // 클릭된 별 또는 호버된 별의 weekKey 중 하나라도 일치하면 별자리 강조
  const highlightedWeekKey = hoveredLineGroupKey || selectedLineGroupKey || (selectedWeekKey ? selectedWeekKey : null);

  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  const detailedItems = useMemo(() => {
    const focusPos = selectedFocus || new Vector3(0, 0, 0);
    return timelineItems
      .map(item => {
        const pos = positionMap.get(item.id) || [0, 0, 0];
        const distSq = Math.pow(pos[0] - focusPos.x, 2) + Math.pow(pos[1] - focusPos.y, 2) + Math.pow(pos[2] - focusPos.z, 2);
        return { item, distSq };
      })
      .sort((a, b) => a.distSq - b.distSq)
      .map(d => d.item);
  }, [timelineItems, positionMap, selectedFocus]);

  const focusedItems = useMemo(() => {
    if (!isReportOpen || !selectedStarId || selectedStarId === mypageStar.id) {
      return detailedItems;
    }
    return detailedItems.filter((item) => item.id === selectedStarId);
  }, [detailedItems, isReportOpen, selectedStarId, mypageStar.id]);

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
          <SpreadDriver freezeMotion={freezeSceneMotion} />

          <GalaxyStars freezeMotion={freezeSceneMotion} />

          <ViewModeTracker
            controlsRef={controlsRef}
            onModeChange={(m: "macro" | "micro") => { setViewMode(m); onViewModeChange?.(m); }}
            zoomThreshold={dynamicZoomThreshold}
            minDistance={dynamicMinDistance}
            maxDistance={dynamicMaxDistance}
            forceHideDock={isReportOpen}
          />

          <group position={[0, 0, 0]}>
            {freezeSceneMotion ? (
              <DeepPlanet
                onClick={() => { requestFocus(mypageStar.id); onStarClick(); }}
                color="#facc15"
                size={2.4}
                seed={999}
                isSelected={selectedStarId === mypageStar.id}
                freezeMotion
              />
            ) : (
              <Float speed={1.2} rotationIntensity={0.5} floatIntensity={0.8} floatingRange={[-0.3, 0.3]}>
                <DeepPlanet onClick={() => { requestFocus(mypageStar.id); onStarClick(); }} color="#facc15" size={2.4} seed={999} isSelected={selectedStarId === mypageStar.id} />
              </Float>
            )}
          </group>

          {!isReportOpen && (
            <GalacticDust count={dynamicDustCount} maxRadius={maxRadius} freezeMotion={freezeSceneMotion} />
          )}

          {!isReportOpen && (
            <SpreadScaleGroup>
              {constellationLines.map(({ weekKey, pts }) => (
                <AnimatedConstellationLine
                  key={`constellation-${weekKey}`}
                  weekKey={weekKey}
                  pts={pts}
                  isHovered={highlightedWeekKey === weekKey}
                  freezeMotion={freezeSceneMotion}
                />
              ))}
            </SpreadScaleGroup>
          )}

          {!isReportOpen && (
            <MacroGalaxy timelineItems={timelineItems} positionMap={positionMap} starTone={starTone} hiddenIds={detailedItemIds} freezeMotion={freezeSceneMotion} />
          )}

          {focusedItems.map((item) => {
            const pos = positionMap.get(item.id);
            if (!pos) return null;
            const isNewborn = item.id === newbornStarId;

            return (
              <SpreadItem key={item.id} target={pos as [number, number, number]}>
                <DeepPlanet
                  onClick={() => {
                    requestFocus(item.id);
                    if (item.kind === "deep") {
                      onDeepStarClick?.(item as unknown as DeepStar);
                    } else {
                      onPlanetClick(item.planet);
                    }
                  }}
                  onOpen={() => {
                    if (item.kind === "deep") {
                      onDeepStarClick?.(item as unknown as DeepStar);
                    } else {
                      onPlanetClick(item.planet);
                    }
                  }}
                  onHover={(data) => onStarHover?.({ id: data.isHovered ? item.id : null, x: data.x, y: data.y })}
                  color={item.kind === "deep" ? (item.toneColor || starTone) : item.planet.shell}
                  variant={item.kind === "deep" ? "star" : "planet"}
                  size={item.kind === "deep"
                    ? (isReportOpen ? 1.05 : (viewMode === "macro" ? 1.2 : 0.7))
                    : (isReportOpen ? 0.52 : (viewMode === "macro" ? 0.6 : 0.35))}
                  isSelected={selectedStarId === item.id}
                  isNewborn={isNewborn}
                  seed={hashSeed(item.id)}
                />
              </SpreadItem>
            );
          })}
        </SpreadCtx.Provider>

        <CameraFocus
          focusPosition={selectedFocus}
          focusKey={`${selectedStarId ?? "none"}:${focusRequestNonce}:${isReportOpen ? "report-open" : "report-closed"}`}
          controlsRef={controlsRef}
          countRatio={countRatio}
          reportPanelOpen={isReportOpen}
          newbornStarId={newbornStarId}
        />

        <OrbitControls
          ref={controlsRef}
          enabled={!isReportOpen}
          enablePan={false}
          enableRotate={!isReportOpen}
          minDistance={dynamicMinDistance}
          maxDistance={dynamicMaxDistance}
          autoRotate={!isReportOpen}
          autoRotateSpeed={0.05}
          zoomSpeed={1}
        />
      </Canvas>
    </div>
  );
}