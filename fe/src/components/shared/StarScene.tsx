import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Group } from "three";
import { Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

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
  mypageStar?: {
    id: string;
    createdAt: string;
    toneColor: string;
    label: string;
  } | null;
  onStarClick: () => void;
  onPlanetClick: (planet: DailyPlanet) => void;
  onStarSelect?: (starId: string) => void;
  selectedStarId?: string | null;
  onStarHover?: (data: { id: string | null; x?: number; y?: number }) => void;
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

function DeepPlanet({
  onClick,
  onHover,
  color,
  size = 1.6,
  glow = 2.0,
}: {
  onClick: () => void;
  onHover?: (data: { isHovered: boolean; x?: number; y?: number }) => void;
  color: string;
  size?: number;
  glow?: number;
}) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <group>
      <mesh
        onClick={onClick}
        onPointerOver={(event) => {
          setIsHovered(true);
          onHover?.({ isHovered: true, x: event.clientX, y: event.clientY });
        }}
        onPointerMove={(event) => {
          if (isHovered) {
            onHover?.({ isHovered: true, x: event.clientX, y: event.clientY });
          }
        }}
        onPointerOut={() => {
          setIsHovered(false);
          onHover?.({ isHovered: false });
        }}
        scale={isHovered ? 1.06 : 1}
      >
        <sphereGeometry args={[size, 64, 64]} />
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isHovered ? 0.45 : 0.3}
          transparent
          opacity={isHovered ? 0.75 : 0.62}
          transmission={0.65}
          thickness={0.8}
          roughness={0.25}
          metalness={0.05}
          clearcoat={0.5}
          clearcoatRoughness={0.3}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[glow, 64, 64]} />
        <meshBasicMaterial color={color} transparent opacity={isHovered ? 0.22 : 0.16} />
      </mesh>
      <mesh>
        <sphereGeometry args={[size * 1.3, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function CameraFocus({
  focusPosition,
  focusKey,
  controlsRef,
}: {
  focusPosition: Vector3 | null;
  focusKey?: string | null;
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();
  const desiredPosition = useRef<Vector3 | null>(null);
  const offsetRef = useRef<Vector3 | null>(null);
  const isActiveRef = useRef(false);
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!focusKey) {
      lastKeyRef.current = null;
    }
  }, [focusKey]);

  useFrame(() => {
    if (!focusPosition) {
      return;
    }
    if (focusKey && focusKey !== lastKeyRef.current) {
      lastKeyRef.current = focusKey;
      const currentTarget = controlsRef.current?.target || new Vector3(0, 0, 0);
      offsetRef.current = camera.position.clone().sub(currentTarget);
      if (offsetRef.current.lengthSq() < 0.0001) {
        offsetRef.current = new Vector3(0, 0, 8);
      }
      desiredPosition.current = null;
      isActiveRef.current = true;
    }
    if (!isActiveRef.current) {
      return;
    }
    if (!desiredPosition.current) {
      desiredPosition.current = focusPosition.clone().add(offsetRef.current || new Vector3(0, 0, 6));
    } else {
      desiredPosition.current.copy(focusPosition).add(offsetRef.current || new Vector3(0, 0, 6));
    }
    camera.position.lerp(desiredPosition.current, 0.08);
    if (controlsRef.current) {
      controlsRef.current.target.lerp(focusPosition, 0.08);
      controlsRef.current.update();
    }
    if (camera.position.distanceTo(desiredPosition.current) < 0.05) {
      isActiveRef.current = false;
    }
  });

  return null;
}

function GalaxyStars() {
  const starsRef = useRef<Group>(null);
  const { camera } = useThree();
  const [density, setDensity] = useState({ count: 90000, factor: 2 });
  const lastBucketRef = useRef<number | null>(null);

  useFrame((state) => {
    if (!starsRef.current) {
      return;
    }
    starsRef.current.rotation.y = state.clock.elapsedTime * 0.0067;
    const distance = camera.position.length();
    let bucket = 0;
    if (distance > 80) {
      bucket = 3;
    } else if (distance > 50) {
      bucket = 2;
    } else if (distance > 24) {
      bucket = 1;
    }
    if (bucket !== lastBucketRef.current) {
      lastBucketRef.current = bucket;
      if (bucket === 3) {
        setDensity({ count: 5000, factor: 1.0 });
      } else if (bucket === 2) {
        setDensity({ count: 12000, factor: 1.2 });
      } else if (bucket === 1) {
        setDensity({ count: 35000, factor: 1.6 });
      } else {
        setDensity({ count: 90000, factor: 2 });
      }
    }
  });

  return (
    <group ref={starsRef}>
      <Stars
        key={`${density.count}-${density.factor}`}
        radius={30}
        depth={20}
        count={density.count}
        factor={density.factor}
        fade
      />
    </group>
  );
}

// Planet component has been removed for performance and to unify with DeepPlanet.

