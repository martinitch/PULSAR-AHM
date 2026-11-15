/* Sound settings — PURE logic (tested in tests/sound.spec.ts), no alias import.
   PULSAR policy: sound ONLY for a RED / extreme alert. Orange, notifications, sensors, UI = silent
   (visual banner unchanged). No interface sound.
   Rules (IEC 60601-1-8, adapted):
   - the RED alarm (high priority) cannot be cut by mute or disabled: only ACKNOWLEDGED,
     or PAUSED for 2 min (like a real alarm panel); its volume does not go below 40%.
   - the visual (banner) is ALWAYS shown, even with sound off. */

export type SoundCategory =
  | "alarmHigh" | "alarmMedium" | "alarmLow" | "ack" | "report" | "escalation" | "sensor" | "login" | "badge" | "watchTick" | "landing";

export type SoundSettings = { muted: boolean; volume: number; categories: Record<SoundCategory, boolean> };

export const CATEGORY_LABEL: Record<SoundCategory, string> = {
  alarmHigh: "Alerte rouge / extrême (seul son actif)",
  alarmMedium: "Alerte orange (silencieuse)",
  alarmLow: "Notification · information (silencieuse)",
  ack: "Acquittement (silencieux)",
  report: "Rapport reçu / envoyé (silencieux)",
  escalation: "Escalade (silencieuse)",
  sensor: "Scan fatigue · bips (silencieux)",
  badge: "Exercice terminé (silencieux)",
  login: "Connexion (désactivé)",
  watchTick: "Navigation montre (désactivé)",
  landing: "Survol interface (désactivé)",
};
/** Categories that cannot be disabled. */
export const LOCKED: SoundCategory[] = ["alarmHigh"];
/** Never any sound except the red alert (forced on every settings read). */
export const SILENT: SoundCategory[] = [
  "alarmMedium", "alarmLow", "ack", "report", "escalation", "sensor", "badge", "login", "watchTick", "landing",
];
/** @deprecated alias — kept for possible imports. */
export const UI_ONLY: SoundCategory[] = ["login", "watchTick", "landing"];
export const SNOOZE_MS = 120_000;
export const MIN_HIGH_VOLUME = 0.4;
export const STORAGE_KEY = "pulsar.sound";

export const DEFAULT_SETTINGS: SoundSettings = {
  muted: false, volume: 0.7,
  categories: {
    alarmHigh: true,
    alarmMedium: false, alarmLow: false, ack: false, report: false, escalation: false,
    sensor: false, badge: false, login: false, watchTick: false, landing: false,
  },
};

/** Validates/completes an object read from storage (missing values → defaults, volume clamped, red forced). */
export function normalize(raw: unknown): SoundSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<SoundSettings>;
  const vol = typeof r.volume === "number" && Number.isFinite(r.volume) ? Math.min(1, Math.max(0, r.volume)) : DEFAULT_SETTINGS.volume;
  const cats = { ...DEFAULT_SETTINGS.categories };
  if (r.categories && typeof r.categories === "object") for (const k of Object.keys(cats) as SoundCategory[]) if (typeof r.categories[k] === "boolean") cats[k] = r.categories[k]!;
  for (const k of LOCKED) cats[k] = true;
  for (const k of SILENT) cats[k] = false; // policy: only red sounds
  return { muted: r.muted === true, volume: vol, categories: cats };
}

type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;
export function loadSettings(storage: Storage): SoundSettings {
  try { return normalize(JSON.parse(storage.getItem(STORAGE_KEY) || "null")); } catch { return { ...DEFAULT_SETTINGS, categories: { ...DEFAULT_SETTINGS.categories } }; }
}
export function saveSettings(storage: Storage, s: SoundSettings) { storage.setItem(STORAGE_KEY, JSON.stringify(normalize(s))); }

/** Changes a category (refused for locked categories). */
export function setCategory(s: SoundSettings, c: SoundCategory, on: boolean): SoundSettings {
  if (LOCKED.includes(c)) return s;
  return { ...s, categories: { ...s.categories, [c]: on } };
}

export type AlarmState = { acknowledged: boolean; snoozedUntil?: number | null };
export const isSnoozed = (a: AlarmState | undefined, now: number) => !!a?.snoozedUntil && now < a.snoozedUntil;

/** Should this sound play now? */
export function shouldPlay(s: SoundSettings, c: SoundCategory, alarm?: AlarmState, now = Date.now()): boolean {
  if (alarm && (alarm.acknowledged || isSnoozed(alarm, now))) return false;
  if (c === "alarmHigh") return true; // neither mute nor checkbox: it must be acknowledged or paused
  return !s.muted && s.categories[c];
}

/** Effective volume (0–1). */
export function effectiveVolume(s: SoundSettings, c: SoundCategory): number {
  if (c === "alarmHigh") return Math.max(MIN_HIGH_VOLUME, s.volume);
  return s.muted ? 0 : s.volume;
}

/** End of an alarm pause (2 min). */
export const snoozeUntil = (now = Date.now()) => now + SNOOZE_MS;
