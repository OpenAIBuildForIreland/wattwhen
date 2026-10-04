"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  ContactShadows,
  RoundedBox,
  Line,
} from "@react-three/drei";
import { Component, useMemo, useRef } from "react";
import { useReducedMotion } from "motion/react";
import * as THREE from "three";
import type { Household, Slot } from "@/lib/types";
import { localParts } from "@/lib/time";
import Icon from "./Icon";
type V3 = [number, number, number];
const labelPositions: Record<string, V3> = {
  washer: [-2, 1.5, 1],
  dishwasher: [0.8, 0.4, 2.2],
  immersion: [-0.6, 3.7, -0.3],
  dryer: [-2, 0.6, 0.4],
  heatpump: [-1.9, 0.4, -0.8],
  ev: [3, 1.1, 1.8],
};
type LabelRefs = { current: Record<string, HTMLDivElement | null> };
function Box({
  position,
  size,
  color,
  rotation,
  emissive,
}: {
  position: V3;
  size: V3;
  color: string;
  rotation?: V3;
  emissive?: string;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        roughness={0.8}
        emissive={emissive}
        emissiveIntensity={0.5}
      />
    </mesh>
  );
}
function Tree({ position, scale = 1 }: { position: V3; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.65, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.1, 1.3, 7]} />
        <meshStandardMaterial color="#766654" />
      </mesh>
      <mesh position={[0, 1.45, 0]} castShadow>
        <icosahedronGeometry args={[0.7, 1]} />
        <meshStandardMaterial color="#68866e" roughness={1} />
      </mesh>
      <mesh position={[0.2, 1.9, 0]} castShadow>
        <icosahedronGeometry args={[0.5, 1]} />
        <meshStandardMaterial color="#7f9b7a" roughness={1} />
      </mesh>
    </group>
  );
}
function Flow({
  points,
  color,
  power,
  paused,
}: {
  points: V3[];
  color: string;
  power: number;
  paused: boolean;
}) {
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
    [points],
  );
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    refs.current.forEach((mesh, i) => {
      if (mesh) {
        const t = paused
          ? i / 5
          : (clock.elapsedTime * (0.035 + Math.min(power, 8) * 0.014) + i / 5) %
            1;
        mesh.position.copy(curve.getPoint(t));
      }
    });
  });
  return (
    <group>
      <Line
        points={curve.getPoints(35)}
        color={color}
        transparent
        opacity={0.2}
        lineWidth={1.5}
      />
      {Array.from({ length: 5 }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            refs.current[i] = m;
          }}
        >
          <sphereGeometry args={[0.035, 7, 7]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
    </group>
  );
}
function Gable({ z }: { z: number }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [-1.5, 2.9, z, 1.5, 2.9, z, 0, 3.86, z],
        3,
      ),
    );
    g.computeVertexNormals();
    return g;
  }, [z]);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#e3decf" side={THREE.DoubleSide} />
    </mesh>
  );
}
function Scene({
  household: h,
  slot,
  selected,
  paused,
  labelRefs,
}: {
  household: Household;
  slot?: Slot;
  selected: string;
  paused: boolean;
  labelRefs: LabelRefs;
}) {
  const night = slot
    ? +localParts(slot.start).hour < 7 || +localParts(slot.start).hour >= 19
    : false;
  const hour = slot ? +localParts(slot.start).hour : 14;
  const sunAngle = ((hour - 6) / 12) * Math.PI;
  const labelVector = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    for (const a of h.appliances) {
      const el = labelRefs.current[a.id];
      if (!el) continue;
      const p = labelPositions[a.id];
      labelVector.set(p[0], p[1] - 0.4, p[2]).project(camera);
      el.style.setProperty(
        "transform",
        `translate3d(${((labelVector.x + 1) * size.width) / 2}px,${((1 - labelVector.y) * size.height) / 2}px,0)`,
      );
    }
  });
  return (
    <>
      <ambientLight intensity={night ? 0.8 : 1.5} />
      <hemisphereLight args={["#e4f5ff", "#546548", 1.5]} />
      <directionalLight
        position={[
          Math.cos(sunAngle) * 8,
          Math.max(2, Math.sin(sunAngle) * 10),
          4,
        ]}
        intensity={night ? 1.3 : 3}
        color={night ? "#b4c5ff" : "#fff2d5"}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-bias={-0.001}
      />
      <group position={[0, -0.4, 0]}>
        <RoundedBox
          args={[7.8, 0.34, 6]}
          radius={0.22}
          position={[0, -0.2, 0]}
          receiveShadow
        >
          <meshStandardMaterial color="#56685a" roughness={1} />
        </RoundedBox>
        <RoundedBox
          args={[7.6, 0.09, 5.8]}
          radius={0.17}
          position={[0, 0.01, 0]}
          receiveShadow
        >
          <meshStandardMaterial color="#899681" roughness={1} />
        </RoundedBox>
        <Box
          position={[2.4, 0.07, 1.2]}
          size={[2.2, 0.05, 3.6]}
          color="#b5b9b0"
        />
        <Box
          position={[-0.45, 0.07, 2.05]}
          size={[1.1, 0.06, 1.7]}
          color="#d7d4c7"
        />
        <Box
          position={[-0.4, 1.5, -0.5]}
          size={[3, 2.8, 2.4]}
          color="#e3decf"
        />
        <group position={[-0.4, 0, -0.5]}>
          <Gable z={1.205} />
          <Gable z={-1.205} />
          <Box
            position={[-0.83, 3.4, 0]}
            size={[2.02, 0.16, 2.8]}
            rotation={[0, 0, 0.57]}
            color="#44565b"
          />
          <Box
            position={[0.83, 3.4, 0]}
            size={[2.02, 0.16, 2.8]}
            rotation={[0, 0, -0.57]}
            color="#52666a"
          />
          <Box
            position={[0, 3.94, 0]}
            size={[0.13, 0.12, 2.85]}
            color="#73817f"
          />
        </group>
        <Box
          position={[-1.35, 3.75, -1.2]}
          size={[0.38, 1.1, 0.45]}
          color="#ad9e88"
        />
        <Box
          position={[-1.35, 4.31, -1.2]}
          size={[0.48, 0.12, 0.53]}
          color="#73817f"
        />
        {[-1.25, 0.4].map((x) =>
          [1.05, 2.3].map((y) => (
            <group key={`${x}${y}`}>
              <Box
                position={[x, y, 0.714]}
                size={[0.71, 0.9, 0.1]}
                color="#faf5e5"
              />
              <Box
                position={[x, y, 0.78]}
                size={[0.57, 0.76, 0.04]}
                color={night ? "#f1c47d" : "#728f95"}
                emissive={night ? "#cf903e" : undefined}
              />
              <Box
                position={[x, y, 0.81]}
                size={[0.035, 0.8, 0.02]}
                color="#e4e0d2"
              />
              <Box
                position={[x, y, 0.81]}
                size={[0.6, 0.03, 0.02]}
                color="#e4e0d2"
              />
            </group>
          )),
        )}
        <Box
          position={[-0.45, 0.7, 0.77]}
          size={[0.64, 1.3, 0.14]}
          color="#4a6867"
        />
        <Box
          position={[-0.25, 0.65, 0.86]}
          size={[0.035, 0.06, 0.035]}
          color="#dbcda4"
        />
        {[0, -1.1].map((z) => (
          <group key={z}>
            <Box
              position={[1.12, 2.25, z]}
              size={[0.06, 0.85, 0.63]}
              color="#faf5e5"
            />
            <Box
              position={[1.16, 2.25, z]}
              size={[0.04, 0.7, 0.5]}
              color={night ? "#e7b96e" : "#6f8c90"}
            />
          </group>
        ))}
        <Box
          position={[-0.4, 0.27, -0.5]}
          size={[3.08, 0.32, 2.48]}
          color="#b9b0a1"
        />
        {h.solar && (
          <group position={[0.48, 3.55, -0.5]} rotation={[0, 0, -0.57]}>
            {[-0.42, 0.42].map((x) =>
              [-0.68, 0, 0.68].map((z) => (
                <group key={`${x}${z}`}>
                  <Box
                    position={[x, 0.09, z]}
                    size={[0.72, 0.06, 0.6]}
                    color="#b2c8c6"
                  />
                  <Box
                    position={[x, 0.13, z]}
                    size={[0.66, 0.025, 0.54]}
                    color="#263f57"
                  />
                  {[-0.16, 0.16].map((dx) => (
                    <Box
                      key={dx}
                      position={[x + dx, 0.15, z]}
                      size={[0.01, 0.008, 0.53]}
                      color="#6d8b9c"
                    />
                  ))}
                </group>
              )),
            )}
          </group>
        )}
        {h.battery && (
          <group>
            <RoundedBox
              args={[0.22, 0.8, 0.56]}
              radius={0.05}
              position={[1.24, 0.9, -1.2]}
            >
              <meshStandardMaterial color="#edece2" />
            </RoundedBox>
            <Box
              position={[1.37, 1.06, -1.2]}
              size={[0.02, 0.035, 0.18]}
              color="#c2f499"
              emissive="#aafc86"
            />
          </group>
        )}
        {h.ev && (
          <group position={[2.5, 0.25, 1]}>
            <RoundedBox
              args={[1.15, 0.42, 2.1]}
              radius={0.18}
              position={[0, 0.27, 0]}
              castShadow
            >
              <meshStandardMaterial
                color="#c4d5c7"
                metalness={0.25}
                roughness={0.3}
              />
            </RoundedBox>
            <RoundedBox
              args={[0.99, 0.48, 1.1]}
              radius={0.18}
              position={[0, 0.64, -0.15]}
              castShadow
            >
              <meshStandardMaterial
                color="#90aba9"
                metalness={0.4}
                roughness={0.2}
              />
            </RoundedBox>
            <Box
              position={[0, 0.71, 0.37]}
              size={[0.84, 0.3, 0.04]}
              rotation={[-0.3, 0, 0]}
              color="#30484c"
            />
            {[-0.53, 0.53].map((x) =>
              [-0.67, 0.67].map((z) => (
                <mesh
                  key={`${x}${z}`}
                  position={[x, 0.17, z]}
                  rotation={[0, 0, Math.PI / 2]}
                >
                  <cylinderGeometry args={[0.22, 0.22, 0.14, 16]} />
                  <meshStandardMaterial color="#263032" />
                </mesh>
              )),
            )}
            <Box
              position={[0, 0.29, 1.06]}
              size={[0.8, 0.07, 0.02]}
              color="#f3e5b4"
              emissive="#edd799"
            />
          </group>
        )}
        {h.ev && (
          <>
            <Box
              position={[1.35, 1, 0.1]}
              size={[0.16, 0.46, 0.25]}
              color="#293f40"
            />
            <Line
              points={[
                [1.45, 0.9, 0.1],
                [1.8, 0.35, 0.3],
                [2, 0.45, 0.6],
              ]}
              color="#263c39"
              lineWidth={3}
            />
          </>
        )}
        <Tree position={[-2.8, 0.08, -1.7]} scale={1.2} />
        <Tree position={[2.8, 0.08, -2.1]} scale={0.9} />
        <Tree position={[-3.1, 0.08, 1.55]} scale={0.7} />
        {[-2.9, -2.3, -1.7, -1.1, -0.5, 0.1, 0.7, 1.3, 1.9, 2.5, 3.1].map(
          (x) => (
            <Box
              key={x}
              position={[x, 0.33, -2.7]}
              size={[0.08, 0.6, 0.08]}
              color="#c6c4ae"
            />
          ),
        )}
        <Box
          position={[0, 0.42, -2.7]}
          size={[6.3, 0.065, 0.06]}
          color="#c6c4ae"
        />
        <Box
          position={[3.4, 1.7, -0.5]}
          size={[0.1, 3.4, 0.1]}
          color="#8a8072"
        />
        <Box
          position={[3.4, 3.1, -0.5]}
          size={[0.12, 0.12, 1]}
          color="#8a8072"
        />
        <Flow
          points={[
            [3.4, 3.1, -0.5],
            [2.6, 2.6, 0.2],
            [1.2, 1.2, 0.6],
          ]}
          color="#c7b5fa"
          power={selected === "ev" ? 7 : 2}
          paused={paused}
        />
        {h.solar && (
          <Flow
            points={[
              [0.6, 3.7, 0],
              [1.5, 2.8, 0.5],
              [1.2, 1.2, 0.6],
            ]}
            color="#f7ce79"
            power={slot?.solarKW ?? 0}
            paused={paused || !slot?.solarKW}
          />
        )}
        {h.ev && (
          <Flow
            points={[
              [1.2, 1.2, 0.6],
              [1.8, 0.85, 1.3],
              [2.5, 0.7, 1.8],
            ]}
            color="#b7e994"
            power={h.ev.chargerKW}
            paused={paused}
          />
        )}
        {h.battery && (
          <Flow
            points={[
              [1.2, 1.2, 0.6],
              [1.8, 1, -0.3],
              [1.4, 0.95, -1.2],
            ]}
            color="#b7e994"
            power={1}
            paused={paused}
          />
        )}
      </group>
      <ContactShadows
        position={[0, -0.58, 0]}
        opacity={0.35}
        scale={15}
        blur={2.5}
        far={7}
        resolution={256}
        color="#030b07"
      />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2.5}
        minAzimuthAngle={-0.5}
        maxAzimuthAngle={1.5}
        target={[0, 1.1, 0]}
      />
    </>
  );
}
class SceneBoundary extends Component<
  { children: React.ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="scene-fallback">
        <Icon name="home" size={80} />
        <p>
          Your home, connected.
          <br />
          Use the appliance cards to explore your plan.
        </p>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function House3D(props: {
  household: Household;
  slot?: Slot;
  selected: string;
  onSelect: (id: string) => void;
  paused: boolean;
}) {
  const reduced = useReducedMotion(),
    labelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  return (
    <SceneBoundary>
      <div className="scene-container">
        <Canvas
          shadows
          dpr={[1, 1.7]}
          camera={{ position: [9, 7.5, 11], fov: 33 }}
          gl={{ alpha: true, antialias: true }}
        >
          <Scene
            {...props}
            labelRefs={labelRefs}
            paused={props.paused || !!reduced}
          />
        </Canvas>
        <div className="scene-label-layer">
          {props.household.appliances.map((a) => (
            <div
              className="projected-label"
              key={a.id}
              ref={(el) => {
                labelRefs.current[a.id] = el;
              }}
            >
              <button
                className={`house-label ${props.selected === a.id ? "selected" : ""}`}
                onClick={() => props.onSelect(a.id)}
                aria-pressed={props.selected === a.id}
              >
                <Icon name={a.id} size={15} />
                <span>
                  {a.id === "washer"
                    ? "Laundry"
                    : a.id === "ev"
                      ? "Electric car"
                      : a.name}
                </span>
                <i />
              </button>
            </div>
          ))}
        </div>
      </div>
    </SceneBoundary>
  );
}
