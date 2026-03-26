import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function StarDust({ count = 1000, range = 500 }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * range;
        const y = (Math.random() - 0.5) * range;
        const z = (Math.random() - 0.5) * range;
        temp.push({ position: new THREE.Vector3(x, y, z), scale: Math.random() * 0.2 + 0.1 });
    }
    return temp;
  }, [count, range]);

  useFrame((state) => {
    if (!mesh.current) return;
    const time = state.clock.getElapsedTime();
    
    particles.forEach((p, i) => {
      const { position, scale } = p;
      const matrix = new THREE.Matrix4();
      
      // 약간의 흔들림 효과
      const s = scale * (1 + Math.sin(time + i) * 0.2);
      matrix.makeScale(s, s, s);
      matrix.setPosition(position);
      
      mesh.current!.setMatrixAt(i, matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.5, 4, 4]} />
      <meshStandardMaterial color="#ffa500" emissive="#ff4500" emissiveIntensity={2} transparent opacity={0.6} />
    </instancedMesh>
  );
}
