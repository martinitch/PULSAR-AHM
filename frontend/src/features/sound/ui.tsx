/* Sound UI: alarm banner (always visible) and settings panel (in the app / banner — no chrome icon). */
import { useEffect, useId, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "@/components/ui";
import { useSound, type Alarm } from "./SoundProvider";
import { CATEGORY_LABEL, LOCKED, SILENT, SNOOZE_MS, setCategory, type SoundCategory } from "./settings";
import { type SoundId } from "./engine";
import { useLang } from "@/i18n";

const LVL = { rouge: { cls: "warning", icon: "error", word: "Alerte" }, orange: { cls: "caution", icon: "warning", word: "Attention" }, info: { cls: "info", icon: "info", word: "Info" } } as const;

function Countdown({ until }: { until: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(i); }, []);
  const s = Math.max(0, Math.round((until - now) / 1000));
  return <span className="mono">{Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}</span>;
}

function AlarmRow({ a }: { a: Alarm }) {
  const { tr, lang } = useLang();
  const { acknowledge, snooze, markSeen } = useSound();
  const l = LVL[a.level];
  const paused = a.snoozedUntil != null && a.snoozedUntil > Date.now();
  const canSnooze = a.level === "orange" || (a.level === "rouge" && a.seen);
  useEffect(() => { if (!a.seen) markSeen(a.id); }, [a.id, a.seen, markSeen]);
  return (
    <motion.li layout initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`alarm alarm-${l.cls}`} data-level={a.level} data-seen={a.seen ? "1" : "0"} role={a.level === "rouge" ? "alert" : "status"}>
      <span className={`lamp lamp-${l.cls === "info" ? "ok" : l.cls}`}><Icon name={l.icon} size={16} /><b>{lang === "en" ? (a.level === "rouge" ? "Alert" : a.level === "orange" ? "Caution" : "Info") : l.word}</b></span>
      <span className="alarm-txt">
        <b>{a.title}</b>
        {a.detail && <small className="mono">{a.detail}</small>}
        {paused && <small className="alarm-snd" aria-live="polite"><Icon name="volume_off" size={12} /> {tr("Pause", "Pause")} <Countdown until={a.snoozedUntil!} /></small>}
      </span>
      <span className="btn-row">
        {a.level !== "info" && !paused && canSnooze && <button type="button" className="btn btn-ghost sm" onClick={() => snooze(a.id)} aria-label={tr(`Pause ${SNOOZE_MS / 60000} min`, `Pause ${SNOOZE_MS / 60000} min`)}><Icon name="snooze" size={16} /><span className="hide-sm">{tr("Pause", "Pause")}</span></button>}
        <button type="button" className="btn btn-primary sm" onClick={() => acknowledge(a.id)}><Icon name="check" size={16} /> {tr("Acquitter", "Acknowledge")}</button>
      </span>
    </motion.li>
  );
}

