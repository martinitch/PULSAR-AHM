import "./watch.css";
/* v6 — PULSAR Watch: square screens 198×242 (watchOS) and round 454×454 (Wear OS).
   Principles: one glance (< 2 s), one primary info + one action, black OLED background,
   state = color + icon + word (NASA-STD-3001 C&W), targets ≥ 44 pt / 48 dp, haptic feedback described. */
import { useEffect, useState } from "react";
import { Icon, Emblem, type IconName } from "@/components/ui";
import { notifyBackend, notifyOk } from "@/components/ui/noticeStore";
import { GameIcon } from "@/features/gamification/glyphs";
import { useLang } from "@/i18n";

export type WShape = "square" | "round";
export type WView = "home" | "caution" | "warning" | "reminder" | "breathe" | "sync" | "offline" | "body" | "goals";
/** Gamification complication (CDC § 5.9): regularity streak + crew goal. null = disabled. */
export type WGoals = { streak: number; crew: number } | null;
export const W_VIEWS: [WView, string][] = [
  ["home", "Cadran · accueil"], ["body", "Mini silhouette"], ["caution", "Alerte orange"], ["warning", "Alerte rouge"],
  ["reminder", "Rappel de mesure"], ["breathe", "Respiration"], ["sync", "Synchro tablette"], ["offline", "Hors ligne"], ["goals", "Objectifs (complication)"],
];
const HYP = [2, 3, 2, 1, 2, 3, 3, 2, 1, 2, 3, 2]; // sleep depth (DEMO) — bars aligned at the bottom

function Top({ icon, label, tone, time = "09:41" }: { icon?: IconName; label: string; tone?: "ok" | "caution" | "warning" | "muted" | "accent"; time?: string }) {
  return <div className="wt-top"><span className={`wt-lab t-${tone ?? "muted"}`}>{icon && <Icon name={icon} size={12} />}{label}</span><span className="wt-time">{time}</span></div>;
}
function Haptic({ children }: { children: string }) {
  return <p className="wt-haptic"><Icon name="vibration" size={12} /> {children}</p>;
}
function Mini({ big }: { big?: boolean }) {
  const { tr } = useLang();
  return (
    <svg className={`wt-mini ${big ? "big" : ""}`} viewBox="0 0 60 120" role="img" aria-label={tr("Silhouette : cœur et cerveau en attention, poumons nominaux", "Silhouette: heart and brain in caution, lungs nominal")}>
      <g fill="#2b3036">
        <circle cx="30" cy="12" r="9" />
        <rect x="19" y="24" width="22" height="42" rx="9" />
        <path d="M20 29 L10 62" stroke="#2b3036" strokeWidth="7" strokeLinecap="round" />
        <path d="M40 29 L50 62" stroke="#2b3036" strokeWidth="7" strokeLinecap="round" />
        <path d="M25 62 L23 113" stroke="#2b3036" strokeWidth="8.5" strokeLinecap="round" />
        <path d="M35 62 L37 113" stroke="#2b3036" strokeWidth="8.5" strokeLinecap="round" />
      </g>
      <circle cx="30" cy="10" r="4" className="d-caution" />
      <circle cx="34.5" cy="37" r="4" className="d-caution" />
      <circle cx="24.5" cy="36" r="3.2" className="d-ok" />
      <circle cx="30" cy="52" r="3.2" className="d-ok" />
    </svg>
  );
}

