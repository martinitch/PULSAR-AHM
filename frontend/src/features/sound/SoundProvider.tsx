/* Sound service: audio unlock only when signed in; red alert = ONE beep (no loop).
   Visual (banner) unchanged. Outside a session = total silence. */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { DEFAULT_SETTINGS, effectiveVolume, isSnoozed, loadSettings, saveSettings, shouldPlay, snoozeUntil, type SoundSettings } from "./settings";
import { SOUND_CATEGORY, isUnlocked, playPattern, unlock, type SoundId } from "./engine";
import { pingHardwareBuzzer } from "./hardwareBuzzer";

export type AlarmLevel = "rouge" | "orange" | "info";
export type Alarm = {
  id: string;
  level: AlarmLevel;
  title: string;
  detail?: string;
  raisedAt: number;
  acknowledged: boolean;
  snoozedUntil: number | null;
  seen: boolean;
  /** Sound already emitted once for this alarm. */
  sounded: boolean;
  /** Pattern to play (default: the level's siren). The extreme face scan uses the pim. */
  sound?: SoundId;
};
const LEVEL_SOUND: Record<AlarmLevel, SoundId> = { rouge: "alarmHigh", orange: "alarmMedium", info: "alarmLow" };
const ACK_KEY = "pulsar.alarms.ack";
const SOUNDED_KEY = "pulsar.alarms.sounded";
const loadAck = (): string[] => { try { return JSON.parse(localStorage.getItem(ACK_KEY) || "[]"); } catch { return []; } };
const loadSounded = (): string[] => { try { return JSON.parse(localStorage.getItem(SOUNDED_KEY) || "[]"); } catch { return []; } };
const rememberSounded = (id: string) => {
  localStorage.setItem(SOUNDED_KEY, JSON.stringify([...new Set([...loadSounded(), id])]));
};

type Ctx = {
  settings: SoundSettings; update: (s: SoundSettings) => void; unlocked: boolean;
  play: (id: SoundId) => void; alarms: Alarm[];
  raise: (a: { id: string; level: AlarmLevel; title: string; detail?: string; sound?: SoundId }) => void;
  acknowledge: (id: string) => void;
  markSeen: (id: string) => void;
  snooze: (id: string) => void;
};
const C = createContext<Ctx | null>(null);

export function SoundProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const armed = !!user;
  const [settings, setSettings] = useState<SoundSettings>(() => (typeof localStorage === "undefined" ? DEFAULT_SETTINGS : loadSettings(localStorage)));
  const [unlocked, setUnlocked] = useState(false);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const sRef = useRef(settings); sRef.current = settings;
  const aRef = useRef(alarms); aRef.current = alarms;
  const armedRef = useRef(armed); armedRef.current = armed;

  /** Audio unlock only once signed in (not on the public home page). */
  useEffect(() => {
    if (!armed) return;
    const go = async () => { if (await unlock()) { setUnlocked(true); off(); } };
    const evs = ["pointerdown", "keydown", "touchstart"] as const;
    const off = () => evs.forEach((e) => window.removeEventListener(e, go));
    evs.forEach((e) => window.addEventListener(e, go, { passive: true }));
    return off;
  }, [armed]);

  const play = useCallback((id: SoundId) => {
    if (!armedRef.current) return;
    const s = sRef.current, cat = SOUND_CATEGORY[id];
    if (!shouldPlay(s, cat)) return;
    playPattern(id, effectiveVolume(s, cat));
    pingHardwareBuzzer(id);
  }, []);

  const update = useCallback((s: SoundSettings) => { saveSettings(localStorage, s); setSettings(loadSettings(localStorage)); }, []);

  const raise = useCallback((a: { id: string; level: AlarmLevel; title: string; detail?: string; sound?: SoundId }) => {
    if (aRef.current.some((x) => x.id === a.id) || loadAck().includes(a.id)) return;
    const already = loadSounded().includes(a.id);
    setAlarms((l) => [...l, { ...a, raisedAt: Date.now(), acknowledged: false, snoozedUntil: null, seen: false, sounded: already }]);
  }, []);
  const acknowledge = useCallback((id: string) => {
    localStorage.setItem(ACK_KEY, JSON.stringify([...new Set([...loadAck(), id])]));
    setAlarms((l) => l.filter((x) => x.id !== id));
  }, []);
  const markSeen = useCallback((id: string) => {
    setAlarms((l) => l.map((x) => (x.id === id ? { ...x, seen: true } : x)));
  }, []);
  const snooze = useCallback((id: string) => {
    setAlarms((l) => l.map((x) => {
      if (x.id !== id) return x;
      if (x.level === "rouge" && !x.seen) return x;
      return { ...x, seen: true, snoozedUntil: snoozeUntil() };
    }));
  }, []);

  /** A single sound emission per red alarm (never a loop). */
  useEffect(() => {
    if (!armed) return;
    const tick = () => {
      if (!armedRef.current) return;
      const now = Date.now(), s = sRef.current;
      for (const a of aRef.current) {
        if (a.level !== "rouge" || a.sounded || a.acknowledged) continue;
        if (isSnoozed(a, now)) continue;
        const id = a.sound ?? LEVEL_SOUND[a.level], cat = SOUND_CATEGORY[id];
        if (!shouldPlay(s, cat, a, now)) continue;
        playPattern(id, effectiveVolume(s, cat));
        pingHardwareBuzzer(id);
        rememberSounded(a.id);
        setAlarms((l) => l.map((x) => (x.id === a.id ? { ...x, sounded: true } : x)));
      }
      if (!unlocked && isUnlocked()) setUnlocked(true);
    };
    tick();
    const i = window.setInterval(tick, 500);
    return () => window.clearInterval(i);
  }, [alarms, unlocked, armed]);

  /** Sign-out → silence and no more alarms in UI memory. */
  useEffect(() => {
    if (armed) return;
    setAlarms([]);
    setUnlocked(false);
  }, [armed]);

  const value = useMemo(() => ({ settings, update, unlocked, play, alarms, raise, acknowledge, markSeen, snooze }), [settings, update, unlocked, play, alarms, raise, acknowledge, markSeen, snooze]);
  return <C.Provider value={value}>{children}</C.Provider>;
}

const NOOP: Ctx = { settings: DEFAULT_SETTINGS, update: () => {}, unlocked: false, play: () => {}, alarms: [], raise: () => {}, acknowledge: () => {}, markSeen: () => {}, snooze: () => {} };
export function useSound(): Ctx { return useContext(C) ?? NOOP; }
