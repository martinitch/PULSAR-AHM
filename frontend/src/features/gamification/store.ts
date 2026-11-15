/* Local gamification state, PER astronaut (key = crew code), persistent (localStorage):
   enabled/disabled (EF-44) + today's missions checked. Synced across components and tabs. */
import { useCallback, useSyncExternalStore } from "react";
import { HISTORY, MEASURES, MISSIONS, PRESET_DONE, TODAY_DEMO, constancyScore, profileFor } from "./data";
import { CREW } from "@/data/demo/crew";
import { localizeBadge, localizeGrade, localizeMember, localizeMission, useLang } from "@/i18n";

type State = { enabled: boolean; day: string; done: string[] };
const KEY = (id: string) => `pulsar.gamification.${id}`;
const today = () => new Date().toISOString().slice(0, 10);
const EVT = "pulsar-gamification";

export function readState(id: string): State {
  try {
    const s = JSON.parse(localStorage.getItem(KEY(id)) || "null") as State | null;
    if (s) return s.day === today() ? s : { ...s, day: today(), done: [...PRESET_DONE] };
  } catch { /* unreadable state: default values */ }
  return { enabled: true, day: today(), done: [...PRESET_DONE] };
}
function write(id: string, s: State) { localStorage.setItem(KEY(id), JSON.stringify(s)); window.dispatchEvent(new Event(EVT)); }
const subscribe = (f: () => void) => { window.addEventListener(EVT, f); window.addEventListener("storage", f); return () => { window.removeEventListener(EVT, f); window.removeEventListener("storage", f); }; };

/** Today's measurements done by a member (local state if it exists, otherwise demo). */
export function measuresDone(id: string) {
  const raw = localStorage.getItem(KEY(id));
  return raw ? readState(id).done.filter((d) => MEASURES.some((m) => m.id === d)).length : TODAY_DEMO[id] ?? 0;
}
/** Cooperative goal (EF-43): % of today's measurements done by the WHOLE crew, with no individual detail on the astronaut side. */
export function crewGoal() {
  const total = CREW.length * MEASURES.length;
  const done = CREW.reduce((a, m) => a + measuresDone(m.id), 0);
  return { done, total, pct: Math.round((done / total) * 100) };
}

export function useGamification(id: string) {
  const { lang } = useLang();
  const snap = useSyncExternalStore(subscribe, () => localStorage.getItem(KEY(id)) ?? "", () => "");
  const s = readState(id);
  void snap;
  const setEnabled = useCallback((enabled: boolean) => write(id, { ...readState(id), enabled }), [id]);
  const toggle = useCallback((mid: string) => { const st = readState(id); const adding = !st.done.includes(mid); write(id, { ...st, done: adding ? [...st.done, mid] : st.done.filter((x) => x !== mid) }); return adding; }, [id]);
  const markDone = useCallback((mid: string) => { const st = readState(id); if (st.done.includes(mid)) return false; write(id, { ...st, done: [...st.done, mid] }); return true; }, [id]);
  const h = HISTORY[id] ?? HISTORY.AM;
  const measuresDoneCount = MEASURES.filter((m) => s.done.includes(m.id)).length;
  const { streak, badges, grade } = profileFor(id, measuresDoneCount);
  const measuresComplete = measuresDoneCount >= MEASURES.length;
  const doneMissions = s.done.length;
  const badgesEarned = badges.filter((b) => b.value >= b.goal).length;
  /** Regularity XP only (checked missions + streak) — never a health value. */
  const xp = doneMissions * 25 + streak * 5;
  const constancy = constancyScore({
    streak,
    missionsDone: doneMissions,
    missionsTotal: MISSIONS.length,
    badgesEarned,
    badgesTotal: badges.length,
  });
  return {
    enabled: s.enabled, setEnabled, toggle, markDone,
    missions: MISSIONS.map((m) => localizeMission({ ...m, done: s.done.includes(m.id) }, lang)),
    measuresComplete, streak, missedDaysAgo: h.missedDaysAgo,
    badges: badges.map((b) => localizeBadge(b, lang)),
    grade: localizeGrade(grade, lang),
    crew: crewGoal(),
    xp, doneMissions, constancy, badgesEarned,
  };
}

/** Demo XP for a member (same formula as local state). */
export function xpFor(id: string) {
  const done = measuresDone(id);
  const routines = readState(id).done.length - done;
  const h = HISTORY[id] ?? HISTORY.AM;
  const complete = done >= MEASURES.length;
  const streak = h.streak + (complete ? 1 : 0);
  return (done + Math.max(0, routines)) * 25 + streak * 5;
}

/** Read-only for another screen (crew surgeon): is gamification enabled for this member? */
export function useCrewGamificationSnapshot() {
  const { lang } = useLang();
  useSyncExternalStore(subscribe, () => CREW.map((m) => localStorage.getItem(KEY(m.id)) ?? "").join("|"), () => "");
  const members = CREW.map((m) => {
    const done = measuresDone(m.id);
    const view = localizeMember(m, lang);
    const grade = localizeGrade(profileFor(m.id, done).grade, lang);
    return {
      id: m.id,
      name: m.name,
      cabin: view.cabin,
      done,
      total: MEASURES.length,
      enabled: readState(m.id).enabled,
      xp: xpFor(m.id),
      grade: grade.current.label,
    };
  });
  const poolXp = members.reduce((a, m) => a + m.xp, 0);
  return { goal: crewGoal(), members, poolXp };
}