export function Watch6({ shape, view: initial = "home", frozen = false, goals }: { shape: WShape; view?: WView; frozen?: boolean; goals?: WGoals }) {
  const { tr } = useLang();
  const gl = goals === undefined ? { streak: 12, crew: 70 } : goals; // gallery: DEMO values
  const [view, setView] = useState<WView>(initial);
  const [sec, setSec] = useState(42);
  const [flash, setFlash] = useState<string | null>(null);
  useEffect(() => { setView(initial); }, [initial]);
  useEffect(() => {
    if (frozen || view !== "breathe") return;
    const t = window.setInterval(() => setSec((s) => (s <= 0 ? 60 : s - 1)), 1000);
    return () => window.clearInterval(t);
  }, [view, frozen]);
  const go = (v: WView) => () => { setFlash(null); setView(v); };
  const phaseIn = (60 - sec) % 8 < 4;
  return (
    <div className={`wt wt-${shape} v-${view}`} data-view={view}>
      {(view === "caution" || view === "warning") && <i className={`wt-band ${view}`} aria-hidden="true" />}
      <div className="wt-in">
        {view === "home" && (<>
          <Top icon="warning" label={tr("ATTENTION", "CAUTION")} tone="caution" />
          <button className="wt-hero" onClick={go("body")} aria-label={tr("Pouls de repos 94 bpm, en hausse — voir la silhouette", "Resting pulse 94 bpm, rising — see the silhouette")}>
            <span className="wt-k"><Icon name="favorite" size={14} /> {tr("POULS REPOS", "RESTING PULSE")}</span>
            <span className="wt-big">94<small>bpm</small></span>
            <span className="wt-sub t-caution"><Icon name="arrow_upward" size={11} /> {tr("+20 en 3 j", "+20 in 3 d")}</span>
          </button>
          <button className="wt-row" onClick={go("body")} aria-label={tr("Sommeil 5 h 10", "Sleep 5 h 10")}>
            <Icon name="bedtime" size={14} /><b>5h10</b><svg className="wt-hyp" viewBox="0 0 70 18" aria-hidden="true">{HYP.map((h, i) => <rect key={i} x={i * 6} y={18 - h * 6} width={4} height={h * 6} rx={1.5} />)}</svg>
          </button>
          {gl ? <button className="wt-foot wt-comp" onClick={go("goals")} aria-label={tr(`Série ${gl.streak} jours, objectif d’équipage ${gl.crew} %`, `Streak ${gl.streak} days, crew goal ${gl.crew} %`)}><GameIcon name="flame" size={12} /><b>{gl.streak} {tr("j", "d")}</b><GameIcon name="crew" size={12} /><b>{gl.crew} %</b><em>{tr("DÉMO", "DEMO")}</em></button>
            : <button className="wt-foot" onClick={go("sync")}><i className="dot ok" /> {tr("Tablette · 2 min", "Tablet · 2 min")} <em>{tr("DÉMO", "DEMO")}</em></button>}
        </>)}

        {view === "body" && (<>
          <Top icon="accessibility_new" label={tr("CORPS", "BODY")} />
          <div className="wt-bodyrow"><Mini /><ul className="wt-legend">
            <li><i className="d-caution" />{tr("Cœur", "Heart")}<span>{tr("pouls ↑", "pulse ↑")}</span></li>
            <li><i className="d-caution" />{tr("Sommeil", "Sleep")}<span>5h10</span></li>
            <li><i className="d-ok" />{tr("Poumons", "Lungs")}<span>SpO₂ 97</span></li>
          </ul></div>
          <p className="wt-note">{tr("Détail sur la tablette", "Detail on the tablet")}</p>
          <button className="wt-btn ghost" onClick={go("home")}>{tr("Retour", "Back")}</button>
        </>)}

        {view === "caution" && (<>
          <Top icon="warning" label={tr("ATTENTION", "CAUTION")} tone="caution" />
          <p className="wt-title">{tr("Pouls de repos élevé", "High resting pulse")}</p>
          <p className="wt-text">{tr("94 bpm · en hausse depuis 3 jours", "94 bpm · rising for 3 days")}</p>
          <Haptic>{tr("2 impulsions · 1 fois", "2 pulses · once")}</Haptic>
          <button className="wt-btn" onClick={go("breathe")}><Icon name="air" size={14} /> {tr("Respirer 1 min", "Breathe 1 min")}</button>
          <button className="wt-btn ghost" onClick={go("home")}>{tr("Plus tard", "Later")}</button>
        </>)}

        {view === "warning" && (<>
          <Top icon="error" label={tr("ALERTE", "ALERT")} tone="warning" />
          <p className="wt-title">{tr("Pouls 138 bpm au repos", "Pulse 138 bpm at rest")}</p>
          <p className="wt-text">{tr("Asseyez-vous. Médecin de bord prévenu.", "Sit down. Crew surgeon notified.")}</p>
          <Haptic>{tr("Répété toutes les 10 s · jusqu’à OK", "Repeats every 10 s · until OK")}</Haptic>
          <button className="wt-btn red" onClick={go("home")}><Icon name="check" size={14} /> {tr("J’ai vu", "Seen")}</button>
          <button className="wt-btn ghost" onClick={() => notifyBackend(tr("Appel au médecin de bord depuis la montre", "Call to the crew surgeon from the watch"))}><Icon name="call" size={14} /> {tr("Médecin de bord", "Crew surgeon")}</button>
        </>)}

        {view === "reminder" && (<>
          <Top icon="event_repeat" label={tr("RAPPEL", "REMINDER")} tone="accent" time="07:30" />
          <span className="wt-ico"><Icon name="blood_pressure" size={22} /></span>
          <p className="wt-title">{tr("Tension artérielle", "Blood pressure")}</p>
          <p className="wt-text">{tr("Kit tensiomètre · assise 2 min", "BP kit · seated 2 min")}</p>
          <Haptic>{tr("1 impulsion légère", "1 light pulse")}</Haptic>
          <div className="wt-two"><button className="wt-btn ghost" onClick={() => { setFlash(tr("Rappel dans 15 min", "Reminder in 15 min")); window.setTimeout(() => { setFlash(null); setView("home"); }, 1200); }}>+15 min</button><button className="wt-btn" onClick={() => { setFlash(tr("Mesure lancée", "Reading started")); notifyOk(tr("Mesure lancée", "Reading started"), tr("Le kit tension est sur la tablette, écran Kits.", "The blood-pressure kit is on the tablet, Kits screen.")); window.setTimeout(() => { setFlash(null); setView("home"); }, 1200); }}>{tr("Commencer", "Start")}</button></div>
          {flash && <p className="wt-text" role="status">{flash}</p>}
        </>)}

        {view === "breathe" && (<>
          <Top icon="air" label={tr("RESPIRATION", "BREATHING")} tone="accent" />
          <div className={`wt-breath ${frozen ? "" : phaseIn ? "in" : "out"}`} aria-hidden="true"><i /><i /></div>
          <p className="wt-title" aria-live="polite">{phaseIn ? tr("Inspirez · 4 s", "Inhale · 4 s") : tr("Expirez · 4 s", "Exhale · 4 s")}</p>
          <p className="wt-text mono">0:{String(sec).padStart(2, "0")} · {tr("cycle 3 / 6", "cycle 3 / 6")}</p>
          <Haptic>{tr("Tapotement à chaque phase", "A tap on each phase")}</Haptic>
          <button className="wt-btn ghost" onClick={go("home")}>{tr("Terminer", "Finish")}</button>
        </>)}

        {view === "sync" && (<>
          <Top icon="cloud_sync" label={tr("WI-FI", "WI-FI")} tone="ok" />
          <div className="wt-link"><Icon name="watch" size={20} /><i /><i /><i /><Icon name="tablet" size={20} /></div>
          <p className="wt-title">{tr("Tablette à jour", "Tablet up to date")}</p>
          <ul className="wt-list">
            <li><Icon name="check" size={12} />{tr("Pouls", "Pulse")}<span>186 pts</span></li>
            <li><Icon name="check" size={12} />{tr("Sommeil", "Sleep")}<span>5h10</span></li>
            <li><Icon name="battery_5_bar" size={12} />{tr("Batterie", "Battery")}<span>64 %</span></li>
          </ul>
          <p className="wt-note">{tr("il y a 2 min · cabine 2", "2 min ago · cabin 2")}</p>
          <button className="wt-btn ghost" onClick={go("home")}>{tr("Retour", "Back")}</button>
        </>)}

        {view === "goals" && gl && (<>
          <Top icon="award" label={tr("OBJECTIFS", "GOALS")} tone="accent" />
          <span className="wt-k"><GameIcon name="flame" size={12} /> {tr("SÉRIE RÉGULARITÉ", "REGULARITY STREAK")}</span>
          <span className="wt-big">{gl.streak}<small>{tr("jours", "days")}</small></span>
          <p className="wt-text">{tr("Équipage · mesures du jour", "Crew · today’s readings")}</p>
          <span className="wt-goal"><i style={{ width: `${gl.crew}%` }} /></span>
          <p className="wt-text mono">{gl.crew} % · {tr("objectif 100 %", "goal 100 %")}</p>
          <button className="wt-btn ghost" onClick={go("home")}>{tr("Retour", "Back")}</button>
        </>)}

        {view === "offline" && (<>
          <Top icon="cloud_off" label={tr("HORS LIGNE", "OFFLINE")} tone="muted" />
          <span className="wt-ico off"><Icon name="link_off" size={22} /></span>
          <p className="wt-title">{tr("Tablette injoignable", "Tablet unreachable")}</p>
          <p className="wt-text">{tr("Depuis 38 min · 41 mesures gardées sur la montre", "For 38 min · 41 readings kept on the watch")}</p>
          <p className="wt-okline"><Icon name="check_circle" size={12} /> {tr("Alertes rouges actives (vibreur)", "Red alerts still on (vibrator)")}</p>
          <button className="wt-btn ghost" onClick={go("sync")}><Icon name="sync" size={14} /> {tr("Réessayer", "Try again")}</button>
        </>)}
      </div>
      {shape === "round" && view === "home" && <svg className="wt-arc" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48" /><circle className="v" cx="50" cy="50" r="48" strokeDasharray="223.2 301.6" transform="rotate(-90 50 50)" /></svg>}
      {view === "home" && <span className="wt-emb"><Emblem size={shape === "round" ? 22 : 12} /></span>}
    </div>
  );
}

/* gallery: every view, two formats */
export function WatchGallery() {
  const { tr } = useLang();
  return (
    <div className="wt-gallery">
      <header><Emblem size={28} /><div><h1>{tr("Écrans de la montre", "Watch screens")}</h1><p>{tr("Carrée 198×242 (watchOS) · ronde 454×454 (Wear OS)", "Square 198×242 (watchOS) · round 454×454 (Wear OS)")}</p></div></header>
      {(["square", "round"] as WShape[]).map((s) => (
        <section key={s}><h2>{s === "square" ? tr("Montre carrée · 198×242", "Square watch · 198×242") : tr("Montre ronde · 454×454", "Round watch · 454×454")}</h2>
          <div className="wt-row-g">{W_VIEWS.map(([v, l]) => <figure key={v}><Watch6 shape={s} view={v} frozen /><figcaption>{tr(l, ({ home: "Dial · home", body: "Mini silhouette", caution: "Orange alert", warning: "Red alert", reminder: "Reading reminder", breathe: "Breathing", sync: "Tablet sync", offline: "Offline", goals: "Goals (complication)" } as Record<string, string>)[v] ?? l)}</figcaption></figure>)}</div>
        </section>
      ))}
    </div>
  );
}
