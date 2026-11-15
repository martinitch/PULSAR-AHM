/* Demo texts and shared labels, switched with the app language. */
import { useMemo } from "react";
import { CREW, ECHO_STEPS, ECHO_ZONES, EVENTS, REPORTS, TRENDS } from "@/data/demo/crew";
import { REGIONS } from "@/data/demo/regions";
import type { EchoStudy, Member, Report } from "@/data/types";
import { useLang } from "./LangProvider";
import type { Lang } from "./messages";

type Region = (typeof REGIONS)[number];
type EchoZone = (typeof ECHO_ZONES)[number];
type Trend = (typeof TRENDS)[number];

const ROLE: Record<string, string> = {
  Commandant: "Commander",
  "Ingénieure de vol": "Flight engineer",
  "Scientifique · médecin de bord": "Scientist · crew surgeon",
  Pilote: "Pilot",
};
const REASON: Record<string, string> = {
  "Constantes dans les plages": "Vitals within range",
  "FC de repos en hausse sur 3 jours · sommeil 5h10": "Resting HR rising over 3 days · sleep 5h 10",
};
const FATIGUE: Record<string, string> = { Faible: "Low", Modérée: "Moderate" };
const CABIN: Record<string, string> = { "Cabine 1": "Cabin 1", "Cabine 2": "Cabin 2", "Cabine 3": "Cabin 3", Infirmerie: "Sickbay" };

export function localizeMember(m: Member, lang: Lang): Member {
  if (lang === "fr") return m;
  return {
    ...m,
    role: ROLE[m.role] ?? m.role,
    reason: REASON[m.reason] ?? m.reason,
    fatigue: FATIGUE[m.fatigue] ?? m.fatigue,
    cabin: CABIN[m.cabin] ?? m.cabin,
    temp: m.temp.replace(",", "."),
    sync: m.sync.replace(/^il y a (\d+) min$/, "$1 min ago"),
  };
}

const EVENT_EN: Record<string, string> = {
  "09:38|LK": "Resting HR 94 bpm (range 60–100) — upward trend",
  "09:12|LK": "Face scan: moderate fatigue",
  "08:05|AM": "Blood pressure 118/76 mmHg (kit)",
  "07:50|SR": "Glucose 92 mg/dL (manual entry)",
};

export function localizeEvents(lang: Lang) {
  if (lang === "fr") return EVENTS;
  return EVENTS.map((e) => ({ ...e, text: EVENT_EN[`${e.t}|${e.who}`] ?? e.text }));
}

const ZONE_EN: Record<string, Pick<EchoZone, "label" | "why" | "probe">> = {
  heart: { label: "Heart", why: "Cardiovascular adaptations (NASA HRP)", probe: "Below the left breast, 4th–5th intercostal space, marker toward the left shoulder." },
  eyes: { label: "Eye (SANS)", why: "Spaceflight associated neuro-ocular syndrome (NASA HRP)", probe: "Closed eyelid, plenty of gel, no pressure on the globe." },
  lungs: { label: "Lungs", why: "Hypoxia, decompression sickness (NASA HRP)", probe: "Mid-clavicular line, 2nd intercostal space, probe vertical." },
  kidneys: { label: "Kidneys", why: "Renal stone formation (NASA HRP)", probe: "Flank, posterior axillary line, under the ribs." },
  muscles: { label: "Muscles (thigh)", why: "Musculoskeletal condition (NASA HRP)", probe: "Front of the thigh, midway hip–knee, probe transverse." },
};
const STEP_EN = ["Probe", "Zone", "Positioning", "Image", "Annotation", "Send"];

export function localizeEchoZones(lang: Lang): EchoZone[] {
  if (lang === "fr") return ECHO_ZONES;
  return ECHO_ZONES.map((z) => ({ ...z, ...ZONE_EN[z.id] }));
}
export function localizeEchoSteps(lang: Lang): string[] {
  return lang === "en" ? STEP_EN : [...ECHO_STEPS];
}

const TREND_EN: Record<string, string> = { hr: "Resting HR", sleep: "Sleep", mood: "Mood" };
export function localizeTrends(lang: Lang): Trend[] {
  if (lang === "fr") return TRENDS;
  return TRENDS.map((t) => ({ ...t, label: TREND_EN[t.id] ?? t.label }));
}

