import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Vector3 } from "three";

export interface MonsterData {
  id: number;
  position: Vector3;
  rotation: Vector3;
  scale: number;
  alive: boolean;
}

export function Monsters({ monstersRef }: { monstersRef: React.MutableRefObject<MonsterData[]> }) {
  const { camera } = useThree();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const COUNT = 50; 

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const mesh = meshRef.current;
    monstersRef.current.forEach((m, i) => {
      if (m.alive) {
        // 둥실둥실 애니메이션
        const time = state.clock.elapsedTime + i * 0.5;
        const drift = Math.sin(time) * 0.1;
        const matrix = new THREE.Matrix4();
        
        // 회전 애니메이션
        m.rotation.x += delta * 0.5;
        m.rotation.y += delta * 0.3;
        
        const currentPos = m.position.clone();
        currentPos.y += drift;

        const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(m.rotation.x, m.rotation.y, m.rotation.z));
        matrix.compose(currentPos, rotation, new Vector3(m.scale, m.scale, m.scale));
        mesh.setMatrixAt(i, matrix);
      } else {
        // 죽은 몬스터는 스케일 0
        const matrix = new THREE.Matrix4();
        matrix.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);
        mesh.setMatrixAt(i, matrix);
        
        // 리스폰 로직
        if (Math.random() < 0.005) {
           m.alive = true;
           m.scale = Math.random() * 7 + 5; // Changed from * 8 + 5 to * 7 + 5 for 5-12 range
           m.position.set(
             camera.position.x + (Math.random() - 0.5) * 600,
             camera.position.y + (Math.random() - 0.5) * 600,
             camera.position.z + (Math.random() - 0.5) * 600
           );
        }
      }
    });

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null as any, null as any, COUNT]}>
      <octahedronGeometry args={[1.5, 0]} />
      <meshStandardMaterial 
        color="#a855f7" 
        emissive="#7e22ce" 
        emissiveIntensity={3} 
        metalness={0.9} 
        roughness={0.1} 
      />
    </instancedMesh>
  );
}
