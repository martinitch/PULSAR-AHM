/* Cooperative gamification — CDC § 5.9 (EF-42, EF-43, EF-44). DEMO DATA.
   Rule: everything is computed from REGULARITY (measurements done, routines followed), NEVER from a health-indicator value. */
import type { IconName } from "@/components/ui";

export type Mission = { id: string; label: string; kind: "mesure" | "routine"; icon: IconName; when: string };
/** Today's missions (identical for each astronaut). Measurements count toward the crew goal. */
export const MISSIONS: Mission[] = [
  { id: "m-watch", label: "Montre portée la nuit", kind: "mesure", icon: "watch", when: "nuit" },
  { id: "m-bp", label: "Tension artérielle (kit)", kind: "mesure", icon: "blood_pressure", when: "07:30" },
  { id: "m-glu", label: "Glycémie à jeun (kit)", kind: "mesure", icon: "bloodtype", when: "07:45" },
  { id: "m-scan", label: "Scan visage du matin", kind: "mesure", icon: "face", when: "08:00" },
  { id: "m-q", label: "Questionnaire bien-être", kind: "mesure", icon: "self_improvement", when: "20:00" },
  { id: "r-ex", label: "Séance d’exercice planifiée", kind: "routine", icon: "fitness_center", when: "14:00" },
  { id: "r-breath", label: "Respiration guidée · 2 min", kind: "routine", icon: "spa", when: "21:30" },
];
export const MEASURES = MISSIONS.filter((m) => m.kind === "mesure");
/** Already done on load (demo): the watch and the 07:55 blood pressure. */
export const PRESET_DONE = ["m-watch", "m-bp"];

/** Regularity history per member (demo) — counts of days / measurements, never health values. */
export const HISTORY: Record<string, { streak: number; measures: number; exerciseWeeks: number; nights: number; onTime: number; echo: boolean; missedDaysAgo: number[] }> = {
  LK: { streak: 12, measures: 412, exerciseWeeks: 3, nights: 14, onTime: 17, echo: true, missedDaysAgo: [13] },
  AM: { streak: 31, measures: 498, exerciseWeeks: 6, nights: 30, onTime: 26, echo: true, missedDaysAgo: [] },
  NO: { streak: 27, measures: 455, exerciseWeeks: 5, nights: 22, onTime: 23, echo: true, missedDaysAgo: [] },
  SR: { streak: 9, measures: 371, exerciseWeeks: 4, nights: 11, onTime: 20, echo: false, missedDaysAgo: [10] },
};
/** Today's measurements already done by each member (demo, for the crew goal when local state is missing). */
export const TODAY_DEMO: Record<string, number> = { LK: 2, AM: 5, NO: 4, SR: 3 };

export type BadgeFamily = "serie" | "jalon" | "routine";
export const BADGE_FAMILIES: { id: BadgeFamily; label: string }[] = [
  { id: "serie", label: "Séries" },
  { id: "jalon", label: "Jalons" },
  { id: "routine", label: "Routines" },
];

export type Badge = { id: string; family: BadgeFamily; label: string; detail: string; icon: IconName; value: number; goal: number };

/** Space badges — same families as health apps (streak, milestone, routine), never a clinical value. */
export function badgesFor(id: string, streak: number): Badge[] {
  const h = HISTORY[id] ?? HISTORY.AM;
  return [
    { id: "b-7", family: "serie", label: "Sept orbites", detail: "Toutes les mesures du jour, 7 sols d’affilée", icon: "orbit", value: Math.min(streak, 7), goal: 7 },
    { id: "b-30", family: "serie", label: "Mois lunaire", detail: "Toutes les mesures du jour, 30 sols d’affilée", icon: "bedtime", value: Math.min(streak, 30), goal: 30 },
    { id: "b-100d", family: "serie", label: "Cent sols", detail: "Toutes les mesures du jour, 100 sols d’affilée", icon: "rocket_launch", value: Math.min(streak, 100), goal: 100 },
    { id: "b-100", family: "jalon", label: "Cent balises", detail: "100 mesures faites depuis le début de la mission", icon: "satellite_alt", value: Math.min(h.measures, 100), goal: 100 },
    { id: "b-500", family: "jalon", label: "Relais profond", detail: "500 mesures faites depuis le début de la mission", icon: "satellite_alt", value: Math.min(h.measures, 500), goal: 500 },
    { id: "b-1000", family: "jalon", label: "Phare de mission", detail: "1\u202f000 mesures faites depuis le début de la mission", icon: "award", value: Math.min(h.measures, 1000), goal: 1000 },
    { id: "b-ex", family: "routine", label: "Garde sportive", detail: "Séances planifiées suivies 4 semaines de suite", icon: "fitness_center", value: Math.min(h.exerciseWeeks, 4), goal: 4 },
    { id: "b-breath", family: "routine", label: "Protocole calme", detail: "Respiration guidée faite 10 fois (régularité, pas un score de stress)", icon: "spa", value: Math.min(h.onTime, 10), goal: 10 },
    { id: "b-night", family: "routine", label: "Veille de nuit", detail: "Montre portée 14 nuits (durée de port, pas la qualité du sommeil)", icon: "watch", value: Math.min(h.nights, 14), goal: 14 },
    { id: "b-time", family: "routine", label: "Fenêtre de liaison", detail: "Rappels de mesure traités dans le créneau, 20 fois", icon: "schedule", value: Math.min(h.onTime, 20), goal: 20 },
    { id: "b-echo", family: "routine", label: "Écho transmis", detail: "Première échographie suivie jusqu’à l’envoi", icon: "monitor_heart", value: h.echo ? 1 : 0, goal: 1 },
  ];
}

