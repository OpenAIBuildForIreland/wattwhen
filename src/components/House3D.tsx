"use client";

/* Three.js owns mutable scene objects; React state stays immutable. */
/* eslint-disable react-hooks/immutability */

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, useGLTF, useProgress } from "@react-three/drei";
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { Home, Layers, Moon, RotateCcw, Sun } from "lucide-react";
import * as THREE from "three";

export type HouseConfig = { solar: boolean; ev: boolean; battery: boolean; heatpump: boolean };
export type Hotspot = { id: string; label: string; icon: ReactNode; position: [number, number, number]; hint?: string };
const MODEL = "/models/wattwhen-home.glb";
const INTERIOR = new Set(["washer", "dryer", "dishwasher", "immersion"]);
const SHELL = ["Shell_Front", "Shell_Right", "Shell_Roof_Front", "Shell_Roof_Back", "Shell_UpperFloor"];
const NIGHT: Record<string, [number, number]> = {
  Window_Warm_Light: [0, 1.8], Status_Solar: [.2, .85], Status_EV: [.2, .85],
  Status_Battery: [.2, .85], Status_Appliance: [.2, .85], EV_Lamp_Pearl: [0, .6],
};
function selectionRoot(object: THREE.Object3D | null) {
  while (object) { if (object.userData.selectableId) return object.userData.selectableId as string; object = object.parent; }
  return null;
}
function visible(object: THREE.Object3D | null): boolean {
  while (object) { if (!object.visible) return false; object = object.parent; }
  return true;
}

function Model({ config, cutaway, night, selected, onSelect }: {
  config: HouseConfig; cutaway: boolean; night: boolean; selected: string | null; onSelect: (id: string) => void;
}) {
  const { scene } = useGLTF(MODEL);
  const invalidate = useThree((s) => s.invalidate);
  const model = useMemo(() => {
    const root = scene.clone(true);
    const materials: { material: THREE.MeshStandardMaterial; emission: THREE.Color; intensity: number; id: string | null }[] = [];
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = object.receiveShadow = true;
      const clone = (source: THREE.MeshStandardMaterial) => {
        const material = source.clone();
        materials.push({ material, emission: source.emissive.clone(), intensity: source.emissiveIntensity, id: selectionRoot(object) });
        return material;
      };
      object.material = Array.isArray(object.material) ? object.material.map(clone) : clone(object.material);
    });
    return { root, materials };
  }, [scene]);
  useEffect(() => () => model.materials.forEach(({ material }) => material.dispose()), [model]);
  useEffect(() => {
    for (const name of SHELL) model.root.getObjectByName(name)!.visible = !cutaway;
    const groups = { System_Solar: config.solar && !cutaway, System_EV: config.ev, System_Battery: config.battery, Appliance_HeatPump: config.heatpump };
    for (const [name, show] of Object.entries(groups)) model.root.getObjectByName(name)!.visible = show;
    for (const entry of model.materials) {
      const { material, emission, intensity, id } = entry;
      material.emissive.copy(emission);
      material.emissiveIntensity = NIGHT[material.name]?.[night ? 1 : 0] ?? intensity;
      if (id && id === selected) { material.emissive.set("#9bbd85"); material.emissiveIntensity = .24; }
    }
    invalidate();
  }, [model, config, cutaway, night, selected, invalidate]);
  const pick = (event: ThreeEvent<MouseEvent>) => {
    if (event.delta > 5) return;
    const hit = event.intersections.find((intersection) => visible(intersection.object));
    const id = hit && selectionRoot(hit.object);
    if (id) { event.stopPropagation(); onSelect(id); }
  };
  return <primitive object={model.root} dispose={null} onClick={pick} />;
}

function CameraFit() {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    const orthographic = camera as THREE.OrthographicCamera;
    const span = Math.max(15.4, 17.5 / (size.width / size.height));
    orthographic.zoom = size.height / span;
    orthographic.updateProjectionMatrix();
    invalidate();
  }, [camera, size, invalidate]);
  return null;
}
function EnergyFlow({ points, color, active }: { points: [number, number, number][]; color: string; active: boolean }) {
  const particles = useRef<(THREE.Mesh | null)[]>([]);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), [points]);
  useFrame(({ clock }) => {
    if (!active) return;
    particles.current.forEach((mesh, i) => { if (mesh) mesh.position.copy(curve.getPointAt((clock.elapsedTime * .2 + i / 6) % 1)); });
  });
  if (!active) return null;
  return <group>{Array.from({ length: 6 }, (_, i) => <mesh key={i} ref={(m) => { particles.current[i] = m; }}>
    <sphereGeometry args={[.045, 8, 6]} /><meshBasicMaterial color={color} toneMapped={false} />
  </mesh>)}</group>;
}
const SOLAR_FLOW: [number, number, number][] = [[.1, 6.95, .4], [3.2, 5.6, .6], [3.15, 1.8, -1.19]];
const EV_FLOW: [number, number, number][] = [[3.08, 1.3, .8], [3.44, .5, 1.65], [3.62, 1.05, 1.78]];
const BATTERY_FLOW: [number, number, number][] = [[3.15, 1.7, -1.19], [3.4, 1.6, -.4], [3.28, 1.3, -.1]];

class ModelBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div role="status" className="flex h-full items-center justify-center p-8 text-center text-sm text-muted">The home couldn’t load. Your energy plan is still available below.</div> : this.props.children; }
}