/** Compact banner (1 priority alarm + count) — patient-monitor / MCC style. */
export function AlarmBanner() {
  const { tr } = useLang();
  const { alarms, unlocked } = useSound();
  const [cfg, setCfg] = useState(false);
  const [openAll, setOpenAll] = useState(false);
  if (!alarms.length && !cfg) return null;
  const ranked = [...alarms].sort((a, b) => (a.level === "rouge" ? 0 : 1) - (b.level === "rouge" ? 0 : 1));
  const shown = openAll ? ranked : ranked.slice(0, 1);
  const more = ranked.length - shown.length;
  return (
    <section className="alarm-banner" aria-label={tr("Alarmes et son", "Alarms and sound")}>
      {!!shown.length && <ul><AnimatePresence initial={false}>{shown.map((a) => <AlarmRow key={a.id} a={a} />)}</AnimatePresence></ul>}
      {more > 0 && (
        <button type="button" className="btn btn-ghost sm" onClick={() => setOpenAll(true)}>
          {tr(`+ ${more} autre${more > 1 ? "s" : ""} alarme${more > 1 ? "s" : ""}`, `+ ${more} more alarm${more > 1 ? "s" : ""}`)}
        </button>
      )}
      {openAll && ranked.length > 1 && (
        <button type="button" className="btn btn-ghost sm" onClick={() => setOpenAll(false)}>{tr("Réduire", "Collapse")}</button>
      )}
      {!unlocked && !!alarms.length && <p className="alarm-unlock"><Icon name="volume_off" size={14} /> {tr("Touchez l’écran pour activer le son.", "Tap the screen to enable sound.")} <button type="button" className="btn btn-ghost sm" data-testid="sound-settings-open" onClick={() => setCfg(true)}>{tr("Réglages", "Settings")}</button></p>}
      {(unlocked || cfg) && (
        <div className="alarm-cfg">
          <button type="button" className="btn btn-ghost sm" data-testid="sound-settings-open" aria-expanded={cfg} onClick={() => setCfg((v) => !v)}>
            {cfg ? tr("Fermer les réglages du son", "Close sound settings") : tr("Réglages du son", "Sound settings")}
          </button>
          <AnimatePresence>
            {cfg && (
              <motion.div className="sound-inline" role="dialog" aria-label={tr("Réglages du son", "Sound settings")} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                <SoundSettingsPanel />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}

/** Persistent sound settings panel — Settings pages or the banner. */
const CATEGORY_EN: Record<SoundCategory, string> = {
  alarmHigh: "Red / extreme alert (only active sound)",
  alarmMedium: "Orange alert (silent)",
  alarmLow: "Notification · information (silent)",
  ack: "Acknowledgement (silent)",
  report: "Report received / sent (silent)",
  escalation: "Escalation (silent)",
  sensor: "Fatigue scan · beeps (silent)",
  badge: "Exercise finished (silent)",
  login: "Sign-in (off)",
  watchTick: "Watch navigation (off)",
  landing: "Interface hover (off)",
};

export function SoundSettingsPanel({ demo = true }: { demo?: boolean }) {
  const { tr, lang } = useLang();
  const { settings: s, update, play, raise } = useSound();
  const vid = useId();
  const cats = (Object.keys(CATEGORY_LABEL) as SoundCategory[]).filter((c) => !SILENT.includes(c));
  return (
    <div className="sound-panel" data-testid="sound-panel">
      <div className="setting">
        <div><b>{tr("Sourdine générale", "Master mute")}</b><p className="r-note">{tr("N’affecte pas l’alarme rouge / extrême (un seul bip à l’apparition, puis silence). Pas de son hors connexion. Orange et le reste : muets.", "Does not affect the red / extreme alarm (one beep when it appears, then silence). No sound outside sign-in. Orange and the rest stay mute.")}</p></div>
        <button type="button" role="switch" aria-checked={s.muted} aria-label={tr("Sourdine", "Mute")} className="switch" data-testid="sound-mute" onClick={() => update({ ...s, muted: !s.muted })}><i /></button>
      </div>
      <div className="setting">
        <label htmlFor={vid}><b>{tr("Volume", "Volume")}</b></label>
        <input id={vid} type="range" min={0} max={100} step={5} value={Math.round(s.volume * 100)} style={{ ["--pct" as string]: `${Math.round(s.volume * 100)}%` }} onChange={(e) => update({ ...s, volume: Number(e.target.value) / 100 })} aria-valuetext={`${Math.round(s.volume * 100)} %`} data-testid="sound-volume" />
        <span className="mono">{Math.round(s.volume * 100)} %</span>
      </div>
      <fieldset className="sound-cats">
        <legend className="eyebrow">{tr("Son d’alerte", "Alert sound")}</legend>
        <p className="r-note">{tr("Seul le rouge / extrême sonne. Orange, notifications, fatigue modérée et navigation restent muets.", "Only red / extreme sounds. Orange, notifications, moderate fatigue and navigation stay mute.")}</p>
        {cats.map((c) => {
          const locked = LOCKED.includes(c);
          return (
            <label key={c} className={locked ? "locked" : ""}>
              <input type="checkbox" checked={s.categories[c]} disabled={locked || SILENT.includes(c)} onChange={(e) => update(setCategory(s, c, e.target.checked))} data-cat={c} />
              <span>{lang === "en" ? CATEGORY_EN[c] : CATEGORY_LABEL[c]}{locked && <small> · {tr("toujours active (acquitter ou pause 2 min après vu)", "always on (acknowledge, or pause 2 min after seen)")}</small>}</span>
            </label>
          );
        })}
      </fieldset>
      {demo && (
        <details className="sound-tests">
          <summary>{tr("Écouter l’alarme rouge", "Hear the red alarm")}</summary>
          <div className="btn-row">
            <button type="button" className="btn btn-ghost sm" onClick={() => play("alarmHigh")}>{tr("Alerte rouge", "Red alert")}</button>
            <button type="button" className="btn btn-ghost sm" onClick={() => play("fatiguePim")}>{tr("Pip alerte (scan)", "Alert pip (scan)")}</button>
            <button className="btn btn-secondary sm" data-testid="sound-test-red" onClick={() => raise({ id: `TEST-${Date.now()}`, level: "rouge", title: tr("Test d’alarme rouge", "Red alarm test"), detail: tr("Simulation (DÉMO) — acquittez pour arrêter", "Simulation (DEMO) — acknowledge to stop") })}><Icon name="error" size={16} /> {tr("Simuler une alarme rouge", "Simulate a red alarm")}</button>
          </div>
        </details>
      )}
    </div>
  );
}

/** Sound settings from the toolbar (mute state stays visible). */
export function SoundMenu() {
  const { tr } = useLang();
  const { settings } = useSound();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onPtr = (e: PointerEvent) => {
      const wrap = document.querySelector(".sound-menu-wrap");
      const t = e.target as Node | null;
      if (wrap && t && !wrap.contains(t)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPtr);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPtr);
    };
  }, [open]);
  const muted = settings.muted;
  return (
    <div className="sound-menu-wrap">
      <button
        type="button"
        className={`tool-btn${open ? " is-open" : ""}${muted ? " is-muted" : ""}`}
        data-testid="sound-menu"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name={muted ? "volume_off" : "volume_up"} size={16} />
        <span>{tr("Son", "Sound")}</span>
        {muted && <small className="tool-btn__meta">{tr("Sourdine", "Muted")}</small>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="sound-menu-pop"
            role="dialog"
            aria-label={tr("Réglages du son", "Sound settings")}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            <header className="sound-menu-pop__head">
              <Icon name="volume_up" size={18} />
              <div>
                <b>{tr("Réglages du son", "Sound settings")}</b>
                <p>{tr("Alarmes IEC · la rouge reste active", "IEC alarms · red stays active")}</p>
              </div>
            </header>
            <SoundSettingsPanel />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Button that plays an event sound on click. */
export function SoundButton({ sound, onClick, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { sound: SoundId }) {
  const { play } = useSound();
  return <button {...rest} onClick={(e) => { play(sound); onClick?.(e); }}>{children}</button>;
}
