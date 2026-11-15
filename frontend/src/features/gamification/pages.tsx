/* Astronaut pages: /astronaute/objectifs (crew + XP) and /astronaute/reglages.
   Physician card: crew participation (no ranking).
   Desktop bento layout — regularity only (CDC EF-42/43/44), PULSAR tokens. */
import { Navigate } from "react-router";
import { Card, Icon, PageHead as Head, Avatar, Demo } from "@/components/ui";
import { GameIcon } from "./glyphs";
import { useMe } from "@/features/auth/useMe";
import { SoundSettingsPanel } from "@/features/sound";
import { useGamification, useCrewGamificationSnapshot } from "./store";
import { palierFor } from "./data";
import { localizePalier, useLang } from "@/i18n";
import { BadgesCard, CrewGoalBar, EthicsNote, MissionHud, MissionsCard, RegularityTiles, StreakCard } from "./components";

export function AstroGoals() {
  const { tr, lang } = useLang();
  const ME = useMe();
  const g = useGamification(ME.id);
  const crew = useCrewGamificationSnapshot();
  if (!g.enabled) return <Navigate to="/astronaute/reglages" replace state={{ gamifOff: true }} />;

  const first = ME.name.split(" ")[0];
  const palier = localizePalier(palierFor(crew.goal.pct), lang);

  return (
    <>
      <Head
        title={tr("Objectifs", "Goals")}
        sub={tr("Missions du jour, insignes spatiaux et niveau de constance. Le palier d’équipage est commun.", "Today’s missions, space badges and constancy level. The crew tier is shared.")}
        aside={<span className="xp-chip"><GameIcon name="bolt" size={16} /> {g.xp} XP</span>}
      />

      <MissionHud g={g} />

      <section className="goals-welcome" aria-label={tr("Bienvenue", "Welcome")}>
        <div className="goals-welcome__text">
          <h2>{tr("Bonjour", "Hello")}, {first}</h2>
          <p className="r-note">{tr("Suivez vos défis de mesure et de routine. La cagnotte XP sert l’objectif commun de l’équipage.", "Follow your measurement and routine challenges. The XP pool serves the crew’s shared goal.")} <Demo /></p>
        </div>
        <ul className="goals-welcome__widgets">
          <li className="gw-profile">
            <Avatar id={ME.id} />
            <div>
              <strong>{ME.name}</strong>
              <span className="mono">{ME.cabin}</span>
            </div>
          </li>
          <li className="gw-chip">
            <GameIcon name="medal" size={16} />
            <span>{tr("Niveau", "Level")} <b>{g.grade.current.label}</b></span>
          </li>
          <li className="gw-chip">
            <GameIcon name="flame" size={16} />
            <span>{tr("Série", "Streak")} <b className="mono">{g.streak} {tr("j", "d")}</b></span>
          </li>
          <li className="gw-chip">
            <GameIcon name="crew" size={16} />
            <span>{tr("Équipage", "Crew")} <b className="mono">{crew.goal.pct} %</b></span>
          </li>
        </ul>
      </section>

      <div className="goals-bento">
        <StreakCard g={g} className="goals-bento__streak" />
        <RegularityTiles g={g} />
        <MissionsCard g={g} className="goals-bento__challenges" />
        <BadgesCard g={g} className="goals-bento__badges" />

        <section className="crew-xp-board goals-bento__crew" aria-label={tr("Équipage", "Crew")}>
          <div className="crew-xp-head">
            <div>
              <h2>{tr("Tous ensemble", "All together")}</h2>
              <p className="r-note">{tr("Palier commun", "Shared tier")} <b>{palier.label}</b> — {palier.detail} {tr("Ordre des cabines : le niveau se lit, il ne trie personne.", "Cabin order: the level is read, it ranks nobody.")} <Demo /></p>
            </div>
            <div className="crew-pool">
              <span>{tr("Cagnotte équipage", "Crew pool")}</span>
              <strong className="mono">{crew.poolXp}</strong>
              <small>{tr("XP · régularité", "XP · regularity")}</small>
            </div>
          </div>
          <p className="goal-line"><b className="mono">{crew.goal.pct} %</b> {tr("des mesures du jour", "of today’s measurements")} <span className="muted mono">({crew.goal.done}/{crew.goal.total})</span></p>
          <CrewGoalBar pct={crew.goal.pct} />
          <ul className="crew-xp-list">
            {crew.members.map((m) => (
              <li key={m.id} className={m.id === ME.id ? "is-me" : undefined}>
                <Avatar id={m.id} />
                <div>
                  <strong>{m.name}{m.id === ME.id ? tr(" · vous", " · you") : ""}</strong>
                  <span>{m.cabin} · {tr("niveau", "level")} {m.grade}</span>
                </div>
                <div className="crew-xp-meta">
                  <b className="mono">{m.xp} XP</b>
                  <span className="mono">{m.done}/{m.total} {tr("mesures", "readings")}</span>
                </div>
                {m.done === m.total ? <Icon name="check_circle" size={18} /> : <span className="chip">{tr("En cours", "In progress")}</span>}
              </li>
            ))}
          </ul>
        </section>
      </div>
      <EthicsNote />
    </>
  );
}

