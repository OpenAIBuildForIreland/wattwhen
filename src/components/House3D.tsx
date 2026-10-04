"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls, RoundedBox } from "@react-three/drei";
import { useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";

export type HouseConfig = {
  solar: boolean;
  ev: boolean;
  battery: boolean;
  heatpump: boolean;
};

export type Hotspot = {
  id: string;
  label: string;
  icon: ReactNode;
  position: [number, number, number];
  hint?: string; // e.g. "02:00–04:00"
};

const ROOF_ANGLE = Math.atan2(2.17, 2.9);

function Roof() {
  const geom = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-2.9, 0);
    s.lineTo(2.9, 0);
    s.lineTo(0, 2.17);
    s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: 6.6, bevelEnabled: false });
  }, []);
  return (
    <mesh geometry={geom} rotation={[0, Math.PI / 2, 0]} position={[-3.3, 4, 0]} castShadow receiveShadow>
      <meshStandardMaterial color="#5b6475" roughness={0.75} />
    </mesh>
  );
}

function SolarPanels() {
  const panels: [number, number][] = [];
  for (const x of [-2.0, -0.68, 0.64, 1.96]) for (const f of [0.28, 0.66]) panels.push([x, f]);
  const n = new THREE.Vector3(0, Math.cos(ROOF_ANGLE), Math.sin(ROOF_ANGLE));
  return (
    <group>
      {panels.map(([x, f], i) => {
        const z = 2.9 * (1 - f);
        const y = 4 + 2.17 * f;
        return (
          <mesh
            key={i}
            position={[x, y + n.y * 0.09, z + n.z * 0.09]}
            rotation={[ROOF_ANGLE, 0, 0]}
            castShadow
          >
            <boxGeometry args={[1.22, 0.05, 1.05]} />
            <meshStandardMaterial color="#13284d" metalness={0.6} roughness={0.25} emissive="#1d4ed8" emissiveIntensity={0.25} />
          </mesh>
        );
      })}
    </group>
  );
}

function Window({ position, size = [0.9, 1.1] as [number, number] }: { position: [number, number, number]; size?: [number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[size[0] + 0.14, size[1] + 0.14, 0.06]} />
        <meshStandardMaterial color="#e5e7eb" />
      </mesh>
      <mesh position={[0, 0, 0.035]}>
        <planeGeometry args={size} />
        <meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={0.55} />
      </mesh>
    </group>
  );
}

function Car() {
  return (
    <group position={[5.3, 0, 2.2]}>
      <RoundedBox args={[1.9, 0.7, 4.1]} radius={0.22} position={[0, 0.65, 0]} castShadow>
        <meshStandardMaterial color="#4f7ea8" metalness={0.4} roughness={0.35} />
      </RoundedBox>
      <RoundedBox args={[1.65, 0.6, 2.1]} radius={0.22} position={[0, 1.2, -0.2]} castShadow>
        <meshStandardMaterial color="#0b1220" metalness={0.3} roughness={0.1} />
      </RoundedBox>
      {[
        [-0.95, 1.3],
        [0.95, 1.3],
        [-0.95, -1.3],
        [0.95, -1.3],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.36, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.36, 0.36, 0.25, 24]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
      ))}
    </group>
  );
}

