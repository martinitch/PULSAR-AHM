/* 3D health silhouette — MakeHuman mesh « base.obj » (CC0 1.0), three.js / react-three-fiber render.
   Slightly translucent matte gray body, fine outline, no halo. Clickable zones = real <button> elements (keyboard OK). */
import { Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Outlines, useGLTF } from "@react-three/drei";
import * as THREE from "three";

import { ZONES3D, VIEW_ANGLE, VIEW_LABEL, type ZoneState, type View } from "./zones";
import { useLang, VIEW_NAME_EN, ZONE_NAME_EN } from "@/i18n";
import { moveHud, ZoneHud, type HudHandles } from "./ZoneHud";
import { body3d as T } from "@/design/tokens";
const AXIS_Y = new THREE.Vector3(0, 1, 0);
const BASE = new THREE.Color(T.base);
const TINT: Record<ZoneState, THREE.Color | null> = { nominal: new THREE.Color(T.nominal), medium: new THREE.Color(T.medium), high: new THREE.Color(T.high), active: new THREE.Color(T.active), none: null };

function Body({ states, sel, angle, zoom, btns, hud, onProject, theme }: { states: Record<string, ZoneState>; sel?: string; angle: number; zoom?: boolean; btns: MutableRefObject<Record<string, HTMLButtonElement | null>>; hud: MutableRefObject<HudHandles>; onProject?: (p: Record<string, [number, number, boolean]>) => void; theme: "dark" | "light" }) {
  const { scene } = useGLTF("/body3d/body.glb");
  const geom = useMemo(() => ((scene.getObjectByName("body") ?? scene.children[0]) as THREE.Mesh).geometry.clone(), [scene]);
  const mesh = useRef<THREE.Mesh>(null);
  const group = useRef<THREE.Group>(null);
  const { camera, size } = useThree();
  // surface anchors by ray-casting onto the skin
  const anchors = useMemo(() => {
    const m = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    const rc = new THREE.Raycaster();
    const out: Record<string, { pos: THREE.Vector3; nrm: THREE.Vector3 }> = {};
    for (const z of ZONES3D) {
      rc.set(new THREE.Vector3(z.p[0], z.p[1], z.dir * 2), new THREE.Vector3(0, 0, -z.dir));
      const hit = rc.intersectObject(m)[0];
      out[z.id] = { pos: hit ? hit.point.clone() : new THREE.Vector3(z.p[0], z.p[1], 0), nrm: new THREE.Vector3(0, 0, z.dir) };
    }
    return out;
  }, [geom]);
  // subtle per-zone vertex tint (computed before render so the material compiles with it)
  useMemo(() => {
    const pos = geom.getAttribute("position");
    const col = new Float32Array(pos.count * 3);
    const v = new THREE.Vector3(), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i); c.copy(BASE);
      for (const z of ZONES3D) {
        const t = TINT[states[z.id] ?? "none"]; if (!t) continue;
        const a = anchors[z.id].pos; const d = v.distanceTo(a);
        const R = z.r * 1.7; if (d < R) { const k = Math.min(1, (1 - d / R) ** 0.9 * (z.id === sel ? 0.95 : 0.75)); c.lerp(t, k); }
      }
      col.set([c.r, c.g, c.b], i * 3);
    }
    geom.setAttribute("color", new THREE.BufferAttribute(col, 3));
  }, [geom, anchors, JSON.stringify(states), sel]); // eslint-disable-line react-hooks/exhaustive-deps
  const cur = useRef(angle);
  const scale = useRef(1);
  const off = useRef({ x: 0, y: 0 });
  const reduce = useRef<boolean | null>(null);
  useFrame((_, dt) => {
    if (reduce.current === null) reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const spin = reduce.current ? 1 : Math.min(1, dt * 8);
    cur.current += (angle - cur.current) * spin;
    const k = reduce.current ? 1 : 1 - Math.exp(-dt * 4.6);
    const goalScale = zoom && sel ? 3.3 : 1;
    scale.current += (goalScale - scale.current) * k;
    let gx = 0;
    let gy = 0;
    if (zoom && sel && anchors[sel]) {
      const q = anchors[sel].pos.clone().applyAxisAngle(AXIS_Y, cur.current);
      gx = -q.x * scale.current;
      gy = 0.95 - q.y * scale.current;
    }
    off.current.x += (gx - off.current.x) * k;
    off.current.y += (gy - off.current.y) * k;
    if (group.current) {
      group.current.rotation.y = cur.current;
      group.current.scale.setScalar(scale.current);
      group.current.position.set(off.current.x, off.current.y, 0);
    }
    // hide hotspots facing away, and report projected positions for stills
    const proj: Record<string, [number, number, boolean]> = {};
    const camDir = new THREE.Vector3();
    for (const z of ZONES3D) {
      const n = anchors[z.id].nrm.clone().applyAxisAngle(AXIS_Y, cur.current);
      const p = anchors[z.id].pos.clone().applyAxisAngle(AXIS_Y, cur.current);
      p.multiplyScalar(scale.current);
      p.x += off.current.x;
      p.y += off.current.y;
      camDir.copy(camera.position).sub(p).normalize();
      const vis = n.dot(camDir) > 0.15;
      const s = p.clone().project(camera);
      proj[z.id] = [((s.x + 1) / 2) * 100, ((1 - s.y) / 2) * 100, vis];
      const b = btns.current[z.id]; if (b) { b.style.left = `${proj[z.id][0]}%`; b.style.top = `${proj[z.id][1]}%`; b.style.opacity = vis ? "1" : "0"; b.style.pointerEvents = vis ? "auto" : "none"; b.tabIndex = vis ? 0 : -1; }
    }
    if (zoom && sel && proj[sel]) moveHud(hud.current, proj[sel][0], proj[sel][1], proj[sel][2]);
    onProject?.(proj);
    void size;
  });
  const dark = theme === "dark";
  return (
    <group ref={group}>
      <mesh ref={mesh} geometry={geom}>
        <meshStandardMaterial vertexColors roughness={0.9} metalness={0} transparent opacity={dark ? 0.9 : 0.94} />
        <Outlines thickness={0.0035} color={dark ? "#d7dde4" : "#3d434b"} transparent opacity={dark ? 0.55 : 0.6} />
      </mesh>
    </group>
  );
}
function Cam() {
  const { camera } = useThree();
  useEffect(() => { camera.position.set(0, 0.9, 3.95); camera.lookAt(0, 0.88, 0); }, [camera]);
  return null;
}
export function Body3D({ states, sel, onPick, view = "front", onView, hotspots = true, onProject, theme = "dark", className, zoom, need }: { states: Record<string, ZoneState>; sel?: string; onPick?: (id: string) => void; view?: View; onView?: (v: View) => void; hotspots?: boolean; onProject?: (p: Record<string, [number, number, boolean]>) => void; theme?: "dark" | "light"; className?: string; zoom?: boolean; need?: string }) {
  const { lang, tr } = useLang();
  const [angle, setAngle] = useState(VIEW_ANGLE[view]);
  useEffect(() => setAngle(VIEW_ANGLE[view]), [view]);
  const drag = useRef<number | null>(null);
  const btns = useRef<Record<string, HTMLButtonElement | null>>({});
  const hud = useRef<HudHandles>({ line: null, lock: null, tag: null });
  const focused = !!(zoom && sel && need);
  return (
    <div className={`body3d${focused ? " is-zoom" : ""} ${className ?? ""}`}
      onPointerDown={(e) => { drag.current = e.clientX; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); }}
      onPointerMove={(e) => { if (drag.current !== null) { setAngle((a) => a + (e.clientX - drag.current!) * 0.012); drag.current = e.clientX; } }}
      onPointerUp={() => { drag.current = null; }} onPointerLeave={() => { drag.current = null; }}>
      <div className="body3d-view">
        <Canvas camera={{ fov: 30, near: 0.1, far: 20 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }} aria-hidden={!hotspots}>
          <Cam />
          <hemisphereLight args={[theme === "dark" ? "#dfe6ee" : "#ffffff", "#3a4048", 1.1]} />
          <directionalLight position={[2.5, 3, 3]} intensity={1.6} />
          <directionalLight position={[-3, 1.5, -2]} intensity={0.5} />
          <Suspense fallback={null}><Body states={states} sel={sel} angle={angle} zoom={zoom} btns={btns} hud={hud} onProject={onProject} theme={theme} /></Suspense>
        </Canvas>
        {hotspots && ZONES3D.map((z) => {
          const name = lang === "en" ? ZONE_NAME_EN[z.id] ?? z.label : z.label;
          return (
          <button key={z.id} ref={(el) => { btns.current[z.id] = el; }} style={{ opacity: 0 }} className={`hot3d abs st-${states[z.id] ?? "none"} ${z.id === sel ? "on" : ""}`} aria-pressed={z.id === sel} aria-label={name}
            onPointerDown={(e) => e.stopPropagation()} onClick={() => onPick?.(z.id)}><i /><span>{name}</span></button>
          );
        })}
      </div>
      {focused && <ZoneHud key={sel} x={50} y={42} label={need} tone={states[sel!] ?? "none"} live handles={hud.current} />}
      {onView && (
        <div className="view-seg" role="radiogroup" aria-label={tr("Vue du corps", "Body view")}>
          {(Object.keys(VIEW_LABEL) as View[]).map((v) => <button key={v} role="radio" aria-checked={view === v} onClick={() => onView(v)}>{lang === "en" ? VIEW_NAME_EN[v] : VIEW_LABEL[v]}</button>)}
        </div>
      )}
      {hotspots && <p className="body3d-hint">{focused ? tr("La zone reste au centre", "The zone stays centered") : tr("Glissez pour tourner", "Drag to rotate")}</p>}
    </div>
  );
}
useGLTF.preload("/body3d/body.glb");


/** DEV: full-screen render of a view (used to regenerate public/body3d/body-*.png). URL: /?still=front|34|side|back&theme=dark|light */
export function StillPage({ view, theme, states }: { view: View; theme: "dark" | "light"; states: Record<string, ZoneState> }) {
  return <div style={{ width: "100vw", height: "100vh", background: "transparent" }}><Body3D states={states} view={view} hotspots={false} theme={theme} onProject={(p) => { (window as unknown as { __hot: unknown }).__hot = p; }} /></div>;
}
