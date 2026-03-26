import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { 
    IcosahedronGeometry, Vector3, BufferGeometry, Float32BufferAttribute, 
    SphereGeometry, BoxGeometry, OctahedronGeometry, TorusKnotGeometry, 
    DodecahedronGeometry, TetrahedronGeometry 
} from "three";
import { Float } from "@react-three/drei";
import { useCustomStarStore, type StarShape } from "../../store/customStarStore";

// ── 커스텀 중심별에 사용할 geometry 캐시 ──
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

const MINI_STELLATED_GEOMETRY = createStellatedPolyhedronGeometry(1, 0.62);

const MINI_SHAPE_GEOMETRIES: Record<StarShape, BufferGeometry> = {
    sphere: new SphereGeometry(1, 16, 16),
    box: new BoxGeometry(1.2, 1.2, 1.2),
    octahedron: new OctahedronGeometry(1, 0),
    icosahedron: new IcosahedronGeometry(1, 0),
    torusKnot: new TorusKnotGeometry(0.7, 0.2, 64, 12),
    dodecahedron: new DodecahedronGeometry(1, 0),
    tetrahedron: new TetrahedronGeometry(1, 0),
    stellated: MINI_STELLATED_GEOMETRY,
};

function MiniStarMesh() {
    const meshRef = useRef<any>(null);
    const currentShape = useCustomStarStore((s) => s.currentShape);
    const currentColor = useCustomStarStore((s) => s.currentColor);
    const geometry = MINI_SHAPE_GEOMETRIES[currentShape] || MINI_STELLATED_GEOMETRY;

    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += delta * 0.8;
            meshRef.current.rotation.x += delta * 0.3;

            // 은은한 반짝임 효과
            const time = state.clock.elapsedTime;
            const intensity = 1.5 + Math.sin(time * 2) * 0.5;
            if (meshRef.current.material) {
                meshRef.current.material.emissiveIntensity = intensity;
            }
        }
    });

    return (
        <mesh ref={meshRef} geometry={geometry}>
            <meshStandardMaterial
                color={currentColor}
                emissive={currentColor}
                emissiveIntensity={1.5}
                roughness={0.2}
                metalness={0.5}
            />
        </mesh>
    );
}

interface SmallStarViewProps {
    className?: string;
}

export default function SmallStarView({ className }: SmallStarViewProps) {
    return (
        <div className={`relative h-full w-full ${className}`}>
            <Canvas camera={{ position: [0, 0, 4.0], fov: 45 }} gl={{ antialias: true, alpha: true }}>
                <ambientLight intensity={1.2} />
                <pointLight position={[5, 5, 5]} intensity={50} />
                <Float speed={2} rotationIntensity={1} floatIntensity={1}>
                    <MiniStarMesh />
                </Float>
            </Canvas>
        </div>
    );
}
