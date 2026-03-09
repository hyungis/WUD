import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type Star3DProps = {
  className?: string;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  onZoomChange?: (distance: number) => void;
};

function StarMesh() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) {
      return;
    }
    meshRef.current.rotation.y += 0.003;
    meshRef.current.rotation.x += 0.001;
    meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.05;
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.8, 64, 64]} />
        <meshStandardMaterial
          color="#93c5fd"
          emissive="#38bdf8"
          emissiveIntensity={0.6}
          metalness={0.2}
          roughness={0.3}
        />
      </mesh>
      <mesh scale={1.0}>
        <sphereGeometry args={[0.8, 64, 64]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

function CameraControls({ onInteractionStart, onInteractionEnd, onZoomChange }: {
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  onZoomChange?: (distance: number) => void;
}) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);
  const lastDistanceRef = useRef<number | null>(null);

  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.rotateSpeed = 0.6;
    controls.zoomSpeed = 0.9;
    controls.panSpeed = 0.6;
    controls.minDistance = 1.2;
    controls.maxDistance = 20;
    gl.domElement.style.touchAction = "none";
    controls.addEventListener("start", () => {
      onInteractionStart?.();
    });
    controls.addEventListener("end", () => {
      onInteractionEnd?.();
    });
    controlsRef.current = controls;
    return () => {
      controls.dispose();
    };
  }, [camera, gl, onInteractionEnd, onInteractionStart]);

  useFrame(() => {
    controlsRef.current?.update();
    const distance = camera.position.length();
    if (lastDistanceRef.current === null || Math.abs(lastDistanceRef.current - distance) > 0.01) {
      lastDistanceRef.current = distance;
      onZoomChange?.(distance);
    }
  });

  return null;
}

function Star3D({ className, onInteractionStart, onInteractionEnd, onZoomChange }: Star3DProps) {
  return (
    <div className={className}>
      <Canvas
        className="h-full w-full"
        camera={{ position: [0, 0, 3], fov: 45 }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[3, 3, 3]} intensity={2.2} />
        <StarMesh />
        <CameraControls
          onInteractionStart={onInteractionStart}
          onInteractionEnd={onInteractionEnd}
          onZoomChange={onZoomChange}
        />
      </Canvas>
    </div>
  );
}

export default Star3D;
