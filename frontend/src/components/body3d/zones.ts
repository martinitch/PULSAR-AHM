/* 3D silhouette zones — shared without loading three.js. */
/** `active` = zone worked by the exercise session (countermeasure), not a clinical state. */
export type ZoneState = "nominal" | "medium" | "high" | "none" | "active";
export type View = "front" | "34" | "side" | "back";
export const VIEW_ANGLE: Record<View, number> = { front: 0, "34": -Math.PI / 4, side: -Math.PI / 2, back: Math.PI };
export const VIEW_LABEL: Record<View, string> = { front: "Face", "34": "¾", side: "Profil", back: "Dos" };
/** Anatomical anchors (m, 1.75 m body, face toward +z, subject’s left = +x). dir: side from which we project onto the skin. r: tint radius. */
export const ZONES3D: { id: string; label: string; p: [number, number]; dir: 1 | -1; r: number; z?: number }[] = [
  { id: "brain", label: "Cerveau", p: [0, 1.715], dir: 1, r: 0.11 },
  { id: "eyes", label: "Yeux", p: [0.033, 1.624], dir: 1, r: 0.045 },
  { id: "heart", label: "Cœur", p: [0.045, 1.29], dir: 1, r: 0.085 },
  { id: "lungs", label: "Poumons", p: [-0.085, 1.34], dir: 1, r: 0.1 },
  { id: "immune", label: "Immunité", p: [-0.06, 1.12], dir: 1, r: 0.08 },
  { id: "skin", label: "Peau", p: [-0.36, 1.19], dir: 1, r: 0.07 },
  { id: "spine", label: "Os", p: [0, 1.22], dir: -1, r: 0.09 },
  { id: "kidneys", label: "Reins", p: [0.075, 1.07], dir: -1, r: 0.07 },
  { id: "muscles", label: "Muscles", p: [0.12, 0.66], dir: -1, r: 0.11 },
];

export type Proj = Record<string, [number, number, boolean]>;
export const STILL_STATES: Record<string, ZoneState> = { brain: "medium", heart: "medium", eyes: "none", lungs: "nominal", immune: "none", skin: "none", spine: "nominal", kidneys: "nominal", muscles: "nominal" };
export function statesFor(light: "ok" | "caution" | "warning"): Record<string, ZoneState> {
  const base: Record<string, ZoneState> = { ...STILL_STATES, brain: "nominal", heart: "nominal" };
  if (light === "caution") { base.brain = "medium"; base.heart = "medium"; }
  if (light === "warning") { base.lungs = "high"; }
  return base;
}