export function Switch({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; id: string }) {
  return (
    <button id={id} type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)}>
      <i />
    </button>
  );
}

export function AstroSettings() {
  const { tr } = useLang();
  const ME = useMe();
  const g = useGamification(ME.id);
  return (
    <>
      <Head title={tr("Réglages", "Settings")} />
      <Card title="Gamification" glyph={<GameIcon name="medal" />}>
        <div className="setting">
          <div><label htmlFor="gamif-switch"><b>{tr("Séries, XP, badges et objectifs d’équipage", "Streaks, XP, badges and crew goals")}</b></label>
            <p className="r-note">{tr("Basés uniquement sur la régularité. Désactivée : Objectifs, bandeau et complication montre disparaissent.", "Based only on regularity. Off: Goals, the banner and the watch complication disappear.")}</p></div>
          <Switch id="gamif-switch" checked={g.enabled} onChange={g.setEnabled} label="Gamification" />
        </div>
        <p className="mono small" aria-live="polite">{g.enabled ? tr("Activée", "On") : tr("Désactivée", "Off")}</p>
      </Card>
      <Card title={tr("Confidentialité", "Privacy")} icon="lock">
        <p className="r-note">{tr("Vos valeurs de santé ne sont visibles que par vous, le médecin de bord et la NASA. Jamais comparées.", "Your health values are visible only to you, the crew surgeon and NASA. Never compared.")}</p>
      </Card>
      <Card title={tr("Son", "Sound")} icon="volume_up">
        <p className="r-note">{tr("Alarmes dans l’app (bandeau). Pause rouge 2 min seulement après lecture.", "Alarms in the app (banner). A 2 min red pause only after the alarm is seen.")}</p>
        <SoundSettingsPanel />
      </Card>
    </>
  );
}

/** Crew surgeon: crew participation + XP (no ranking). */
export function CrewParticipationCard() {
  const { tr, lang } = useLang();
  const { goal, members, poolXp } = useCrewGamificationSnapshot();
  const palier = localizePalier(palierFor(goal.pct), lang);
  return (
    <Card title={tr("Objectif d’équipage · participation", "Crew goal · participation")} glyph={<GameIcon name="crew" />}>
      <p className="goal-line"><b className="mono">{goal.pct} %</b> {tr("des mesures", "of readings")} · {tr("palier", "tier")} <b>{palier.label}</b> · {tr("cagnotte", "pool")} <b className="mono">{poolXp} XP</b></p>
      <CrewGoalBar pct={goal.pct} />
      <ul className="participation">
        {members.map((m) => (
          <li key={m.id}>
            <Avatar id={m.id} />
            <span>{m.name}</span>
            <span className="mono">{m.done}/{m.total}</span>
            <span className="mono">{m.xp} XP</span>
            {m.done === m.total ? <Icon name="check_circle" size={16} /> : <span className="muted small">{tr("en cours", "in progress")}</span>}
          </li>
        ))}
      </ul>
      <p className="r-note">{tr("Ordre fixe (cabines). Participation et XP de régularité uniquement (CDC EF-43, EF-44).", "Fixed order (cabins). Participation and regularity XP only (CDC EF-43, EF-44).")}</p>
    </Card>
  );
}