const STUDY_EN: Record<string, Partial<EchoStudy> & { measures?: EchoStudy["measures"] }> = {
  "R-127-03-still": {
    view: "Apical 4-chamber view",
    preset: "Cardiac · 3.5 MHz",
    qualityLabel: "Usable",
    mark: "LV 4.1 cm",
    finding: "No visible effusion on this view. Left-ventricle diameter is within limits. The report’s concern is heart rate, not this measurement.",
    legend: "The yellow line is a caliper: internal left-ventricle diameter in diastole. It does not mark a lesion.",
    measures: [{ label: "Left ventricle, end-diastole", value: "4.1", unit: "cm", range: "3.5–5.6 cm", light: "ok", verdict: "Within limits" }],
  },
  "R-127-03-clip": {
    view: "Apical 4-chamber view",
    preset: "Cardiac · 3.5 MHz",
    qualityLabel: "Usable",
    finding: "Same view, recorded for wall motion. No caliper on this clip.",
  },
  "R-126-01-eye": {
    view: "Optic nerve, right eye",
    preset: "Ocular · 7.5 MHz",
    qualityLabel: "Usable",
    mark: "ONSD 5.4 mm",
    finding: "Routine SANS check, right eye, eyelid closed. Optic-nerve sheath below the reading threshold.",
    legend: "The yellow line measures optic-nerve sheath diameter, 3 mm behind the globe. Reading threshold: below 6.0 mm.",
    measures: [{ label: "Optic nerve sheath", value: "5.4", unit: "mm", range: "below 6.0 mm", light: "ok", verdict: "Within limits" }],
  },
};

function localizeStudy(s: EchoStudy, lang: Lang): EchoStudy {
  if (lang === "fr") return s;
  const en = STUDY_EN[s.id];
  if (!en) return s;
  return { ...s, ...en, measures: en.measures ?? s.measures };
}

const REPORT_EN: Record<string, Partial<Pick<Report, "title" | "age" | "size" | "notes">>> = {
  "R-127-03": {
    title: "Scheduled report · D127 · 3/4",
    age: "14 min ago",
    size: "1 image + 1 clip",
    notes: "LK: resting HR rising since D124, short sleep. Cardiac ultrasound at 09:05, no visible anomaly on board. Rest and hydration proposed. Opinion requested.",
  },
  "R-126-A1": {
    title: "Red alert · D126 · low SpO₂ (SR)",
    age: "10 h 51 ago",
    size: "0 images",
    notes: "SR: SpO₂ 91% for 4 min (sensor misplaced?). Remeasure at 22:52: 98%. Back to nominal, event closed on board.",
  },
  "R-126-02": {
    title: "Scheduled report · D126 · 2/4",
    age: "18 h ago",
    size: "0 images",
    notes: "Nothing to report. All of today’s measurements were done.",
  },
  "R-126-01": {
    title: "Scheduled report · D126 · 1/4",
    age: "23 h ago",
    size: "1 image",
    notes: "Routine ocular ultrasound (AM), attached.",
  },
};

export function localizeReports(lang: Lang): Report[] {
  if (lang === "fr") return REPORTS;
  return REPORTS.map((r) => ({
    ...r,
    ...REPORT_EN[r.id],
    studies: r.studies?.map((s) => localizeStudy(s, lang)),
  }));
}