/** Personal level: fixed thresholds of badges earned. It is not a rank within the crew. */
export const LEVELS = [
  { id: "etain", label: "Étain", min: 0 },
  { id: "cuivre", label: "Cuivre", min: 2 },
  { id: "bronze", label: "Bronze", min: 4 },
  { id: "argent", label: "Argent", min: 6 },
  { id: "or", label: "Or", min: 8 },
  { id: "titane", label: "Titane", min: 10 },
] as const;

export type Grade = { id: string; label: string; min: number };

export function gradeFor(earned: number, total: number) {
  const levels: Grade[] = LEVELS.map((level, i) => (i === LEVELS.length - 1 ? { ...level, min: total } : level));
  let current = levels[0];
  for (const level of levels) if (earned >= level.min) current = level;
  const next = levels.find((level) => level.min > earned) ?? null;
  return { current, next, earned, total, levels };
}

export function gradeHint(grade: ReturnType<typeof gradeFor>) {
  if (!grade.next) return "Tous les insignes de la mission sont obtenus.";
  const left = grade.next.min - grade.earned;
  return `Encore ${left} insigne${left > 1 ? "s" : ""} pour le niveau ${grade.next.label}.`;
}

/** Shared tier for the day — one crew, no ranking between teams. */
export const CREW_PALIERS = [
  { id: "mise-a-feu", label: "Mise à feu", min: 0, detail: "Les mesures du jour commencent." },
  { id: "montee", label: "Montée", min: 25, detail: "Un quart des mesures du jour est fait." },
  { id: "orbite", label: "Orbite", min: 50, detail: "La moitié des mesures du jour est faite." },
  { id: "croisiere", label: "Croisière", min: 75, detail: "L’équipage tient le rythme." },
  { id: "tenue", label: "Mission tenue", min: 100, detail: "Toutes les mesures du jour sont faites." },
] as const;

export function palierFor(pct: number) {
  let current: (typeof CREW_PALIERS)[number] = CREW_PALIERS[0];
  for (const palier of CREW_PALIERS) if (pct >= palier.min) current = palier;
  return current;
}

export function profileFor(id: string, measuresDoneCount: number) {
  const h = HISTORY[id] ?? HISTORY.AM;
  const streak = h.streak + (measuresDoneCount >= MEASURES.length ? 1 : 0);
  const badges = badgesFor(id, streak);
  const earned = badges.filter((b) => b.value >= b.goal).length;
  return { streak, badges, grade: gradeFor(earned, badges.length) };
}

/**
 * Constancy index (0–100) — regularity only (EF-42):
 * streak, today's missions, badges earned. Never a health value.
 */
export function constancyScore(input: {
  streak: number;
  missionsDone: number;
  missionsTotal: number;
  badgesEarned: number;
  badgesTotal: number;
}) {
  const streakPart = Math.min(40, Math.round((Math.min(input.streak, 30) / 30) * 40));
  const missionPart = input.missionsTotal === 0 ? 0 : Math.round((input.missionsDone / input.missionsTotal) * 35);
  const badgePart = input.badgesTotal === 0 ? 0 : Math.round((input.badgesEarned / input.badgesTotal) * 25);
  return Math.min(100, streakPart + missionPart + badgePart);
}