export default function House3D({ config, hotspots, selected, onSelect, sunStrength, gridCo2 }: {
  config: HouseConfig; hotspots: Hotspot[]; selected: string | null; onSelect: (id: string) => void;
  sunStrength: number; gridCo2: number | null;
}) {
  const [cutaway, setCutaway] = useState(false);
  const [night, setNight] = useState(false);
  const [viewKey, setViewKey] = useState(0);
  const reducedMotion = useReducedMotion();
  const { active: loading } = useProgress();
  const previousSelection = useRef(selected);
  useEffect(() => {
    if (previousSelection.current !== selected) {
      setCutaway(!!selected && INTERIOR.has(selected));
      previousSelection.current = selected;
    }
  }, [selected]);
  const choose = (id: string) => { setCutaway(INTERIOR.has(id)); onSelect(id); };
  const gridColor = gridCo2 === null ? "#8fb3d9" : gridCo2 < 150 ? "#9ac88b" : gridCo2 < 250 ? "#d9b44a" : "#d4685c";
  const controlsClass = "flex min-h-9 items-center gap-1.5 rounded-md border border-line bg-background/90 px-2.5 text-xs text-foreground backdrop-blur-sm hover:border-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-best";
  return <div className="relative h-full w-full" aria-label="Interactive home and appliances">
    <div className="absolute inset-x-0 bottom-[180px] top-[260px] min-[760px]:inset-y-0 min-[760px]:left-[210px]">
      <ModelBoundary>
        <Canvas key={viewKey} orthographic shadows={{ type: THREE.PCFShadowMap }} camera={{ position: [13, 14, 19], zoom: 30, near: .1, far: 120 }} dpr={[1, 1.5]}
          frameloop={reducedMotion || (!config.ev && !config.battery && !config.solar) ? "demand" : "always"}
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.12 }}
          fallback={<p className="p-8 text-sm text-muted">3D is unavailable on this device. Select an appliance to see its plan.</p>}>
          <color attach="background" args={["#17181b"]} />
          <hemisphereLight args={["#e3ebdb", "#29362d", night ? .5 : 2]} />
          <directionalLight position={[-7, 16, 10]} color="#fff2d6" intensity={night ? .5 : 3.5 + sunStrength * .3} castShadow
            shadow-mapSize={[2048, 2048]} shadow-camera-left={-11} shadow-camera-right={11} shadow-camera-top={12}
            shadow-camera-bottom={-10} shadow-camera-near={1} shadow-camera-far={50} shadow-normalBias={.03} shadow-bias={-.00015} />
          <directionalLight position={[8, 7, -3]} color="#c0d5dc" intensity={night ? .55 : 1.6} />
          <Suspense fallback={null}>
            <Model config={config} cutaway={cutaway} night={night} selected={selected} onSelect={choose} />
          </Suspense>
          <EnergyFlow points={SOLAR_FLOW} color="#e8c982" active={!reducedMotion && config.solar && !cutaway && !night && sunStrength > .02} />
          <EnergyFlow points={EV_FLOW} color={gridColor} active={!reducedMotion && config.ev} />
          <EnergyFlow points={BATTERY_FLOW} color="#c3eb9c" active={!reducedMotion && config.battery} />
          <CameraFit />
          <OrbitControls enablePan={false} enableZoom={false} enableDamping={!reducedMotion} minPolarAngle={.45} maxPolarAngle={1.3}
            minAzimuthAngle={-.7} maxAzimuthAngle={1.25} target={[0, 2.8, .3]} />
        </Canvas>
      </ModelBoundary>
    </div>
    {loading && <p role="status" className="absolute left-1/2 top-1/2 text-sm text-muted">Preparing your home…</p>}
    <div className="absolute right-3 top-[248px] z-10 flex gap-1.5 min-[760px]:top-3" role="group" aria-label="House view">
      <button className={controlsClass} aria-pressed={cutaway} onClick={() => setCutaway((v) => !v)}>{cutaway ? <Home size={14} aria-hidden /> : <Layers size={14} aria-hidden />}{cutaway ? "Exterior" : "Look inside"}</button>
      <button className={controlsClass} aria-pressed={night} onClick={() => setNight((v) => !v)}>{night ? <Sun size={14} aria-hidden /> : <Moon size={14} aria-hidden />}{night ? "Day" : "Night"}</button>
      <button className={controlsClass} aria-label="Reset house view" onClick={() => setViewKey((v) => v + 1)}><RotateCcw size={14} aria-hidden /></button>
    </div>
    <div className="absolute bottom-20 left-4 z-[2] grid w-[260px] grid-cols-2 gap-1.5" role="group" aria-label="Select an appliance">
      {hotspots.map((spot) => <button key={spot.id} title={spot.label} aria-pressed={selected === spot.id} onClick={() => choose(spot.id)}
        className={`flex min-h-9 min-w-0 items-center gap-1.5 rounded border bg-background/90 px-2 py-1 text-left text-[11px] backdrop-blur-sm focus-visible:outline-2 focus-visible:outline-best ${selected === spot.id ? "border-best text-foreground" : "border-line text-muted hover:border-foreground/40"}`}>
        <span aria-hidden>{spot.icon}</span><span className="min-w-0 flex-1 truncate">{spot.label}</span>{spot.hint && <span className="font-mono text-[10px] text-best">{spot.hint}</span>}
      </button>)}
      {config.battery && <button onClick={() => choose("battery")} aria-pressed={selected === "battery"} className={`${controlsClass} col-span-2 justify-center ${selected === "battery" ? "border-best" : ""}`}>Home battery</button>}
    </div>
    {selected === "battery" && config.battery && <p role="status" className="absolute bottom-4 right-4 max-w-48 rounded border border-line bg-background/90 px-3 py-2 text-xs text-muted">Home battery · stores energy for later use.</p>}
  </div>;
}