const REGION_EN: Record<string, Pick<Region, "label" | "fn" | "need" | "fixes" | "risks"> & { note?: string }> = {
  brain: {
    label: "Brain and mood", fn: "Thought, mood, sleep, focus.", need: "Sleep to recover",
    fixes: [
      { pos: "Lying down, amber light", action: "Screen off 30 min" },
      { pos: "Back on the mat, arms at your sides", action: "4-4 breathing · 5 min" },
      { pos: "Seated at the log", action: "Note mood, report if it lasts" },
    ],
    risks: ["Cognitive or behavioral change and psychiatric disorders", "Sleep loss, circadian desync and workload", "Weak crew cooperation and communication"],
  },
  eyes: {
    label: "Eyes (SANS)", fn: "Vision: read instruments, work with precision.", need: "Vision to report",
    fixes: [
      { pos: "Facing text, arm’s length", action: "Read 3 lines, note blur" },
      { pos: "Head straight, look far", action: "20 s away from screens" },
      { pos: "Seated, exam planned", action: "Tell the crew surgeon" },
    ],
    risks: ["Spaceflight associated neuro-ocular syndrome (SANS)"],
    note: "No dedicated sensor in PULSAR: report any drop in vision; eye exams (images, ultrasound) go to the medical team.",
  },
  ear: {
    label: "Inner ear", fn: "Balance and orientation.", need: "Balance to steady",
    fixes: [
      { pos: "Seated, back to the panel", action: "Fix a point for 20 s" },
      { pos: "Head still", action: "Note dizziness or nausea" },
      { pos: "Stable hold", action: "Tell the surgeon if it returns" },
    ],
    risks: ["Impaired sensorimotor and vestibular function"],
    note: "Report dizziness or motion sickness in the evening log.",
  },
  heart: {
    label: "Heart and vessels", fn: "Pumps blood and oxygen to the organs.", need: "Pulse to slow",
    fixes: [
      { pos: "Seated, back to the panel", action: "2 min without talking" },
      { pos: "Hands on thighs", action: "Inhale 4 s, exhale 4 s" },
      { pos: "Arm at heart height", action: "Remeasure pulse" },
    ],
    risks: ["Cardiovascular adaptations"],
  },
  lungs: {
    label: "Lungs and oxygen", fn: "Brings oxygen into the blood.", need: "Oxygen to check",
    fixes: [
      { pos: "Upright torso, shoulders low", action: "Slow inhale through the nose" },
      { pos: "Mask within reach", action: "Check cabin oxygen" },
      { pos: "Seated, stable", action: "Remeasure SpO₂, surgeon if alert" },
    ],
    risks: ["Hypoxia", "Decompression sickness", "Celestial dust exposure"],
  },
  immune: {
    label: "Immune system", fn: "Defends the body against infection.", need: "Temperature to watch",
    fixes: [
      { pos: "At rest, 10 min", action: "Temperature measurement" },
      { pos: "Bottle within reach", action: "Drink, note thirst" },
      { pos: "Apart if needed", action: "Tell the crew surgeon" },
    ],
    risks: ["Altered immune response", "Host–microorganism interactions"],
  },
  metabolism: {
    label: "Metabolism and nutrition", fn: "Turns food into energy.", need: "Meal to finish",
    fixes: [
      { pos: "Seated, meal tray", action: "Finish the planned ration" },
      { pos: "Fasting, kit in hand", action: "Glucose if the plan asks" },
      { pos: "Nutrition log", action: "Note a skipped meal" },
    ],
    risks: ["Inadequate food and nutrition", "Drugs less effective or toxic on a long mission"],
  },
  skin: {
    label: "Skin", fn: "Barrier against microbes and dust.", need: "Skin to inspect",
    fixes: [
      { pos: "Visible area, cabin light", action: "Photograph the lesion" },
      { pos: "Do not rub", action: "Leave open to air, note discomfort" },
      { pos: "Image log", action: "Send to the crew surgeon" },
    ],
    risks: ["Host–microorganism interactions", "Celestial dust exposure"],
    note: "No dedicated sensor: photograph a lesion or irritation from the Images screen.",
  },
  spine: {
    label: "Skeleton and spine", fn: "Support and protection of the organs.", need: "Back to protect",
    fixes: [
      { pos: "Standing, feet on the rail", action: "Spine stretch · 30 s" },
      { pos: "ARED, knees slightly bent", action: "Today’s planned load" },
      { pos: "Back to the panel, seated", action: "Report sharp pain" },
    ],
    risks: ["Fracture from spaceflight bone changes", "Injury from dynamic loads"],
    note: "No direct measure: follow-up is daily exercise (countermeasure) and exams planned by the medical team.",
  },
  muscles: {
    label: "Muscles", fn: "Strength and movement, spacewalks.", need: "Strength to maintain",
    fixes: [
      { pos: "ARED, straps set", action: "Resistance session · 30 min" },
      { pos: "Feet braced, back straight", action: "Slow squat, full range" },
      { pos: "Stretch after effort", action: "Note unusual pain" },
    ],
    risks: ["Loss of cardiorespiratory and musculoskeletal condition", "Injury during extravehicular activity (EVA)"],
    note: "Tracked through exercise sessions in the care plan.",
  },
  kidneys: {
    label: "Kidneys", fn: "Filter blood, balance water and minerals.", need: "Hydration to resume",
    fixes: [
      { pos: "Bottle in hand", action: "Drink as directed today" },
      { pos: "Standing, a few steps", action: "Do not stay still" },
      { pos: "Flank pain", action: "Tell the crew surgeon" },
    ],
    risks: ["Renal stone formation"],
    note: "No dedicated sensor: regular hydration is one of the preventive actions.",
  },
};

export function localizeRegions(lang: Lang): Region[] {
  if (lang === "fr") return REGIONS;
  return REGIONS.map((r) => {
    const en = REGION_EN[r.id];
    return en ? { ...r, ...en } : r;
  });
}

