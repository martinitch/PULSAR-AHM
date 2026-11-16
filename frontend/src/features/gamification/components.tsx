/* Cooperative gamification (CDC § 5.9): regularity streak, daily missions, crew goal, badges.
   Quiet: no confetti, no glow; short Motion animations (honors prefers-reduced-motion). */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { motion, useReducedMotion } from "motion/react";
import { Card, HudDial, Icon } from "@/components/ui";
import { BodyFigure, statesFor } from "@/components/body3d";
import { BADGE_FAMILIES } from "./data";
import { badgeGlyph, GameIcon, type GameIconName } from "./glyphs";
import type { useGamification } from "./store";
import { useSound } from "@/features/sound";
import { FAMILY_EN, gradeHintFor, useLang } from "@/i18n";
import { useMe } from "@/features/auth/useMe";
import { applyExerciseStates, BODY_PARTS, exerciseFocus, exercisePart, partLabel, startExercise, stopExercise, useExerciseSession } from "./exercise";

type G = ReturnType<typeof useGamification>;

const WEEKDAY = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const WEEKDAY_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const XP_PER_MISSION = 25;

/** Weekly calendar (7 days): done / in progress / missed — regularity only. */
export function StreakWeek({ g }: { g: G }) {
  const { tr, lang } = useLang();
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const ago = 6 - i;
    const d = new Date(today);
    d.setDate(today.getDate() - ago);
    const ok = ago === 0 ? g.measuresComplete : !g.missedDaysAgo.includes(ago) && ago <= g.streak;
    return {
      ago,
      label: lang === "en" ? WEEKDAY_EN[d.getDay()] : WEEKDAY[d.getDay()],
      date: d.getDate(),
      ok,
      today: ago === 0,
    };
  });
  return (
    <ol className="streak-week" aria-label={tr("Régularité des 7 derniers jours", "Regularity over the last 7 days")}>
      {days.map((d) => (
        <li key={d.ago} className={d.ok ? "ok" : d.today ? "today" : "miss"} title={d.today ? tr("Aujourd’hui", "Today") : tr(`Il y a ${d.ago} j`, `${d.ago} d ago`)}>
          <span className="sw-label">{d.label}</span>
          <span className="sw-mark" aria-hidden="true">
            {d.ok ? <Icon name="check" size={14} /> : d.today ? null : null}
          </span>
          <span className="sw-date mono">{d.date}</span>
          <span className="visually-hidden">
            {d.today ? tr("Aujourd’hui", "Today") : tr(`Il y a ${d.ago} jours`, `${d.ago} days ago`)} : {d.ok ? tr("toutes les mesures faites", "all measures done") : d.today ? tr("en cours", "in progress") : tr("incomplet", "incomplete")}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Compact 14-day history (under the calendar). */
export function StreakDays({ g }: { g: G }) {
  const { tr } = useLang();
  const days = Array.from({ length: 14 }, (_, i) => 13 - i);
  return (
    <ol className="streak-days" aria-label={tr("Régularité des 14 derniers jours", "Regularity over the last 14 days")}>
      {days.map((d) => {
        const ok = d === 0 ? g.measuresComplete : !g.missedDaysAgo.includes(d) && d <= g.streak;
        return (
          <li key={d} className={ok ? "ok" : d === 0 ? "today" : "miss"} title={d === 0 ? tr("Aujourd’hui", "Today") : tr(`Il y a ${d} j`, `${d} d ago`)}>
            <span className="visually-hidden">{d === 0 ? tr("Aujourd’hui", "Today") : tr(`Il y a ${d} jours`, `${d} days ago`)} : {ok ? tr("toutes les mesures faites", "all measures done") : d === 0 ? tr("en cours", "in progress") : tr("incomplet", "incomplete")}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function StreakCard({ g, className }: { g: G; className?: string }) {
  const { tr } = useLang();
  return (
    <Card title={tr("Série de régularité", "Regularity streak")} glyph={<GameIcon name="flame" />} className={className}>
      <div className="streak-hero">
        <p className="streak-big">
          <motion.b key={g.streak} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>{g.streak}</motion.b>
          {" "}{tr("jours de suite", "days in a row")}
        </p>
        <p className="r-note">{g.measuresComplete ? tr("Toutes les mesures du jour sont faites : la série continue.", "All of today’s measures are done: the streak continues.") : tr("Faites toutes les mesures du jour pour prolonger la série.", "Complete today’s measures to extend the streak.")}</p>
      </div>
      <StreakWeek g={g} />
      <p className="eyebrow streak-hist-label">{tr("14 derniers jours", "Last 14 days")}</p>
      <StreakDays g={g} />
    </Card>
  );
}

/** Regularity bento tiles — never health values (EF-42). */
export function RegularityTiles({ g }: { g: G }) {
  const { tr } = useLang();
  const missionsDone = g.missions.filter((m) => m.done).length;
  const badgesGot = g.badgesEarned;
  const tiles = [
    { id: "constancy", icon: <GameIcon name="gem" size={18} />, label: tr("Indice de constance", "Constancy index"), value: `${g.constancy}`, hint: tr("série · missions · insignes — pas un score clinique", "streak · missions · badges — not a clinical score") },
    { id: "missions", icon: <GameIcon name="missions" size={18} />, label: tr("Missions du jour", "Today’s missions"), value: `${missionsDone}/${g.missions.length}`, hint: tr("mesures + routines", "measures + routines") },
    { id: "xp", icon: <GameIcon name="bolt" size={18} />, label: tr("XP régularité", "Regularity XP"), value: `${g.xp}`, hint: tr("+25 / mission · +5 / jour de série", "+25 / mission · +5 / streak day") },
    { id: "badges", icon: <GameIcon name="medal" size={18} />, label: tr("Insignes obtenus", "Badges earned"), value: `${badgesGot}/${g.badges.length}`, hint: tr("jalons de constance", "constancy milestones") },
  ] as const;
  return (
    <ul className="goals-metrics" aria-label={tr("Indicateurs de régularité", "Regularity metrics")}>
      {tiles.map((t) => (
        <li key={t.id} className="goals-metric">
          <span className="gm-ico">{t.icon}</span>
          <span className="gm-label">{t.label}</span>
          <strong className="gm-value mono">{t.value}</strong>
          <span className="gm-hint">{t.hint}</span>
        </li>
      ))}
    </ul>
  );
}

export function MissionsCard({ g, className }: { g: G; className?: string }) {
  const { tr } = useLang();
  const n = g.missions.filter((m) => m.done).length;
  const pct = Math.round((n / g.missions.length) * 100);
  const { play } = useSound();
  return (
    <Card
      title={tr("Défis du jour", "Today’s challenges")}
      glyph={<GameIcon name="missions" />}
      aside={<span className="chip mono" data-testid="missions-count">{n}/{g.missions.length}</span>}
      className={className}
    >
      <p className="goal-line challenges-progress">
        <b className="mono">{pct} %</b> {tr("complété", "complete")}
      </p>
      <CrewGoalBar pct={pct} />
      <ul className="missions">
        {g.missions.map((m) => (
          <motion.li layout key={m.id} className={m.done ? "done" : ""}>
            <button type="button" role="checkbox" aria-checked={m.done} onClick={() => { if (g.toggle(m.id)) play("badge"); }}>
              <span className="mi-box">{m.done && <Icon name="check" size={16} />}</span>
              <Icon name={m.icon} size={18} />
              <span className="mi-body">
                <span className="mi-label">{m.label}</span>
                <span className="mi-kind mono">{m.kind === "mesure" ? tr("mesure", "measure") : tr("routine", "routine")} · {m.when}</span>
              </span>
              <span className="mi-xp mono">{m.done ? tr("fait", "done") : `+${XP_PER_MISSION} XP`}</span>
            </button>
          </motion.li>
        ))}
      </ul>
    </Card>
  );
}

export function CrewGoalBar({ pct }: { pct: number }) {
  const { tr } = useLang();
  return <span className="goal-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={tr("Objectif d’équipage", "Crew goal")}><motion.i initial={false} animate={{ width: `${pct}%` }} transition={{ duration: 0.35, ease: "easeOut" }} /></span>;
}

export function CrewGoalCard({ g }: { g: G }) {
  const { tr } = useLang();
  return (
    <Card title={tr("Objectif d’équipage", "Crew goal")} glyph={<GameIcon name="crew" />}>
      <p className="goal-line"><b className="mono">{g.crew.pct} %</b> {tr("des mesures du jour faites par l’équipage", "of today’s measures done by the crew")} <span className="muted mono">({g.crew.done}/{g.crew.total})</span></p>
      <CrewGoalBar pct={g.crew.pct} />
      <p className="r-note">{tr("Objectif commun : 100 % avant 21:00. Chacun y contribue ; aucun classement individuel.", "Shared goal: 100% before 21:00. Everyone contributes; no individual ranking.")}</p>
    </Card>
  );
}

/** Flat medal: disc + ribbon. The mark uses accent ink once the badge is earned. */
function Medal({ name, goal, showCount }: { name: GameIconName; goal: number; earned: boolean; showCount: boolean }) {
  return (
    <span className="bd-medal">
      <svg viewBox="0 0 80 108" aria-hidden="true">
        <path className="bd-ribbon" pathLength={1} d="M28 58 H52 V104 L40 90 L28 104 Z" />
        <circle className="bd-disc" pathLength={1} cx="40" cy="34" r="30" />
        <circle className="bd-inner" pathLength={1} cx="40" cy="34" r="23" />
      </svg>
      <span className="bd-mark">
        {showCount ? <b className={goal >= 100 ? "mono bd-num bd-num--long" : "mono bd-num"}>{goal}</b> : <GameIcon name={name} size={26} />}
      </span>
    </span>
  );
}

export function BadgesCard({ g, className }: { g: G; className?: string }) {
  const { tr, lang } = useLang();
  return (
    <Card title={tr("Insignes & badges de l’équipage", "Crew badges")} glyph={<GameIcon name="medal" />} className={className}>
      <div className="grade-block">
        <p className="grade-now">{tr("Niveau", "Level")} <b>{g.grade.current.label}</b> · {tr("constance", "constancy")} <b className="mono">{g.constancy}</b></p>
        <p className="r-note">{gradeHintFor(g.grade, lang)} {tr("Les insignes obtenus sont en couleur ; les autres restent atténués.", "Earned badges are in color; the others stay muted.")}</p>
        <ol className="grade-steps" aria-label={tr("Niveaux de constance", "Constancy levels")}>
          {g.grade.levels.map((level) => (
            <li key={level.id} className={g.grade.earned >= level.min ? "got" : ""} aria-current={level.id === g.grade.current.id ? "step" : undefined}>
              {level.label}
            </li>
          ))}
        </ol>
      </div>
      <div className="badge-groups">
        {BADGE_FAMILIES.map((family) => (
          <section key={family.id} aria-label={family.label}>
            <p className="eyebrow">{lang === "en" ? FAMILY_EN[family.id] ?? family.label : family.label}</p>
            <ul className="badges">
              {g.badges.filter((b) => b.family === family.id).map((b) => {
                const got = b.value >= b.goal;
                const pct = b.goal === 0 ? 0 : b.value / b.goal;
                return (
                  <li key={b.id} className={got ? "got" : pct > 0 ? "is-on" : "is-locked"} data-earned={got} aria-disabled={!got}>
                    <Medal name={badgeGlyph(b.id)} goal={b.goal} earned={got} showCount={b.family === "serie"} />
                    <b>{b.label}</b>
                    <span className="bd-detail">{b.detail}</span>
                    <span className="bd-prog">{got ? <><Icon name="check_circle" size={14} /> {tr("Obtenu", "Earned")}</> : <span className="mono">{b.value}/{b.goal}</span>}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </Card>
  );
}

export function EthicsNote() {
  const { tr } = useLang();
  return (
    <p className="disclaimer" role="note"><Icon name="verified_user" size={16} /><span><b>{tr("Règles :", "Rules:")}</b> {tr("séries et badges ne dépendent que de la régularité (mesures faites, routines suivies), jamais de vos valeurs de santé. Aucune comparaison entre membres. Vous pouvez désactiver la gamification dans", "streaks and badges depend only on regularity (readings done, routines followed), never on your health values. No comparison between members. You can turn gamification off in")} <Link to="/astronaute/reglages">{tr("Réglages", "Settings")}</Link>.</span></p>
  );
}

type TraceMode = "pulse" | "wave" | "crew";

function useTick(ms = 90) {
  const calm = useReducedMotion();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (calm) return;
    const id = window.setInterval(() => setTick((t) => (t + 1) % 10000), ms);
    return () => window.clearInterval(id);
  }, [calm, ms]);
  return calm ? 0 : tick;
}

/** Counts from 0 to the target on open (0.9 s), then follows changes in 0.28 s. */
function useCountUp(target: number, ms = 900) {
  const calm = useReducedMotion();
  const [n, setN] = useState(target);
  const shown = useRef(target);
  const opened = useRef(false);
  useEffect(() => {
    if (calm !== false) {
      shown.current = target;
      setN(target);
      return;
    }
    const start = opened.current ? shown.current : 0;
    const dur = opened.current ? Math.min(280, ms) : ms;
    opened.current = true;
    const t0 = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      const e = 1 - (1 - t) ** 3;
      const v = Math.round(start + (target - start) * e);
      shown.current = v;
      setN(v);
      if (t < 1) raf = requestAnimationFrame(frame);
      else shown.current = target;
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [target, calm, ms]);
  return n;
}

/** Sample 0–1. Gain (0–1) only changes the regularity amplitude. */
function sample(i: number, mode: TraceMode, gain: number) {
  const amp = 0.25 + Math.max(0, Math.min(1, gain)) * 0.7;
  if (mode === "pulse") {
    const phase = i % 18;
    if (phase === 3) return 0.5 - 0.12 * amp;
    if (phase === 4) return 0.5 + 0.42 * amp;
    if (phase === 5) return 0.5 - 0.55 * amp;
    if (phase === 6) return 0.5 + 0.18 * amp;
    return 0.5 + Math.sin(i / 5) * 0.03;
  }
  if (mode === "wave") return 0.5 + Math.sin((i + amp * 8) / 4.5) * (0.16 + amp * 0.22);
  return 0.5 + Math.sin(i / 9) * 0.16 * (0.4 + amp) + (amp - 0.5) * 0.1;
}

function traceSeries(tick: number, mode: TraceMode, gain: number) {
  const n = 48;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 240;
    const y = 8 + Math.max(0, Math.min(1, sample(i + tick, mode, gain))) * 28;
    pts.push({ x, y });
  }
  return pts;
}

/** Curve draws once, with a leading dot and bars under the line. Then it scrolls. */
function LiveTrace({ tick, mode, gain, label }: { tick: number; mode: TraceMode; gain: number; label: string }) {
  const calm = useReducedMotion();
  const pts = traceSeries(tick, mode, gain);
  const last = pts[pts.length - 1];
  const points = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  return (
    <div className="hud-trace">
      {label ? <span className="hud-trace-lab mono">{label}</span> : null}
      <div className={calm ? "hud-plot" : "hud-plot is-draw"}>
        <svg viewBox="0 0 240 44" preserveAspectRatio="none" aria-hidden="true">
          {pts.map((p, i) => i % 2 === 0 ? (
            <rect key={i} className="hud-bar" x={p.x - 0.8} y={p.y} width={1.6} height={Math.max(0, 40 - p.y)} />
          ) : null)}
          <polyline points={points} />
        </svg>
        <span className="hud-tip" style={{ top: `${(last.y / 44) * 100}%` }} />
      </div>
    </div>
  );
}

/** Session screen: Exercise button, live-tinted 3D body, regularity traces. */
export function MissionHud({ g }: { g: G }) {
  const { tr, lang } = useLang();
  const tick = useTick();
  const ME = useMe();
  const { play } = useSound();
  const session = useExerciseSession();
  const running = session.running;
  const step = session.step;

  const covered = running ? Math.min(BODY_PARTS.length, step + 1) : 0;
  const coveredNow = useCountUp(covered);
  const constancyNow = useCountUp(g.constancy);
  const current = running ? step % BODY_PARTS.length : -1;
  const gain = covered / BODY_PARTS.length;
  const clock = `${Math.floor((step * 3) / 60)}:${String((step * 3) % 60).padStart(2, "0")}`;
  const part = exercisePart(session);
  const focus = exerciseFocus(session);
  const zones = applyExerciseStates(statesFor(ME.light), session);

  const stop = () => {
    stopExercise();
    if (g.markDone("r-ex")) play("badge");
  };

  return (
    <section className="mission-hud" aria-label={tr("Séance d’exercice", "Exercise session")} data-testid="mission-hud">
      <header className="mission-hud-head">
        <span className="mono">{tr("Séance · corps en direct", "Session · live body")}</span>
        <span className="hud-live mono"><i /> {running ? tr("En direct", "Live") : tr("En attente", "Waiting")}</span>
      </header>
      <div className="mission-hud-grid mission-hud-grid--body">
        <div className="mission-hud-traces">
          <LiveTrace tick={tick} mode="pulse" gain={running ? 0.9 : 0.15} label={tr("Rythme", "Pace")} />
          <LiveTrace tick={tick} mode="wave" gain={running ? 0.55 + gain * 0.45 : 0.1} label={tr("Effort", "Effort")} />
          <LiveTrace tick={tick} mode="crew" gain={gain} label={tr("Zones", "Zones")} />
          <ul className="hud-status">
            {BODY_PARTS.map((p, i) => (
              <li key={p.id} className={i < covered ? "is-done" : ""}>
                <span>{partLabel(p.id, p.label, lang)}</span>
                <span className="mono">{i === current ? tr("en cours", "in progress") : i < covered ? tr("sollicitée", "worked") : "—"}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mission-hud-body">
          <p className="hud-readout">
            <b className="mono">{coveredNow}</b>
            <span className="mono">{part ? tr(`${partLabel(part.id, part.label, lang)} · sollicitée`, `${partLabel(part.id, part.label, lang)} · worked`) : tr(`Zones · sur ${BODY_PARTS.length}`, `Zones · of ${BODY_PARTS.length}`)}</span>
          </p>
          <div className="mission-hud-stage">
            <BodyFigure
              states={zones}
              sel={focus || undefined}
              zoom={!!focus}
              need={part ? tr(`Sollicité · ${part.label}`, `Worked · ${part.label}`) : undefined}
              views={false}
            />
          </div>
        </div>
        <div className="mission-hud-dial">
          <HudDial label={tr("Constance", "Constancy")} value={constancyNow} pct={constancyNow / 100} delta={running ? clock : tr("régularité", "regularity")} />
          <button type="button" className="btn btn-primary" data-testid="exercise-btn" onClick={running ? stop : startExercise}>
            <Icon name={running ? "stop" : "fitness_center"} size={16} /> {running ? tr("Terminer", "Finish") : tr("Exercice", "Exercise")}
          </button>
          <p className="mono hud-dial-foot">{g.missions.some((m) => m.id === "r-ex" && m.done) ? tr("Routine du jour cochée", "Today’s routine checked") : tr("Compte pour la régularité", "Counts toward regularity")}</p>
          <p className="r-note hud-note">{tr("Les zones vertes = parties sollicitées. Pas un diagnostic.", "Green zones = parts worked. Not a diagnosis.")}</p>
          <p className="hud-links">
            <Link to="/astronaute/silhouette">{tr("Silhouette", "Silhouette")}</Link>
            <Link to="/astronaute/bien-etre">{tr("Séance 30 min", "30 min session")}</Link>
          </p>
        </div>
      </div>
      <ol className="hud-timeline" aria-hidden="true">
        {BODY_PARTS.map((p, i) => <li key={p.id} className={i === current ? "today" : i < covered ? "ok" : "miss"} />)}
      </ol>
    </section>
  );
}

/** Compact strip for the astronaut home. */
export function GoalsStrip({ g }: { g: G }) {
  const { tr } = useLang();
  const tick = useTick(110);
  const n = g.missions.filter((m) => m.done).length;
  return (
    <Link className="goals-strip" to="/astronaute/objectifs" data-testid="goals-strip">
      <LiveTrace tick={tick} mode="pulse" gain={n / g.missions.length} label="" />
      <span><GameIcon name="gem" size={16} /> {tr("Constance", "Constancy")} <b className="mono">{g.constancy}</b></span>
      <span><GameIcon name="bolt" size={16} /> <b className="mono">{g.xp} XP</b></span>
      <span><GameIcon name="medal" size={16} /> {tr("Niveau", "Level")} <b>{g.grade.current.label}</b></span>
      <span><GameIcon name="flame" size={16} /> {tr("Série", "Streak")} <b className="mono">{g.streak} {tr("j", "d")}</b></span>
      <span><GameIcon name="missions" size={16} /> {tr("Missions", "Missions")} <b className="mono">{n}/{g.missions.length}</b></span>
      <span><GameIcon name="crew" size={16} /> {tr("Équipage", "Crew")} <b className="mono">{g.crew.pct} %</b></span>
      <Icon name="chevron_right" size={16} />
    </Link>
  );
}
