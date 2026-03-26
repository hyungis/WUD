import { useRef, useState, useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3, Group } from "three";
import { Float } from "@react-three/drei";
import { useUiStore } from "../../../../store/uiStore";
import * as THREE from "three";
import type { MonsterData } from "./Monsters";
import type { ExplosionData } from "./Explosions";

export function Spaceship({ 
  timelinePositions = [], 
  monstersRef,
  explosionsRef
}: { 
  timelinePositions?: { id: string, position: [number, number, number] }[],
  monstersRef?: React.MutableRefObject<MonsterData[]>,
  explosionsRef?: React.MutableRefObject<ExplosionData[]>
}) {
  const groupRef = useRef<Group>(null);
  const laserMeshRef = useRef<THREE.InstancedMesh>(null);
  const { camera } = useThree();
  
  // 상태 변수들
  const [keys, setKeys] = useState<Record<string, boolean>>({});
  const velocity = useRef(new Vector3(0, 0, 0));
  const rotationVelocity = useRef(new Vector3(0, 0, 0));
  const distanceTraveled = useRef(0);
  const targetFov = useRef(45);
  const frameCounter = useRef(0);
  const setExplorationStats = useUiStore((state: any) => state.setExplorationStats);
  const setNearestStarInfo = useUiStore((state: any) => state.setNearestStarInfo);
  const incrementMonstersDefeated = useUiStore((state: any) => state.incrementMonstersDefeated);
  const starsMetadata = useUiStore((state: any) => state.stars);
  
  // 설정값
  const ACCELERATION = 25.0; // 속도 하향
  const ROTATION_SPEED = 1.0; // 회전 속도 하향
  const DAMPING = 0.95; // 저항 소폭 강화

  // 키보드 이벤트 리스너
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        return; // 스페이스바는 아예 무시 (keys에 저장 안 함)
      }
      if (e.key.toLowerCase() === "f") {
        fireLaser();
      }
      setKeys(prev => ({ ...prev, [e.code]: true }));
    };
    const handleKeyUp = (e: KeyboardEvent) => setKeys(prev => ({ ...prev, [e.code]: false }));
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) fireLaser();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousedown", handleMouseDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  // 레이저 발사 로직
  const projectiles = useRef<any[]>([]);
  const lastFireTime = useRef(0);
  
  const fireLaser = () => {
    if (!groupRef.current || Date.now() - lastFireTime.current < 200) return;
    
    lastFireTime.current = Date.now();
    const ship = groupRef.current;
    
    // 양쪽 날개에서 발사
    const offsets = [new Vector3(-0.8, -0.2, 0.5), new Vector3(0.8, -0.2, 0.5)];
    
    offsets.forEach(offset => {
      const worldPos = offset.clone().applyQuaternion(ship.quaternion).add(ship.position);
      const direction = new Vector3(0, 0, 1).applyQuaternion(ship.quaternion);
      
      projectiles.current.push({
        id: Math.random(),
        position: worldPos,
        velocity: direction.multiplyScalar(700), // 더 빠른 속도
        quaternion: ship.quaternion.clone(),
        life: 1.0 
      });
    });
  };

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const ship = groupRef.current;
    const dt = Math.min(delta, 0.1);

    // 1. 회전 로직 (Pitch, Yaw, Roll)
    let targetPitch = 0;
    let targetYaw = 0;
    let targetRoll = 0;

    if (keys["ArrowUp"] || keys["KeyW"]) targetPitch = -ROTATION_SPEED;
    if (keys["ArrowDown"] || keys["KeyS"]) targetPitch = ROTATION_SPEED;
    if (keys["ArrowLeft"] || keys["KeyA"]) targetYaw = ROTATION_SPEED;
    if (keys["ArrowRight"] || keys["KeyD"]) targetYaw = -ROTATION_SPEED;
    
    // 회전 속도 보간 (더 부드럽게)
    rotationVelocity.current.x += (targetPitch - rotationVelocity.current.x) * dt * 3;
    rotationVelocity.current.y += (targetYaw - rotationVelocity.current.y) * dt * 3;
    
    // 별도의 Roll (좌우 이동 시 아주 살짝만 기울기)
    targetRoll = -targetYaw * 0.2;
    rotationVelocity.current.z += (targetRoll - rotationVelocity.current.z) * dt * 3;

    // 실제 회전 적용
    ship.rotateX(rotationVelocity.current.x * dt);
    ship.rotateY(rotationVelocity.current.y * dt);
    
    // Roll은 로컬 Z축 기준

    // 2. 전진 로직
    const isAccelerating = keys["ShiftLeft"] || keys["ShiftRight"];
    const currentThrust = isAccelerating ? ACCELERATION * 3.0 : ACCELERATION; // 부스트 위력 소폭 상승
    
    // "전진"은 ship의 로컬 Z축 방향
    const forward = new Vector3(0, 0, 1).applyQuaternion(ship.quaternion);

    const deltaVelocity = forward.multiplyScalar(currentThrust * dt);
    velocity.current.add(deltaVelocity);
    
    // 마찰/저항 적용
    velocity.current.multiplyScalar(DAMPING);
    
    // 위치 업데이트
    const moveStep = velocity.current.clone().multiplyScalar(dt);
    ship.position.add(moveStep);
    
    // 통계 업데이트 (이동 거리)
    distanceTraveled.current += moveStep.length();

    // 3. 카메라 및 시각 효과 (Warp / FOV)
    // 가속 시 FOV 확대 (워프 느낌)
    const desiredFov = isAccelerating ? 65 : 45;
    targetFov.current += (desiredFov - targetFov.current) * dt * 3;
    if (camera.type === 'PerspectiveCamera') {
      (camera as any).fov = targetFov.current;
      (camera as any).updateProjectionMatrix();
    }

    // 카메라 팔로잉을 더 부드럽고 느리게 (흔들림 방지)
    const cameraOffset = new Vector3(0, 5, -12).applyQuaternion(ship.quaternion);
    const cameraTarget = ship.position.clone().add(cameraOffset);
    
    camera.position.lerp(cameraTarget, dt * 2.5);
    camera.lookAt(ship.position);

    // 가속 시 카메라 미세 흔들림 (Screen Shake)
    if (isAccelerating) {
      camera.position.x += (Math.random() - 0.5) * 0.05;
      camera.position.y += (Math.random() - 0.5) * 0.05;
    }

    // 4. 통계 보고 (성능을 위해 10프레임마다)
    frameCounter.current++;
    if (frameCounter.current % 10 === 0) {
      setExplorationStats(distanceTraveled.current, velocity.current.length());
      
      // 근접한 별 찾기 (Proximity Scan)
      let nearestDist = Infinity;
      let nearestId: string | null = null;
      
      timelinePositions.forEach(star => {
        const starPos = new Vector3(...star.position);
        const dist = ship.position.distanceTo(starPos);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestId = star.id;
        }
      });
      
      if (nearestId && nearestDist < 20) {
        const metadata = starsMetadata.find((s: any) => s.id === nearestId);
        if (metadata) {
          setNearestStarInfo({
            label: metadata.kind === "DAILY" ? "Daily Remembrance" : "Deep Reflection",
            date: new Date(metadata.createdAt).toLocaleDateString(),
            summary: metadata.kind === "DAILY" ? "Captured Moment" : "Soul Record"
          });
        }
      } else {
        setNearestStarInfo(null);
      }
    }

    // 4. 레이저 업데이트 및 충돌 감지
    projectiles.current.forEach((p: any, pIndex: number) => {
      p.position.add(p.velocity.clone().multiplyScalar(dt));
      p.life -= dt;
      
      // 몬스터 충돌 체크
      if (monstersRef?.current) {
        monstersRef.current.forEach((m) => {
          if (m.alive) {
            const dist = p.position.distanceTo(m.position);
            if (dist < m.scale * 1.5) { // 히트박스 판정 대폭 완화
              m.alive = false;
              p.life = 0; // 레이저 소멸
              incrementMonstersDefeated();
              
              // 폭발 효과 추가
              if (explosionsRef?.current) {
                explosionsRef.current.push({
                  id: Math.random(),
                  position: m.position.clone(),
                  life: 1.0
                });
              }
            }
          }
        });
      }

      if (p.life <= 0) {
        projectiles.current.splice(pIndex, 1);
      }
    });

    if (laserMeshRef.current) {
      const mesh = laserMeshRef.current;
      projectiles.current.forEach((p: any, i: number) => {
        if (i < 50) { // 최대 50개 제한
          const matrix = new THREE.Matrix4();
          matrix.compose(p.position, p.quaternion, new Vector3(1, 1, 1));
          mesh.setMatrixAt(i, matrix);
        }
      });
      // 나머지 슬롯은 안 보이게 (저 멀리로 보내거나 스케일을 0으로)
      for (let i = projectiles.current.length; i < 50; i++) {
        const matrix = new THREE.Matrix4();
        matrix.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);
        mesh.setMatrixAt(i, matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  // 매 초마다 통계를 UI 스토어 등에 업데이트하고 싶을 때...
  // (여기서는 일단 간단하게 매 프레임 계산만 함)

  return (
    <>
      <group ref={groupRef}>
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        {/* 🚀 우주선 본체: 원뿔형 코즈믹 디자인 */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.8, 2.5, 8]} />
          <meshPhysicalMaterial 
            color="#334155" 
            metalness={0.9} 
            roughness={0.1} 
            emissive="#1e293b" 
            clearcoat={1}
          />
        </mesh>
        
        {/* 콕핏 (조종석) */}
        <mesh position={[0, 0.3, 0.5]} rotation={[0.4, 0, 0]}>
          <sphereGeometry args={[0.4, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshPhysicalMaterial 
            color="#0ea5e9" 
            transparent 
            opacity={0.6} 
            transmission={0.9} 
            thickness={1}
            roughness={0}
          />
        </mesh>

        {/* 좌측 날개 */}
        <mesh position={[-1, -0.2, -0.2]} rotation={[0, 0, -0.2]}>
          <boxGeometry args={[1.5, 0.1, 1.2]} />
          <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* 우측 날개 */}
        <mesh position={[1, -0.2, -0.2]} rotation={[0, 0, 0.2]}>
          <boxGeometry args={[1.5, 0.1, 1.2]} />
          <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* 수직 미익 */}
        <mesh position={[0, 0.6, -0.8]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.1, 1, 0.8]} />
          <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* 메인 엔진 (화염 효과 위치) */}
        <group position={[0, 0, -1.3]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.4, 0.1, 0.5, 16]} />
            <meshBasicMaterial color="#ffffff" opacity={0.5} transparent />
          </mesh>
          <pointLight intensity={10} distance={5} color="#ffffff" />
          <EngineFlame active={keys["ShiftLeft"] || keys["ShiftRight"]} color="#ffffff" />
        </group>
        
        {/* 보조 엔진 좌우 */}
        <group position={[-0.5, -0.3, -1.0]}>
           <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.2, 0.05, 0.4, 8]} /><meshBasicMaterial color="#ffffff" opacity={0.3} transparent /></mesh>
        </group>
        <group position={[0.5, -0.3, -1.0]}>
           <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.2, 0.05, 0.4, 8]} /><meshBasicMaterial color="#ffffff" opacity={0.3} transparent /></mesh>
        </group>
        
        <HyperLines active={keys["ShiftLeft"] || keys["ShiftRight"]} color="#ffffff" />
      </Float>
    </group>

    {/* 레이저 발사체 (월드 좌표계에서 독립적으로 렌더링하여 위치 어긋남 해결) */}
    <instancedMesh ref={laserMeshRef} args={[null as any, null as any, 50]} frustumCulled={false}>
      <boxGeometry args={[0.15, 0.15, 5]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={1} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  </>
);
}

