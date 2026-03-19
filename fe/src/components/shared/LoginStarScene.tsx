import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";

export type LoginStarSceneProps = {
  phase: "idle" | "login" | "success";
  onStarClick: () => void;
};

/* ═══════════════════════════════════════════════════════
   Interstellar Gargantua Black Hole
   단일 빌보드 셰이더로 정확한 Gargantua 렌더링:
   - 수평 강착원반 (좌우로 뻗은 밝은 밴드)
   - 중력렌즈 아크 (위/아래로 휘어진 빛)
   - 포톤 링 (사건의 지평선 바로 바깥 얇은 링)
   - 검은 사건의 지평선
   ═══════════════════════════════════════════════════════ */

const BH_RADIUS = 1.5;
const PLANE_SIZE = 14;
const BH_UV = BH_RADIUS / PLANE_SIZE; // UV 공간에서의 블랙홀 반지름

/* ── Gargantua 블랙홀 (빌보드 셰이더) ── */
function GargantuaBlackHole({ phase, onStarClick }: LoginStarSceneProps) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);

  const shaderArgs = useMemo(
    () => ({
      uniforms: {
        uTime: { value: 0 },
        uBhR: { value: BH_UV },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uBhR;
        varying vec2 vUv;

        void main() {
          vec2 p = vUv - 0.5;
          float r = length(p);
          float a = atan(p.y, p.x);
          float bh = uBhR;

          // ─── Colors ───
          vec3 cWhite  = vec3(1.0, 0.98, 0.93);
          vec3 cGold   = vec3(1.0, 0.82, 0.40);
          vec3 cOrange = vec3(0.90, 0.42, 0.08);
          vec3 cDark   = vec3(0.45, 0.15, 0.02);

          float ct = smoothstep(bh, bh + 0.22, r);
          vec3 diskCol = mix(cWhite, mix(cGold, mix(cOrange, cDark, ct), ct), ct);

          // ─── 1. Event Horizon (순수한 검은 원) ───
          float bhMask = smoothstep(bh + 0.001, bh - 0.003, r);

          // ─── 2. Photon Ring (매우 얇고 밝은 링) ───
          float prR = bh + 0.003;
          float pr = exp(-(r - prR) * (r - prR) / 4e-6) * 1.8;

          float pr2R = bh + 0.009;
          float pr2 = exp(-(r - pr2R) * (r - pr2R) / 3e-6) * 0.5;

          // ─── 3. Inner halo glow ───
          float glowDist = max(r - bh, 0.0);
          float halo = exp(-glowDist * glowDist / (0.01 * 0.01)) * 0.1;

          // ─── 4. Gravitational Lensing Arcs (위/아래 빛 아크) ───
          // 1차 렌즈 아크: 디스크 뒤쪽 빛이 위/아래로 휘어짐
          float a1R = bh + 0.014;
          float a1W = 0.008;
          float a1Ring = exp(-(r - a1R) * (r - a1R) / (a1W * a1W));

          // 위/아래에서 강하고, 좌우에서도 약간 보임
          float topBot = pow(abs(sin(a)), 0.4);
          float a1 = a1Ring * mix(0.12, 0.85, topBot);

          // 2차 아크 (더 바깥, 더 약함)
          float a2R = bh + 0.032;
          float a2W = 0.005;
          float a2Ring = exp(-(r - a2R) * (r - a2R) / (a2W * a2W));
          float a2 = a2Ring * mix(0.06, 0.35, pow(abs(sin(a)), 0.8)) * 0.4;

          // ─── 5. Inner halo glow ───
          float glowDist2 = max(r - bh, 0.0);
          float halo2 = exp(-glowDist2 * glowDist2 / (0.008 * 0.008)) * 0.08;

          // ─── Combine ───
          float total = a1 + a2 + pr + pr2 + halo + halo2;
          total *= (1.0 - bhMask);

          vec3 col = diskCol * total;

          // 포톤 링은 더 하얗게
          col += cWhite * (pr + pr2) * 0.4 * (1.0 - bhMask);

          float alpha = clamp(total * 1.3, 0.0, 1.0);

          // 사건의 지평선 내부: 완전 불투명 검정
          col = mix(col, vec3(0.0), bhMask);
          alpha = max(alpha, bhMask);

          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    [],
  );

  useFrame(({ camera }, delta) => {
    if (!ref.current || !mat.current) return;
    const speed = phase === "success" ? 2.0 : phase === "login" ? 1.0 : 0.5;
    mat.current.uniforms.uTime.value += delta * speed;
    ref.current.quaternion.copy(camera.quaternion);
  });

  return (
    <mesh ref={ref} onClick={onStarClick} renderOrder={10}>
      <planeGeometry args={[PLANE_SIZE, PLANE_SIZE]} />
      <shaderMaterial ref={mat} args={[shaderArgs]} />
    </mesh>
  );
}

/* ── 파티클 (주변 먼지) ── */
function DiskParticles({ phase }: { phase: LoginStarSceneProps["phase"] }) {
  const pointsRef = useRef<THREE.Points>(null);
  const PCOUNT = 5000;

  type P = { angle: number; radius: number; speed: number };

  const data = useMemo(() => {
    const positions = new Float32Array(PCOUNT * 3);
    const colors = new Float32Array(PCOUNT * 3);
    const params: P[] = [];

    for (let i = 0; i < PCOUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = BH_RADIUS + 0.15 + Math.random() * 0.6;
      const speed = 0.4 + Math.random() * 0.8;
      params.push({ angle, radius, speed });

      const i3 = i * 3;
      positions[i3] = Math.cos(angle) * radius;
      positions[i3 + 1] = Math.sin(angle) * radius;
      positions[i3 + 2] = 0;

      const t = (radius - (BH_RADIUS + 0.15)) / 0.6;
      const c = new THREE.Color().lerpColors(
        new THREE.Color("#fff0cc"),
        new THREE.Color("#aa5500"),
        t,
      );
      colors[i3] = c.r;
      colors[i3 + 1] = c.g;
      colors[i3 + 2] = c.b;
    }
    return { positions, colors, params };
  }, []);

  useFrame(({ camera }, delta) => {
    if (!pointsRef.current) return;
    // 빌보드: 카메라 정면을 향하게
    pointsRef.current.quaternion.copy(camera.quaternion);
    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const isSuccess = phase === "success";
    const pull = isSuccess ? 2.0 : phase === "login" ? 0.2 : 0.04;

    for (let i = 0; i < PCOUNT; i++) {
      const i3 = i * 3;
      const p = data.params[i];

      const kSpeed = p.speed * (1.5 / Math.max(p.radius, BH_RADIUS + 0.15));
      p.angle += delta * kSpeed * (isSuccess ? 3.5 : 1.0);
      p.radius = Math.max(BH_RADIUS * 0.3, p.radius - delta * pull * 0.1);

      if (!isSuccess && p.radius <= BH_RADIUS + 0.12) {
        p.radius = BH_RADIUS + 0.2 + Math.random() * 0.55;
        p.angle = Math.random() * Math.PI * 2;
      }

      pos[i3] = Math.cos(p.angle) * p.radius;
      pos[i3 + 1] = Math.sin(p.angle) * p.radius;
      pos[i3 + 2] = 0;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[data.colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.016}
        vertexColors
        transparent
        opacity={phase === "success" ? 0.35 : 0.18}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

/* ── 카메라 ── */
function CameraController({ phase }: { phase: LoginStarSceneProps["phase"] }) {
  const { camera } = useThree();

  const idlePos = useMemo(() => new THREE.Vector3(0, 0.3, 5), []);
  const loginPos = useMemo(() => new THREE.Vector3(0, 0.15, 6.5), []);
  const successPos = useMemo(() => new THREE.Vector3(0, 0, 0.8), []);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    if (phase === "success") {
      elapsed.current += delta;
      const t = Math.min(elapsed.current / 2.5, 1);
      const ease = t * t * (3 - 2 * t); // smoothstep
      camera.position.lerpVectors(loginPos, successPos, ease);
    } else {
      elapsed.current = 0;
      const target = phase === "idle" ? idlePos : loginPos;
      camera.position.lerp(target, 0.04);
    }
    camera.lookAt(0, 0, 0);
  });

  return (
    <OrbitControls
      enablePan={false}
      enableZoom={false}
      enableRotate={phase === "idle"}
      autoRotate={phase === "idle"}
      autoRotateSpeed={0.1}
      minPolarAngle={Math.PI / 2.4}
      maxPolarAngle={Math.PI / 1.7}
    />
  );
}

/* ── 메인 씬 ── */
export default function LoginStarScene({ phase, onStarClick }: LoginStarSceneProps) {
  return (
    <div className="absolute inset-0 bg-black">
      <Canvas camera={{ position: [0, 0.3, 5], fov: 48 }}>
        <color attach="background" args={["#000000"]} />

        <EffectComposer multisampling={0}>
          <Bloom
            luminanceThreshold={phase === "success" ? 0.01 : 0.1}
            luminanceSmoothing={0.8}
            intensity={phase === "success" ? 4.5 : 1.8}
            mipmapBlur
          />
        </EffectComposer>

        <Stars radius={200} depth={80} count={2000} factor={2} saturation={0} fade speed={0.1} />

        <GargantuaBlackHole phase={phase} onStarClick={onStarClick} />
        <DiskParticles phase={phase} />
        <CameraController phase={phase} />
      </Canvas>
    </div>
  );
}
