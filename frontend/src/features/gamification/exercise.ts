/* Shared exercise session: Goals / Well-being start it; Home and Silhouette follow the zones. */
import { useSyncExternalStore } from "react";
import type { ZoneState } from "@/components/body3d";

export const BODY_PARTS = [
  { id: "legs", label: "Jambes", zone: "muscles" },
  { id: "arms", label: "Bras", zone: "muscles" },
  { id: "core", label: "Tronc", zone: "muscles" },
  { id: "spine", label: "Os", zone: "spine" },
  { id: "heart", label: "Cœur", zone: "heart" },
  { id: "lungs", label: "Poumons", zone: "lungs" },
] as const;

const PART_EN: Record<(typeof BODY_PARTS)[number]["id"], string> = {
  legs: "Legs", arms: "Arms", core: "Core", spine: "Bone", heart: "Heart", lungs: "Lungs",
};

export function partLabel(id: string, label: string, lang: "fr" | "en") {
  return lang === "en" ? PART_EN[id as keyof typeof PART_EN] ?? label : label;
}

type Snap = { running: boolean; step: number };
let snap: Snap = { running: false, step: 0 };
const listeners = new Set<() => void>();
let timer = 0;

function emit(next: Snap) {
  snap = next;
  listeners.forEach((fn) => fn());
}

export function startExercise() {
  window.clearInterval(timer);
  emit({ running: true, step: 0 });
  timer = window.setInterval(() => emit({ running: true, step: snap.step + 1 }), 3000);
}

export function stopExercise() {
  window.clearInterval(timer);
  timer = 0;
  emit({ running: false, step: snap.step });
}

export function useExerciseSession() {
  return useSyncExternalStore(
    (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    () => snap,
    () => snap,
  );
}

/** Silhouette zone matching the body part being worked right now. */
export function exerciseFocus(session: Snap) {
  if (!session.running) return "";
  return BODY_PARTS[session.step % BODY_PARTS.length].zone;
}

export function exercisePart(session: Snap) {
  if (!session.running) return null;
  return BODY_PARTS[session.step % BODY_PARTS.length];
}

/** Zones already covered in the session (including the current one). */
export function exerciseCovered(session: Snap): string[] {
  if (!session.running && session.step === 0) return [];
  const n = session.running ? Math.min(BODY_PARTS.length, session.step + 1) : Math.min(BODY_PARTS.length, session.step);
  const zones = new Set<string>();
  for (let i = 0; i < n; i++) zones.add(BODY_PARTS[i % BODY_PARTS.length].zone);
  return [...zones];
}

/**
 * Tints the body during the session: worked zones as `active` (green),
 * without overriding a clinical alert already present (medium / high).
 */
export function applyExerciseStates(base: Record<string, ZoneState>, session: Snap): Record<string, ZoneState> {
  if (!session.running) return base;
  const next = { ...base };
  for (const zone of exerciseCovered(session)) {
    const cur = next[zone] ?? "none";
    if (cur !== "medium" && cur !== "high") next[zone] = "active";
  }
  return next;
}