export const ZONE_NAME_EN: Record<string, string> = {
  brain: "Brain", eyes: "Eyes", heart: "Heart", lungs: "Lungs", immune: "Immunity",
  skin: "Skin", spine: "Bone", kidneys: "Kidneys", muscles: "Muscles",
};
export const VIEW_NAME_EN = { front: "Front", "34": "¾", side: "Side", back: "Back" } as const;

export const MISSION_EN: Record<string, { label: string; when?: string }> = {
  "m-watch": { label: "Watch worn overnight", when: "night" },
  "m-bp": { label: "Blood pressure (kit)" },
  "m-glu": { label: "Fasting glucose (kit)" },
  "m-scan": { label: "Morning face scan" },
  "m-q": { label: "Wellbeing questionnaire" },
  "r-ex": { label: "Planned exercise session" },
  "r-breath": { label: "Guided breathing · 2 min" },
};

export const BADGE_EN: Record<string, { label: string; detail: string }> = {
  "b-7": { label: "Seven orbits", detail: "All of the day’s measures, 7 sols in a row" },
  "b-30": { label: "Lunar month", detail: "All of the day’s measures, 30 sols in a row" },
  "b-100d": { label: "One hundred sols", detail: "All of the day’s measures, 100 sols in a row" },
  "b-100": { label: "One hundred beacons", detail: "100 measures since the start of the mission" },
  "b-500": { label: "Deep relay", detail: "500 measures since the start of the mission" },
  "b-1000": { label: "Mission beacon", detail: "1,000 measures since the start of the mission" },
  "b-ex": { label: "Sports watch", detail: "Planned sessions kept for 4 weeks in a row" },
  "b-breath": { label: "Calm protocol", detail: "Guided breathing done 10 times (regularity, not a stress score)" },
  "b-night": { label: "Night watch", detail: "Watch worn 14 nights (wear time, not sleep quality)" },
  "b-time": { label: "Link window", detail: "Measure reminders handled in the slot, 20 times" },
  "b-echo": { label: "Echo sent", detail: "First ultrasound followed through to send" },
};

export const LEVEL_EN: Record<string, string> = {
  etain: "Tin", cuivre: "Copper", bronze: "Bronze", argent: "Silver", or: "Gold", titane: "Titanium",
};
export const FAMILY_EN: Record<string, string> = { serie: "Streaks", jalon: "Milestones", routine: "Routines" };
export const PALIER_EN: Record<string, { label: string; detail: string }> = {
  "mise-a-feu": { label: "Liftoff", detail: "Today’s measures are starting." },
  montee: { label: "Ascent", detail: "A quarter of today’s measures are done." },
  orbite: { label: "Orbit", detail: "Half of today’s measures are done." },
  croisiere: { label: "Cruise", detail: "The crew is holding the pace." },
  tenue: { label: "Mission held", detail: "All of today’s measures are done." },
};

export function localizeMission<T extends { id: string; label: string; when: string }>(m: T, lang: Lang): T {
  if (lang === "fr") return m;
  const en = MISSION_EN[m.id];
  if (!en) return m;
  return { ...m, label: en.label, when: en.when ?? m.when };
}
export function localizeBadge<T extends { id: string; label: string; detail: string }>(b: T, lang: Lang): T {
  if (lang === "fr") return b;
  const en = BADGE_EN[b.id];
  return en ? { ...b, ...en } : b;
}
type GradeLevel = { id: string; label: string; min: number };
type GradeBag = { current: GradeLevel; next: GradeLevel | null; earned: number; total: number; levels: GradeLevel[] };
export function localizeGrade<T extends GradeBag>(g: T, lang: Lang): T {
  if (lang === "fr") return g;
  const map = (level: GradeLevel): GradeLevel => ({ ...level, label: LEVEL_EN[level.id] ?? level.label });
  return {
    ...g,
    current: map(g.current),
    next: g.next ? map(g.next) : null,
    levels: g.levels.map(map),
  };
}
export function gradeHintFor(g: GradeBag, lang: Lang): string {
  if (!g.next) return lang === "en" ? "Every mission badge is earned." : "Tous les insignes de la mission sont obtenus.";
  const left = g.next.min - g.earned;
  const name = lang === "en" ? (LEVEL_EN[g.next.id] ?? g.next.label) : g.next.label;
  return lang === "en"
    ? `${left} more badge${left > 1 ? "s" : ""} to reach ${name}.`
    : `Encore ${left} insigne${left > 1 ? "s" : ""} pour le niveau ${name}.`;
}
export function localizePalier<T extends { id: string; label: string; detail: string }>(p: T, lang: Lang): T {
  if (lang === "fr") return p;
  const en = PALIER_EN[p.id];
  return en ? { ...p, ...en } : p;
}