function EngineFlame({ active, color }: { active: boolean, color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // 부스트 중이면 크기를 키우고 아니면 작게 유지
    const targetScaleZ = active ? 2.0 : 0.5;
    const targetScaleXY = active ? 1.0 : 0.3;
    
    meshRef.current.scale.z += (targetScaleZ - meshRef.current.scale.z) * delta * 15;
    meshRef.current.scale.x += (targetScaleXY - meshRef.current.scale.x) * delta * 15;
    meshRef.current.scale.y = meshRef.current.scale.x;
    
    // 약간의 지글거림 애니메이션
    if (active) {
      const flicker = Math.sin(state.clock.elapsedTime * 30) * 0.1;
      meshRef.current.scale.x += flicker;
      meshRef.current.scale.y += flicker;
    }
    
    const material = meshRef.current.material as THREE.MeshBasicMaterial;
    material.opacity = active ? 0.8 : 0.2;
  });

  return (
    <group rotation={[Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
      <mesh ref={meshRef}>
        <coneGeometry args={[0.4, 1.2, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

function HyperLines({ active, color }: { active: boolean, color: string }) {
  const lines = useMemo(() => {
    return Array.from({ length: 80 }).map(() => ({
      pos: new Vector3(
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 60,
        Math.random() * 150 - 100
      ),
      speed: Math.random() * 0.8 + 0.2,
    }));
  }, []);

  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const data = lines[i];
      mesh.position.z += data.speed * 80 * delta;
      
      // 화면 뒤로 넘어가면 앞으로 리셋
      if (mesh.position.z > 50) {
        mesh.position.z = -100;
      }
      
      // 가속 시 선의 길이와 투명도 조절
      const targetScaleZ = active ? 25 : 1;
      const targetOpacity = active ? 0.5 : 0;
      mesh.scale.z += (targetScaleZ - mesh.scale.z) * delta * 6;
      
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity += (targetOpacity - mat.opacity) * delta * 6;
    });
  });

  return (
    <group ref={groupRef}>
      {lines.map((l, i) => (
        <mesh key={i} position={l.pos}>
          <boxGeometry args={[0.03, 0.03, 1]} />
          <meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}