function Flow({
  points,
  color,
  speed = 0.25,
  count = 14,
  active = true,
}: {
  points: [number, number, number][];
  color: string;
  speed?: number;
  count?: number;
  active?: boolean;
}) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), [points]);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const tube = useMemo(() => new THREE.TubeGeometry(curve, 64, 0.025, 8, false), [curve]);
  useFrame(({ clock }) => {
    refs.current.forEach((m, i) => {
      if (!m) return;
      const t = (clock.elapsedTime * speed + i / count) % 1;
      m.position.copy(curve.getPointAt(t));
      const s = active ? 0.8 + 0.4 * Math.sin((t + i) * Math.PI) : 0.001;
      m.scale.setScalar(s);
    });
  });
  return (
    <group>
      <mesh geometry={tube}>
        <meshBasicMaterial color={color} transparent opacity={active ? 0.25 : 0.06} />
      </mesh>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el; }}>
          <sphereGeometry args={[0.075, 12, 12]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function HotspotButton({
  spot,
  selected,
  onSelect,
  setRef,
}: {
  spot: Hotspot;
  selected: boolean;
  onSelect: (id: string) => void;
  setRef: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      ref={setRef}
      onClick={() => onSelect(spot.id)}
      style={{ transform: "translate(-9999px,-9999px)" }}
      className={`absolute left-0 top-0 flex items-center gap-1.5 whitespace-nowrap rounded border px-2 py-1 text-[11px] ${
        selected ? "z-[2] border-best bg-background text-foreground" : "z-[1] border-line bg-background/85 text-foreground/90 hover:border-foreground/40"
      }`}
    >
      <span className="text-muted">{spot.icon}</span>
      <span>{spot.label}</span>
      {spot.hint && (
        <span className="font-mono text-[10px] text-best">
          {spot.hint}
        </span>
      )}
    </button>
  );
}

// Projects hotspot positions to screen space every frame and moves the DOM labels.
function Projector({ spots, refs }: { spots: Hotspot[]; refs: React.RefObject<Map<string, HTMLButtonElement>> }) {
  const { camera, size } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    for (const spot of spots) {
      const el = refs.current.get(spot.id);
      if (!el) continue;
      v.set(...spot.position).project(camera);
      const x = ((v.x + 1) / 2) * size.width;
      const y = ((1 - v.y) / 2) * size.height;
      el.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px)`;
    }
  });
  return null;
}

export default function House3D({
  config,
  hotspots,
  selected,
  onSelect,
  sunStrength,
  gridCo2,
}: {
  config: HouseConfig;
  hotspots: Hotspot[];
  selected: string | null;
  onSelect: (id: string) => void;
  sunStrength: number; // 0..1, current solar output relative to peak
  gridCo2: number | null;
}) {
  const gridColor = gridCo2 === null ? "#8fb3d9" : gridCo2 < 150 ? "#7bd88f" : gridCo2 < 250 ? "#d9b44a" : "#d4685c";
  const sunPos: [number, number, number] = [-7, 11, 9];
  const labelRefs = useRef(new Map<string, HTMLButtonElement>());

  return (
    <div className="relative h-full w-full">
    <Canvas shadows camera={{ position: [11, 7.5, 13], fov: 38 }} dpr={[1, 2]}>
      <color attach="background" args={["#17181b"]} />
      <fog attach="fog" args={["#17181b", 24, 48]} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#cfe3ff", "#29462f", 1.1]} />
      <directionalLight
        position={sunPos}
        intensity={1.4 + sunStrength}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      <pointLight position={[0, 2.5, 4]} intensity={6} color="#fbbf24" distance={8} />

      {/* sun */}
      <mesh position={sunPos}>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshBasicMaterial color="#e3b341" toneMapped={false} />
      </mesh>

      <group position={[0, 0, 0]}>
        {/* ground and driveway */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[16, 64]} />
          <meshStandardMaterial color="#3b5640" roughness={1} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5.3, 0.01, 3.5]} receiveShadow>
          <planeGeometry args={[3.2, 9]} />
          <meshStandardMaterial color="#3a3f4b" roughness={0.9} />
        </mesh>

        {/* house body */}
        <mesh position={[0, 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[6, 4, 5]} />
          <meshStandardMaterial color="#e9e4da" roughness={0.9} />
        </mesh>
        <Roof />
        {/* chimney */}
        <mesh position={[-2.2, 6.1, -0.6]} castShadow>
          <boxGeometry args={[0.6, 1.4, 0.6]} />
          <meshStandardMaterial color="#9a5b43" />
        </mesh>
        {/* door */}
        <mesh position={[0, 1.05, 2.52]}>
          <boxGeometry args={[1, 2.1, 0.06]} />
          <meshStandardMaterial color="#047857" />
        </mesh>
        <Window position={[-1.8, 1.3, 2.52]} size={[1.3, 1.1]} />
        <Window position={[1.8, 1.3, 2.52]} size={[1.3, 1.1]} />
        <Window position={[-1.8, 3.1, 2.52]} />
        <Window position={[0, 3.1, 2.52]} size={[0.6, 0.8]} />
        <Window position={[1.8, 3.1, 2.52]} />

        {config.solar && <SolarPanels />}
        {config.ev && (
          <>
            <Car />
            <mesh position={[3.06, 1.2, 1.6]} castShadow>
              <boxGeometry args={[0.12, 0.6, 0.4]} />
              <meshStandardMaterial color="#f8fafc" emissive="#34d399" emissiveIntensity={0.4} />
            </mesh>
          </>
        )}
        {config.battery && (
          <RoundedBox args={[0.3, 1.3, 0.9]} radius={0.06} position={[-3.16, 0.9, 1.2]} castShadow>
            <meshStandardMaterial color="#f1f5f9" emissive="#34d399" emissiveIntensity={0.15} />
          </RoundedBox>
        )}
        {config.heatpump && (
          <group position={[-4.2, 0.55, -1.2]}>
            <RoundedBox args={[1.1, 1.1, 0.5]} radius={0.06} castShadow>
              <meshStandardMaterial color="#cbd5e1" />
            </RoundedBox>
            <mesh position={[0, 0, 0.26]}>
              <circleGeometry args={[0.36, 32]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
          </group>
        )}

        {/* grid pole */}
        <group position={[-6.2, 0, -3.2]}>
          <mesh position={[0, 3.5, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.16, 7, 12]} />
            <meshStandardMaterial color="#6b4f3a" />
          </mesh>
          <mesh position={[0, 6.6, 0]}>
            <boxGeometry args={[1.6, 0.12, 0.12]} />
            <meshStandardMaterial color="#6b4f3a" />
          </mesh>
        </group>

        {/* energy flows */}
        <Flow points={[[-6.2, 6.6, -3.2], [-4.6, 5.8, -2.6], [-3, 4.1, -1.8]]} color={gridColor} speed={0.22} />
        {config.solar && (
          <Flow
            points={[sunPos, [-3.5, 8.5, 5], [0, 5.6, 1.6]]}
            color="#e3b341"
            speed={0.18 + 0.3 * sunStrength}
            active={sunStrength > 0.02}
          />
        )}
        {config.solar && (
          <Flow points={[[0, 5.2, 1.6], [0.5, 4.3, 2.6], [1, 3.2, 2.6]]} color="#e3b341" speed={0.3} count={8} active={sunStrength > 0.02} />
        )}
        {config.ev && <Flow points={[[3, 1.3, 1.6], [4.2, 1.6, 1.8], [5.3, 1.3, 2.2]]} color="#7bd88f" speed={0.35} count={10} />}
        {config.battery && <Flow points={[[-3, 2.6, 1.6], [-3.4, 2, 1.4], [-3.2, 1.4, 1.2]]} color="#b9a6e8" speed={0.3} count={8} />}
      </group>

      <Projector spots={hotspots} refs={labelRefs} />

      <ContactShadows position={[0, 0.02, 0]} opacity={0.45} scale={22} blur={2.4} far={8} />
      <OrbitControls
        enablePan={false}
        minDistance={10}
        maxDistance={26}
        minPolarAngle={0.5}
        maxPolarAngle={1.35}
        target={[0, 2.2, 0]}
      />
    </Canvas>
      <div className="pointer-events-none absolute inset-0 isolate z-0 overflow-hidden [&>button]:pointer-events-auto">
        {hotspots.map((h) => (
          <HotspotButton
            key={h.id}
            spot={h}
            selected={selected === h.id}
            onSelect={onSelect}
            setRef={(el) => {
              if (el) labelRefs.current.set(h.id, el);
              else labelRefs.current.delete(h.id);
            }}
          />
        ))}
      </div>
    </div>
  );
}
