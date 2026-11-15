/* PULSAR domain types (shared by demo data and, later, the API). */

/** NASA C&W status lamp: ok = nominal, caution = « Attention » (orange/yellow), warning = « Alerte » (red). */
export type Light = "ok" | "caution" | "warning";

/** Crew member (demo values are marked DÉMO on screen). */
export type Member = {
  id: string; name: string; role: string; light: Light; reason: string;
  hr: number; bp: string; spo2: number; temp: string; sleep: string; mood: number; fatigue: string; sync: string; cabin: string;
};

/** Measurement read on an ultrasound, with the range that keeps the reading from being misread. */
export type EchoMeasure = {
  label: string;
  value: string;
  unit: string;
  /** Reading range, e.g. « 3,5–5,6 cm ». */
  range: string;
  light: Light;
  /** « Dans les limites » or « Hors limites ». */
  verdict: string;
};

/** Ultrasound attachment on a ground report. A still and a clip are not read the same way. */
export type EchoStudy = {
  id: string;
  astronautId: string;
  zone: "heart" | "eye";
  /** View name, without abbreviation. */
  view: string;
  kind: "still" | "clip";
  captured: string;
  operator: string;
  preset: string;
  depthCm: number;
  gain: string;
  quality: Light;
  qualityLabel: string;
  /** Clip duration, e.g. « 6 s ». */
  duration?: string;
  annotated: boolean;
  /** Short text burned onto the caliper, e.g. « VG 4,1 cm ». */
  mark?: string;
  finding: string;
  measures: EchoMeasure[];
  /** What the yellow line marks. Absent if there is no caliper. */
  legend?: string;
};

/** Medical report sent to the ground over the satellite link. */
export type Report = {
  id: string; kind: "scheduled" | "red"; title: string; generated: string; received: string; age: string; size: string;
  lights: Record<string, Light>; images: number; notes: string; unread: boolean;
  /** Ground / onboard owner. */
  assignee?: string;
  /** New | Seen | In progress | Resolved | Escalated */
  workflowStatus?: "nouveau" | "vu" | "pris_en_charge" | "resolu" | "escalade";
  /** Images and clips actually attached. Empty if the report has no ultrasound. */
  studies?: EchoStudy[];
};

/** Application roles = one dashboard each. */
export type Role = "astronaute" | "medecin-bord" | "nasa";
