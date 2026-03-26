import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Vector3 } from "three";

export interface ExplosionData {
  id: number;
  position: Vector3;
  life: number; // 1.0 -> 0.0
}

export function Explosions({ explosionsRef }: { explosionsRef: React.MutableRefObject<ExplosionData[]> }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const PARTICLE_PER_EXPLOSION = 20;
  const MAX_EXPLOSIONS = 10;
  const TOTAL_PARTICLES = PARTICLE_PER_EXPLOSION * MAX_EXPLOSIONS;

  // 파티클 초기 속도 데이터
  const particleVelocities = useMemo(() => {
    return Array.from({ length: TOTAL_PARTICLES }).map(() => ({
      velocity: new Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(Math.random() * 15 + 10)
    }));
  }, []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    const mesh = meshRef.current;
    let particleIdx = 0;

    // 활성화된 폭발 데이터 처리
    explosionsRef.current.forEach((exp) => {
      exp.life -= delta * 1.5; // 약 0.7초 지속
      
      if (exp.life > 0) {
        for (let i = 0; i < PARTICLE_PER_EXPLOSION; i++) {
          if (particleIdx >= TOTAL_PARTICLES) break;

          const vel = particleVelocities[particleIdx].velocity;
          const pos = exp.position.clone().add(vel.clone().multiplyScalar(1.0 - exp.life));
          const scale = exp.life * 0.5;
          
          const matrix = new THREE.Matrix4();
          matrix.compose(pos, new THREE.Quaternion(), new Vector3(scale, scale, scale));
          mesh.setMatrixAt(particleIdx, matrix);
          particleIdx++;
        }
      }
    });

    // 남은 파티클은 숨김
    for (let i = particleIdx; i < TOTAL_PARTICLES; i++) {
      const matrix = new THREE.Matrix4();
      matrix.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);
      mesh.setMatrixAt(i, matrix);
    }

    // 수명이 다한 폭발 데이터 정제
    if (explosionsRef.current.length > MAX_EXPLOSIONS) {
        explosionsRef.current = explosionsRef.current.slice(-MAX_EXPLOSIONS);
    }
    // life <= 0 제거는 StarScene이나 여기서 필터링
    explosionsRef.current = explosionsRef.current.filter(e => e.life > 0);

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null as any, null as any, TOTAL_PARTICLES]}>
      <sphereGeometry args={[0.5, 8, 8]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.8} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  );
}