const PHRASE_EN: Record<string, string> = {
  "La recherche Bluetooth n’a pas répondu.": "The Bluetooth scan did not respond.",
  "Cette page ne joint pas la radio Bluetooth. Ouvrez l’application avec npm run dev pour voir les appareils réellement à portée.": "This page cannot reach the Bluetooth radio. Open the app with npm run dev to see devices actually in range.",
  "Le Bluetooth est éteint. Allumez-le, puis relancez la recherche.": "Bluetooth is off. Turn it on, then search again.",
  "Impossible de joindre cet appareil. Laissez-le allumé, à portée, puis réessayez.": "Cannot reach this device. Leave it on and in range, then try again.",
  "La liaison Bluetooth a échoué. Rapprochez l’appareil et réessayez.": "The Bluetooth link failed. Move the device closer and try again.",
  "La recherche Bluetooth n’est pas disponible sur cet ordinateur.": "Bluetooth search is not available on this computer.",
  "La recherche Bluetooth n’a pas démarré.": "The Bluetooth search did not start.",
  "Le Bluetooth du navigateur n’a pas pu lister les appareils. Vérifiez qu’il est allumé, puis réessayez.": "The browser could not list Bluetooth devices. Check that it is on, then try again.",
  "Appareil choisi, mais aucune mesure standard n’a pu être lue (pouls, SpO₂, tension, glycémie ou température).": "Device selected, but no standard measurement could be read (pulse, SpO₂, blood pressure, glucose or temperature).",
  "Appareil détecté. La lecture des mesures a été annulée.": "Device found. Reading measurements was cancelled.",
  "Appareil Bluetooth": "Bluetooth device",
  "Ce navigateur ne donne pas accès au Bluetooth, et la radio de cet ordinateur n’est pas joignable. Ouvrez http://localhost:5173 avec le serveur de développement.": "This browser does not expose Bluetooth, and this computer’s radio is unreachable. Open http://localhost:5173 with the dev server.",
  "Connexion interrompue. L’appareil doit être allumé et à portée.": "Connection interrupted. The device must be on and in range.",
  "Ce navigateur ne donne pas accès à la caméra.": "This browser does not expose the camera.",
  "Autorisation refusée. Autorisez la caméra pour ce site, puis réessayez.": "Permission denied. Allow the camera for this site, then try again.",
  "Caméra indisponible. Vérifiez qu’elle n’est pas utilisée par une autre application.": "Camera unavailable. Check that another application is not using it.",
  "FC de repos en hausse sur 3 jours (94 bpm, plage 60–100).": "Resting HR rising over 3 days (94 bpm, range 60–100).",
  "Dérive multivariée (sommeil court + FC) détectée par l’autoencodeur.": "Multivariate drift (short sleep + HR) detected by the autoencoder.",
  "SpO₂ 91 % pendant 4 min (seuil 92 %).": "SpO₂ 91% for 4 min (threshold 92%).",
  "Passage anomalie de l’Atlantique Sud : débit de dose transitoire, cumul dans la plage.": "South Atlantic Anomaly pass: transient dose rate, cumulative dose within range.",
};

/** Translates a known string (errors, alert messages). Leaves the text unchanged otherwise. */
export function phrase(lang: Lang, text: string): string {
  if (lang !== "en") return text;
  return PHRASE_EN[text] ?? text;
}

export function useCrew() {
  const { lang } = useLang();
  return useMemo(() => CREW.map((m) => localizeMember(m, lang)), [lang]);
}
export function useReports() {
  const { lang } = useLang();
  return useMemo(() => localizeReports(lang), [lang]);
}
export function useEchoZones() {
  const { lang } = useLang();
  return useMemo(() => localizeEchoZones(lang), [lang]);
}
export function useEchoSteps() {
  const { lang } = useLang();
  return useMemo(() => localizeEchoSteps(lang), [lang]);
}
export function useTrends() {
  const { lang } = useLang();
  return useMemo(() => localizeTrends(lang), [lang]);
}
export function useRegions() {
  const { lang } = useLang();
  return useMemo(() => localizeRegions(lang), [lang]);
}
