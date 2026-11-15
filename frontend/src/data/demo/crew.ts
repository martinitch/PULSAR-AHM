/* DEMONSTRATION crew data (Artemis VI mission, day 127). No real measurement.
   To be replaced by the API (see src/features/auth/authService.ts for the « service » model). */
import type { EchoStudy, Light, Member, Report } from "@/data/types";
export const CREW: Member[] = [
  { id: "AM", name: "Alex Morgan", role: "Commandant", light: "ok", reason: "Constantes dans les plages", hr: 68, bp: "118/76", spo2: 98, temp: "36,7", sleep: "7h42", mood: 4, fatigue: "Faible", sync: "il y a 2 min", cabin: "Cabine 1" },
  { id: "LK", name: "Lina Kovacs", role: "Ingénieure de vol", light: "caution", reason: "FC de repos en hausse sur 3 jours · sommeil 5h10", hr: 94, bp: "128/82", spo2: 97, temp: "37,1", sleep: "5h10", mood: 2, fatigue: "Modérée", sync: "il y a 4 min", cabin: "Cabine 2" },
  { id: "NO", name: "Nolan Okafor", role: "Scientifique · médecin de bord", light: "ok", reason: "Constantes dans les plages", hr: 62, bp: "116/74", spo2: 99, temp: "36,6", sleep: "7h05", mood: 4, fatigue: "Faible", sync: "il y a 1 min", cabin: "Infirmerie" },
  { id: "SR", name: "Sofia Reyes", role: "Pilote", light: "ok", reason: "Constantes dans les plages", hr: 71, bp: "121/79", spo2: 98, temp: "36,8", sleep: "6h50", mood: 3, fatigue: "Faible", sync: "il y a 3 min", cabin: "Cabine 3" },
];
export const EVENTS = [
  { t: "09:38", who: "LK", light: "caution" as Light, text: "FC de repos 94 bpm (plage 60–100) — tendance à la hausse" },
  { t: "09:12", who: "LK", light: "caution" as Light, text: "Scan visage : fatigue modérée" },
  { t: "08:05", who: "AM", light: "ok" as Light, text: "Tension 118/76 mmHg (kit)" },
  { t: "07:50", who: "SR", light: "ok" as Light, text: "Glycémie 92 mg/dL (saisie manuelle)" },
];
export const ECHO_ZONES = [
  { id: "heart", label: "Cœur", why: "Adaptations cardiovasculaires (NASA HRP)", probe: "Sous le sein gauche, 4e–5e espace intercostal, marqueur vers l’épaule gauche." },
  { id: "eyes", label: "Œil (SANS)", why: "Syndrome neuro-oculaire lié au vol spatial (NASA HRP)", probe: "Paupière fermée, gel abondant, aucune pression sur le globe." },
  { id: "lungs", label: "Poumons", why: "Hypoxie, maladie de décompression (NASA HRP)", probe: "Ligne médio-claviculaire, 2e espace intercostal, sonde verticale." },
  { id: "kidneys", label: "Reins", why: "Formation de calculs rénaux (NASA HRP)", probe: "Flanc, ligne axillaire postérieure, sous les côtes." },
  { id: "muscles", label: "Muscles (cuisse)", why: "Condition musculosquelettique (NASA HRP)", probe: "Face antérieure de la cuisse, à mi-distance hanche–genou, sonde transversale." },
];
export const ECHO_STEPS = ["Sonde", "Zone", "Positionnement", "Image", "Annotation", "Envoi"];
const HEART_STILL: EchoStudy = {
  id: "R-127-03-still",
  astronautId: "LK",
  zone: "heart",
  view: "Coupe apicale 4 cavités",
  kind: "still",
  captured: "J127 · 09:05 UTC",
  operator: "Nolan Okafor · CMO-001",
  preset: "Cardiaque · 3,5 MHz",
  depthCm: 14,
  gain: "52 %",
  quality: "ok",
  qualityLabel: "Exploitable",
  annotated: true,
  mark: "VG 4,1 cm",
  finding: "Pas d’épanchement visible sur cette coupe. Le diamètre du ventricule gauche est dans les limites. L’attention du rapport porte sur la fréquence cardiaque, pas sur cette mesure.",
  measures: [{ label: "Ventricule gauche, télédiastole", value: "4,1", unit: "cm", range: "3,5–5,6 cm", light: "ok", verdict: "Dans les limites" }],
  legend: "Le trait jaune est un caliper : diamètre interne du ventricule gauche en télédiastole. Il ne désigne pas une lésion.",
};
const HEART_CLIP: EchoStudy = {
  id: "R-127-03-clip",
  astronautId: "LK",
  zone: "heart",
  view: "Coupe apicale 4 cavités",
  kind: "clip",
  captured: "J127 · 09:05 UTC",
  operator: "Nolan Okafor · CMO-001",
  preset: "Cardiaque · 3,5 MHz",
  depthCm: 14,
  gain: "52 %",
  quality: "ok",
  qualityLabel: "Exploitable",
  duration: "6 s",
  annotated: false,
  finding: "Même coupe, enregistrée pour le mouvement des parois. Aucun caliper sur ce clip.",
  measures: [],
};
const EYE_STILL: EchoStudy = {
  id: "R-126-01-eye",
  astronautId: "AM",
  zone: "eye",
  view: "Nerf optique, œil droit",
  kind: "still",
  captured: "J126 · 08:40 UTC",
  operator: "Nolan Okafor · CMO-001",
  preset: "Oculaire · 7,5 MHz",
  depthCm: 5,
  gain: "48 %",
  quality: "ok",
  qualityLabel: "Exploitable",
  annotated: true,
  mark: "GNO 5,4 mm",
  finding: "Contrôle SANS de routine, œil droit, paupière fermée. Gaine du nerf optique sous le seuil de lecture.",
  measures: [{ label: "Gaine du nerf optique", value: "5,4", unit: "mm", range: "inférieur à 6,0 mm", light: "ok", verdict: "Dans les limites" }],
  legend: "Le trait jaune mesure le diamètre de la gaine du nerf optique, 3 mm derrière le globe. Seuil de lecture : inférieur à 6,0 mm.",
};
export const REPORTS: Report[] = [
  { id: "R-127-03", kind: "scheduled", title: "Bilan programmé · J127 · 3/4", generated: "J127 · 09:12 UTC", received: "J127 · 09:26 UTC", age: "il y a 14 min", size: "1 image + 1 clip", lights: { AM: "ok", LK: "caution", NO: "ok", SR: "ok" }, images: 2, notes: "LK : FC de repos en hausse depuis J124, sommeil court. Échographie cardiaque faite à 09:05, pas d’anomalie visible à bord. Repos et hydratation proposés. Avis demandé.", unread: true, assignee: "NASA-FS-001", workflowStatus: "nouveau", studies: [HEART_STILL, HEART_CLIP] },
  { id: "R-126-A1", kind: "red", title: "Alerte rouge · J126 · SpO₂ basse (SR)", generated: "J126 · 22:47 UTC", received: "J126 · 22:49 UTC", age: "il y a 10 h 51", size: "0 image", lights: { AM: "ok", LK: "caution", NO: "ok", SR: "warning" }, images: 0, notes: "SR : SpO₂ 91 % pendant 4 min (capteur mal placé ?). Remesure à 22:52 : 98 %. Retour au nominal, événement clos à bord.", unread: false, assignee: "CMO-001", workflowStatus: "resolu", studies: [] },
  { id: "R-126-02", kind: "scheduled", title: "Bilan programmé · J126 · 2/4", generated: "J126 · 15:10 UTC", received: "J126 · 15:31 UTC", age: "il y a 18 h", size: "0 image", lights: { AM: "ok", LK: "ok", NO: "ok", SR: "ok" }, images: 0, notes: "Rien à signaler. Toutes les mesures du jour faites.", unread: false, assignee: "NASA-FS-002", workflowStatus: "vu", studies: [] },
  { id: "R-126-01", kind: "scheduled", title: "Bilan programmé · J126 · 1/4", generated: "J126 · 09:05 UTC", received: "J126 · 10:02 UTC", age: "il y a 23 h", size: "1 image", lights: { AM: "ok", LK: "ok", NO: "ok", SR: "ok" }, images: 1, notes: "Échographie oculaire de routine (AM), jointe.", unread: false, assignee: "NASA-FS-001", workflowStatus: "resolu", studies: [EYE_STILL] },
];
export const TRENDS: { id: string; label: string; unit: string; series: Record<string, number[]> }[] = [
  { id: "hr", label: "FC de repos", unit: "bpm", series: { AM: [66, 67, 69, 68], LK: [74, 81, 88, 94], NO: [61, 62, 62, 62], SR: [70, 72, 71, 71] } },
  { id: "sleep", label: "Sommeil", unit: "h", series: { AM: [7.4, 7.1, 7.6, 7.7], LK: [6.9, 6.1, 5.6, 5.2], NO: [7.0, 7.2, 6.9, 7.1], SR: [6.8, 7.0, 6.7, 6.8] } },
  { id: "mood", label: "Humeur", unit: "/5", series: { AM: [4, 4, 4, 4], LK: [4, 3, 3, 2], NO: [4, 4, 5, 4], SR: [3, 4, 3, 3] } },
];
export const WINDOWS = { now: "09:40 UTC", linkUntil: "10:05 UTC", nextUp: "13:50 UTC", nextDown: "13:50 UTC" };