function StarScene({
  dailyPlanets,
  deepStars,
  mypageStar,
  onStarClick,
  onPlanetClick,
  onStarSelect,
  selectedStarId,
  onStarHover,
}: StarSceneProps) {
  const starTone = useMemo(() => {
    return localStorage.getItem("htpToneColor") || "#f8fafc";
  }, []);

  const timelineItems = useMemo(() => {
    const deepItems = deepStars.map((star) => ({
      id: star.id,
      createdAt: star.createdAt,
      kind: "deep" as const,
      toneColor: star.toneColor,
    }));
    const dailyItems = dailyPlanets.map((planet) => ({
      id: planet.id,
      createdAt: planet.createdAt,
      kind: "daily" as const,
      planet,
    }));
    return [...deepItems, ...dailyItems].sort((a, b) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [dailyPlanets, deepStars]);

  // === 큰 구(Sphere) 내부 랜덤 배치 ===
  const timelinePositions = useMemo(() => {
    const count = timelineItems.length;
    // 우주(큰 구)의 최대 반경 크기 결정
    const maxRadius = Math.max(15, Math.pow(count, 0.55) * 3.0);
    // 중앙 별과 겹치지 않게 최소 반경 보장
    const minRadius = 3.5;

    return timelineItems.map((item) => ({
      id: item.id,
      position: (() => {
        const seed = hashSeed(item.id);

        // 1. 방위각 (0 ~ 2π)
        const theta = seededRandom(seed) * 2 * Math.PI;

        // 2. 고도각 보정 (-1 ~ 1 인 난수의 역코사인) -> 구면에 골고루 퍼지기 위한 수학적 공식
        const v = seededRandom(seed + 1);
        const phi = Math.acos(2 * v - 1);

        // 3. 반경 R 계산 (우주 중심에 살짝 모이면서도 밖으로 퍼지는 분포)
        // 균등 분포라면 Math.cbrt(난수)를 쓰지만, 약간 중앙 밀집형 스웜(Swarm) 느낌을 위해 0.8 제곱
        const rNoise = Math.pow(seededRandom(seed + 2), 0.8);
        const r = minRadius + rNoise * (maxRadius - minRadius);

        // 구면 좌표계를 직교 좌표계(Cartesian, XYZ)로 변환
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.cos(phi);
        const z = r * Math.sin(phi) * Math.sin(theta);

        return [x, y, z] as [number, number, number];
      })(),
    }));
  }, [timelineItems]);
  // === 변경점 끝 ===

  const positionMap = useMemo(() => {
    return new Map(timelinePositions.map((item) => [item.id, item.position]));
  }, [timelinePositions]);

  const selectedFocus = useMemo(() => {
    if (!selectedStarId) {
      return null;
    }
    const match = positionMap.get(selectedStarId);
    if (!match) {
      return null;
    }
    return new Vector3(...match);
  }, [positionMap, selectedStarId]);

  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  return (
    <div className="absolute inset-0">
      <Canvas camera={{ position: [0, 0, 35], fov: 45 }}>
        <ambientLight intensity={0.35} />
        <GalaxyStars />

        {/* MyPage 단일 중앙 별 (가장 크고 중심에 위치) */}
        {mypageStar && (
          <group position={[0, 0, 0]}>
            <DeepPlanet
              onClick={() => {
                onStarSelect?.(mypageStar.id);
                onStarClick();
              }}
              onHover={(data) => {
                onStarHover?.({
                  id: data.isHovered ? mypageStar.id : null,
                  x: data.x,
                  y: data.y,
                });
              }}
              color={mypageStar.toneColor}
              size={27.0}  // 3배 더 키움
              glow={33.0}
            />
          </group>
        )}

        {/* 최적화: 1000개 이상의 별 렌더링 부하를 줄이기 위해 map 렌더링 부분 간소화 (임시로 Planet 컴포넌트를 DeepPlanet처럼 가벼운 형태로 통일하여 렌더링 부하 테스트) */}
        {timelineItems.map((item) => {
          const position = positionMap.get(item.id) || [0, 0, 0];
          const color = item.kind === "deep" ? (item.toneColor || starTone) : item.planet.shell;

          return (
            <group key={item.id} position={position}>
              <DeepPlanet
                onClick={() => {
                  onStarSelect?.(item.id);
                  item.kind === "deep" ? onStarClick() : onPlanetClick(item.planet);
                }}
                onHover={(data) => {
                  onStarHover?.({
                    id: data.isHovered ? item.id : null,
                    x: data.x,
                    y: data.y,
                  });
                }}
                color={color}
                size={item.kind === "deep" ? 1.8 : 0.8}
                glow={item.kind === "deep" ? 2.2 : 1.2}
              />
            </group>
          );
        })}

        <CameraFocus
          focusPosition={selectedFocus}
          focusKey={selectedStarId}
          controlsRef={controlsRef}
        />
        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          enableRotate
          enableZoom
          zoomSpeed={0.8}
          minDistance={6.0}
          maxDistance={500}
        />
      </Canvas>
    </div>
  );
}

export default StarScene;