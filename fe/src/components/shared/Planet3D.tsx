import { Canvas, useFrame } from "@react-three/fiber";
import type { CSSProperties } from "react";
import { useRef } from "react";
import * as THREE from "three";

type Planet3DProps = {
  className?: string;
  color?: string;
  style?: CSSProperties;
};

function PlanetMesh({ color }: { color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) {
      return;
    }
    meshRef.current.rotation.y += 0.01;
    meshRef.current.rotation.x += 0.003;
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.2}
          metalness={0.15}
          roughness={0.55}
        />
      </mesh>
      <mesh scale={1.06}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.08} />
      </mesh>
    </group>
  );
}

function Planet3D({ className, color = "#60A5FA", style }: Planet3DProps) {
  return (
    <div className={className} style={style}>
      <Canvas
        className="h-full w-full"
        camera={{ position: [0, 0, 3], fov: 45 }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.7} />
        <pointLight position={[3, 2, 3]} intensity={1.8} />
        <PlanetMesh color={color} />
      </Canvas>
    </div>
  );
}

export default Planet3D;
