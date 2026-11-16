/* Astronaut — personal tablet (cabin). Figma mockups: page « Astronaute » (1:3), screens A01–A14.
   The astronaut sees ONLY their own data: `useMe()` returns the crew member of the signed-in user. */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Icon, type IconName, Emblem, Demo, Card, Lamp, PageHead as Head, WorkflowBadge, HudDial, CrewPhotoButton } from "@/components/ui";
import { notifyBackend, notifyOk } from "@/components/ui/noticeStore";
import { pushBoard } from "@/features/board/localLog";
import { BodyFigure, statesFor, useZoneZoom } from "@/components/body3d";
import { ClinicAssist, CareTimeline, StatusDonut, ZoneInsights } from "@/components/clinic";
import { useTelemetry } from "@/api";
import { FaceScan } from "./FaceScan";
import { RateScale } from "./RateScale";
import { parseSleepHours } from "./scanSim";
import { Watch6 } from "@/features/montre/Watch6";
import { WatchSection } from "@/features/montre/WatchGate";
import { PcFingerprint } from "@/features/montre/PcFingerprint";
import { buzzEspFort } from "@/features/sound/hardwareBuzzer";
import { useMe } from "@/features/auth/useMe";
import { useGamification, GoalsStrip } from "@/features/gamification";
import { applyExerciseStates, exerciseFocus, exercisePart, partLabel, startExercise, stopExercise, useExerciseSession } from "@/features/gamification/exercise";
import { useSound } from "@/features/sound";
import { GameIcon } from "@/features/gamification/glyphs";
import { LiveVitalsChart, RadiationChart } from "@/components/charts";
import { DataTag } from "@/app/DataSource";
import { SpaceWeatherCard } from "@/features/reference/SpaceWeather";
import { ConductorProvider, TimeConductor } from "@/components/telemetry";
import type { Go } from "@/app/types";
import { bpLights, glucoseLight, heartRateLight, moodLight, sleepLight, spo2Light, temperatureLight, THRESHOLDS as TH } from "@/data/thresholds";
import { useLang } from "@/i18n";

/** Home A01 — clinical SaaS telemetry: vitals + 3D body + guidance + timeline + regularity donut. */
export function AstroHome({ go }: { go: Go }) {
  const { t, tr, lang } = useLang();
  const ME = useMe();
  const gamif = useGamification(ME.id);
  const tel = useTelemetry(ME.id, { limit: 24, intervalMs: 2000 });
  const last = tel.data?.[tel.data.length - 1];
  const hr = last?.heartRate ?? ME.hr;
  const spo2 = last ? Math.round(last.spo2) : ME.spo2;
  const hrLight = heartRateLight(hr);
  const spo2State = spo2Light(spo2);
  const sleepH = parseSleepHours(ME.sleep);
  const sleepState = sleepLight(sleepH);
  const sys = Number(ME.bp.split("/")[0]) || 120;
  const bpState = bpLights(sys, Number(ME.bp.split("/")[1]) || 80);
  const cautionHr = hrLight !== "ok";
  const session = useExerciseSession();
  const liveZone = exerciseFocus(session);
  const livePart = exercisePart(session);
  const zones = applyExerciseStates(statesFor(ME.light), session);
  const body = useZoneZoom(zones, liveZone || (cautionHr ? "heart" : ""), liveZone || (cautionHr ? "heart" : ""));
  const done = gamif.enabled ? Math.min(3, 1 + (gamif.streak > 0 ? 1 : 0) + (cautionHr ? 0 : 1)) : 2;
  const left = 3 - done;

  return (
    <div className="a01 a01--clinic a01--saas">
      <section className="ops-board" aria-label={tr("Tableau de bord personnel", "Personal dashboard")}>
        <header className="ops-head">
          <h1>{t.dash.astro}</h1>
          <div className="ops-head-side">
            <Lamp l={ME.light} />
            <CrewPhotoButton crewId={ME.id} compact />
          </div>
        </header>

        {cautionHr && (
          <aside className="a01-alert" role="status">
            <Lamp l="caution" />
            <div>
              <p><strong>{tr("1 point d’attention", "1 point of caution")}</strong> — {tr("pouls de repos", "resting pulse")} {hr} bpm</p>
              <p className="r-note">{tr("En hausse depuis 3 jours. Le médecin de bord est informé.", "Rising for 3 days. The crew surgeon is informed.")} <Demo /></p>
            </div>
            <button type="button" className="btn btn-ghost sm" onClick={() => go("/astronaute/silhouette")}>{tr("Pourquoi ?", "Why?")}</button>
          </aside>
        )}

        {gamif.enabled && <GoalsStrip g={gamif} />}

        <div className="ops-split a01-dial-row" aria-label={tr("Constantes", "Vitals")}>
          <HudDial label={tr("Pouls", "Pulse")} value={hr} unit="bpm" pct={hr / 130} light={hrLight} delta={cautionHr ? (lang === "en" ? "+12 / 3 d" : "+12 / 3 j") : tr("stable", "stable")} onSelect={() => go("/astronaute/silhouette")} />
          <HudDial label="SpO₂" value={spo2} unit="%" pct={spo2 / 100} light={spo2State} delta={spo2State === "ok" ? tr("nominal", "nominal") : tr("bas", "low")} onSelect={() => go("/astronaute/silhouette")} />
          <HudDial label={tr("Temp.", "Temp.")} value={ME.temp} unit="°C" pct={0.55} light="ok" delta={tr("nominal", "nominal")} onSelect={() => go("/astronaute/kits")} />
          <HudDial label={tr("Tension", "Pressure")} value={ME.bp} unit="mmHg" pct={sys / 180} light={bpState} delta={bpState === "ok" ? "ok" : tr("élevée", "high")} onSelect={() => go("/astronaute/kits")} />
          <HudDial label={tr("Sommeil", "Sleep")} value={ME.sleep} pct={sleepH / 9} light={sleepState} delta={sleepState === "ok" ? "ok" : tr("court", "short")} onSelect={() => go("/astronaute/bien-etre")} />
        </div>

        <div className="ops-split a01-ops-main">
          <section className="a01-figure" aria-labelledby="a01-sil">
            <header className="a01-card-h">
              <h2 id="a01-sil"><Icon name="accessibility_new" size={18} /> {tr("Corps", "Body")}</h2>
              {livePart ? <span className="mono small">{tr("Séance", "Session")} · {partLabel(livePart.id, livePart.label, lang)}</span> : <Demo />}
            </header>
            <div className="a01-figure-stage">
              <BodyFigure states={zones} sel={body.sel} onPick={body.pick} zoom={body.zoom} need={body.need} views={false} />
            </div>
            <div className="btn-row a01-figure-actions">
              {gamif.enabled && (
                <button
                  type="button"
                  className="btn btn-primary sm"
                  data-testid="home-exercise-btn"
                  onClick={() => (session.running ? stopExercise() : (startExercise(), go("/astronaute/objectifs")))}
                >
                  <Icon name={session.running ? "stop" : "fitness_center"} size={16} />
                  {session.running ? tr("Terminer", "Stop") : tr("Exercice", "Exercise")}
                </button>
              )}
              <button type="button" className="btn btn-secondary sm" onClick={() => go("/astronaute/silhouette")}>
                <Icon name="accessibility_new" size={16} /> {tr("Silhouette", "Silhouette")}
              </button>
              <button type="button" className="btn btn-ghost sm" onClick={() => go("/astronaute/bien-etre")}>
                <Icon name="spa" size={16} /> {tr("Bien-être", "Wellbeing")}
              </button>
            </div>
          </section>

          <ClinicAssist
            title={tr("Aide clinique", "Clinical assist")}
            onOpen={() => go("/astronaute/predictions")}
            items={[
              ...(cautionHr ? [{
                id: "hr",
                light: "caution" as const,
                title: tr("Pouls de repos en hausse", "Resting pulse rising"),
                detail: tr(`${hr} bpm · tendance 3 jours. Le médecin de bord est informé.`, `${hr} bpm · 3-day trend. The crew surgeon is informed.`),
                meta: tr("Règle seuil · DÉMO", "Threshold rule · DEMO"),
              }] : [{
                id: "ok",
                light: "ok" as const,
                title: tr("Constantes dans les plages", "Vitals within range"),
                detail: tr("Aucune dérive majeure détectée sur la fenêtre cabine.", "No major drift on the cabin window."),
                meta: tr("Surveillance passive", "Passive watch"),
              }]),
              {
                id: "sleep",
                light: sleepState,
                title: sleepState === "ok" ? tr("Sommeil nominal", "Sleep nominal") : tr("Sommeil court", "Short sleep"),
                detail: tr(`${ME.sleep} · indicatif CDC ≥ 7 h · attention sous ${TH.sleep.orange} h.`, `${ME.sleep} · CDC guide ≥ 7 h · caution under ${TH.sleep.orange} h.`),
                meta: tr("Routine bien-être", "Wellbeing routine"),
              },
            ]}
          />
          <section className="a01-card" aria-labelledby="a01-todo">
            <header className="a01-card-h">
              <h2 id="a01-todo"><Icon name="checklist" size={18} /> {tr("À faire", "To do")}</h2>
            </header>
            <ul className="a01-todo">
              <li>
                <span className="a01-task">
                  <Icon name="bloodtype" size={18} />
                  <span><strong>{tr("Glycémie à jeun", "Fasting glucose")}</strong><span className="mono">{tr("Aujourd’hui", "Today")}</span></span>
                </span>
                <button type="button" className="btn btn-primary sm" onClick={() => go("/astronaute/kits")}>{tr("Mesurer", "Measure")}</button>
              </li>
              <li>
                <span className="a01-task">
                  <Icon name="face" size={18} />
                  <span><strong>{tr("Scan fatigue", "Fatigue scan")}</strong><span className="mono">{tr("Caméra", "Camera")}</span></span>
                </span>
                <button type="button" className="btn btn-secondary sm" onClick={() => go("/astronaute/scan")}>{tr("Scanner", "Scan")}</button>
              </li>
              <li className="is-done">
                <span className="a01-task">
                  <Icon name="blood_pressure" size={18} />
                  <span><strong>{tr("Tension", "Pressure")}</strong><span className="mono">{ME.bp}</span></span>
                </span>
                <span className="a01-done"><Icon name="check_circle" size={18} /> {tr("Fait", "Done")}</span>
              </li>
            </ul>
          </section>
        </div>

        <div className="a01-zones">
          <ZoneInsights states={zones} onPick={body.pick} />
        </div>

        <div className="ops-split a01-ops-foot">
          <CareTimeline
            steps={[
              { id: "t1", time: "07:50", title: tr("Tension", "Pressure"), detail: ME.bp, done: true, icon: "blood_pressure" },
              { id: "t2", time: "09:00", title: tr("Glycémie à jeun", "Fasting glucose"), detail: tr("Kit · en attente", "Kit · waiting"), icon: "bloodtype" },
              { id: "t3", time: "10:30", title: tr("Scan fatigue", "Fatigue scan"), detail: tr("Caméra tablette", "Tablet camera"), icon: "face" },
              { id: "t4", time: "14:00", title: tr("Respiration 4-4", "4-4 breathing"), detail: "~5 min", icon: "self_improvement", light: cautionHr ? "caution" : "ok" },
            ]}
          />
          <StatusDonut
            title={tr("Régularité du jour", "Today’s regularity")}
            center={`${done}/3`}
            slices={[
              { id: "done", label: tr("Fait", "Done"), value: done, color: "var(--ok)" },
              { id: "left", label: tr("Reste", "Left"), value: Math.max(0, left), color: "var(--line-strong)" },
            ]}
          />
          <section className="a01-live" aria-label={tr("Courbe live", "Live chart")}>
            <header className="a01-card-h">
              <h2><Icon name="monitoring" size={18} /> {tr("FC · SpO₂ live", "HR · SpO₂ live")}</h2>
              <DataTag />
            </header>
            <ConductorProvider>
              <LiveVitalsChart astronautId={ME.id} height={112} />
            </ConductorProvider>
            <div className="btn-row">
              <button type="button" className="btn btn-secondary sm" onClick={() => go("/astronaute/montre")}><Icon name="watch" size={16} /> {tr("Montre", "Watch")}</button>
              <button type="button" className="btn btn-primary sm" onClick={() => go("/astronaute/bien-etre")}><Icon name="play_arrow" size={16} /> {tr("Bien-être", "Wellbeing")}</button>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

export { AstroBody } from "./SilhouetteBoard";
export function AstroScan({ go }: { go: Go }) {
  const ME = useMe();
  const { tr } = useLang();
  return (
    <div className="scan-page">
      <Head title={tr("Scan visage", "Face scan")} />
      <aside className="resp-block" aria-label={tr("Responsabilité", "Responsibility")}>
        <div className="resp-block-top">
          <h3>{tr("Responsabilité", "Responsibility")}</h3>
          <WorkflowBadge status="nouveau" assignee="CMO-001" />
        </div>
        <dl className="resp-grid">
          <div><dt>{tr("Réalisé par", "Done by")}</dt><dd>{ME.name} · {ME.id}</dd></div>
          <div><dt>{tr("Destinataire", "Recipient")}</dt><dd>{tr("Médecin de bord (CMO-001)", "Crew surgeon (CMO-001)")}</dd></div>
          <div><dt>{tr("Transmission", "Transmission")}</dt><dd>{tr("Après validation", "After validation")}</dd></div>
          <div><dt>{tr("Confidentialité", "Confidentiality")}</dt><dd>{tr("Équipage médical uniquement · image non enregistrée", "Medical crew only · image not stored")}</dd></div>
        </dl>
        <p className="r-note">{tr("Le médecin de bord accuse réception et peut escalader vers le sol (NASA).", "The crew surgeon acknowledges and can escalate to the ground (NASA).")} <Demo /></p>
      </aside>
      <FaceScan name={ME.name} crewId={ME.id} sleep={ME.sleep} go={go} />
    </div>
  );
}
export function AstroKits() {
  const { tr } = useLang();
  const ME = useMe();
  const gami = useGamification(ME.id);
  const { play } = useSound();
  const [glu, setGlu] = useState("92");
  const [meal, setMeal] = useState<"jeun" | "repas">("jeun");
  const [sys, setSys] = useState(128);
  const [dia, setDia] = useState(82);
  const record = (mission: string, text: string, light: "ok" | "caution" | "warning") => {
    pushBoard({ who: ME.id, text, light });
    const fresh = gami.enabled && gami.markDone(mission);
    play("ack");
    notifyOk(tr("Mesure enregistrée", "Measurement saved"), fresh ? tr("Notée dans le journal médical. Régularité du jour mise à jour.", "Noted in the medical log. Today’s regularity updated.") : tr("Notée dans le journal médical de cet appareil.", "Noted in this device’s medical log."));
  };
  const g = Number(glu);
  const fasting = meal === "jeun";
  const gluBand = fasting ? TH.glucose_fasting : TH.glucose_post;
  const gluHigh = gluBand.rougeHigh;
  const gluCaution = gluBand.orangeHigh;
  const gluWord = !g ? tr("Saisissez la valeur affichée sur le lecteur.", "Enter the value shown on the reader.")
    : g < gluBand.rougeLow ? tr("Très basse — 15 g de sucre, prévenez le médecin de bord.", "Very low — 15 g of sugar, tell the crew surgeon.")
    : g < gluBand.orangeLow ? tr("Basse — 15 g de sucre, remesurez dans 15 min. Le médecin de bord est prévenu.", "Low — 15 g of sugar, remeasure in 15 min. The crew surgeon is informed.")
    : g > gluHigh ? tr("Haute — remesurez, puis prévenez le médecin de bord.", "High — remeasure, then tell the crew surgeon.")
    : g > gluCaution ? (fasting ? tr("Au-dessus de la plage à jeun (70–99). Remesurez. Le médecin de bord est prévenu.", "Above the fasting range (70–99). Remeasure. The crew surgeon is informed.") : tr("Au-dessus de la plage après repas (70–140). Remesurez. Le médecin de bord est prévenu.", "Above the after-meal range (70–140). Remeasure. The crew surgeon is informed."))
    : fasting ? tr("Dans la plage à jeun (70–99). Routine habituelle.", "Within the fasting range (70–99). Usual routine.") : tr("Dans la plage après repas (70–140). Routine habituelle.", "Within the after-meal range (70–140). Usual routine.");
  const gluLight = glucoseLight(g, meal);
  const bpLight = bpLights(sys, dia);
  const bpWord = bpLight === "warning" ? tr("Tension haute — reposez-vous, puis prévenez le médecin.", "High pressure — rest, then tell the surgeon.")
    : bpLight === "caution" ? tr("Au-dessus de votre plage cabine.", "Above your cabin range.")
    : tr("Dans la plage cabine.", "Within the cabin range.");
  return (
    <>
      <Head title={tr("Mesures guidées", "Guided measurements")} sub={tr("Un kit = une carte. Lisez la valeur, enregistrez, c’est transmis au médecin de bord.", "One kit = one card. Read the value, save it, and it goes to the crew surgeon.")} />
      <aside className="resp-block" aria-label={tr("Responsabilité", "Responsibility")}>
        <div className="resp-block-top">
          <h3>{tr("Responsabilité", "Responsibility")}</h3>
          <WorkflowBadge status="nouveau" assignee="CMO-001" />
        </div>
        <dl className="resp-grid">
          <div><dt>{tr("Opérateur", "Operator")}</dt><dd>{tr("Astronaute connecté", "Signed-in astronaut")}</dd></div>
          <div><dt>{tr("Revue", "Review")}</dt><dd>{tr("Médecin de bord", "Crew surgeon")}</dd></div>
          <div><dt>{tr("Dossier", "Record")}</dt><dd>{tr("Journal + prochain rapport sol", "Log + next ground report")}</dd></div>
        </dl>
      </aside>
      <div className="kit-board">
        <article className="kit-card">
          <header className="kit-card-head">
            <span className="kit-ico tone-accent"><Icon name="bloodtype" size={24} /></span>
            <div>
              <h2>{tr("Glycémie", "Glucose")}</h2>
              <p>{tr("Lecteur · à jeun ou après repas", "Reader · fasting or after a meal")}</p>
            </div>
            <Demo />
          </header>
          <div className="kit-readout">
            <label className="kit-value">
              <span>{tr("Valeur", "Value")}</span>
              <input inputMode="numeric" value={glu} onChange={(e) => setGlu(e.target.value.replace(/\D/g, ""))} aria-label={tr("Glycémie en mg/dL", "Glucose in mg/dL")} />
              <small>mg/dL</small>
            </label>
            <p className="kit-status">
              {gluLight !== "ok" && <Lamp l={gluLight} compact />} {gluWord}
            </p>
            {!!g && <RateScale label={tr("Glycémie", "Glucose")} value={g} unit="mg/dL" min={40} max={220} caution={gluCaution} high={gluHigh} />}
          </div>
          <div className="kit-actions">
            <div className="dash-tabs" role="radiogroup" aria-label={tr("Moment", "Timing")}>
              <button type="button" role="radio" aria-checked={meal === "jeun"} onClick={() => setMeal("jeun")}>{tr("À jeun", "Fasting")}</button>
              <button type="button" role="radio" aria-checked={meal === "repas"} onClick={() => setMeal("repas")}>{tr("Après repas", "After meal")}</button>
            </div>
            <button type="button" className="btn btn-primary" disabled={!g} onClick={() => record("m-glu", `${tr("Glycémie", "Glucose")} ${g} mg/dL (${meal === "jeun" ? tr("à jeun", "fasting") : tr("après repas", "after meal")})`, gluLight === "ok" ? "ok" : gluLight === "warning" ? "warning" : "caution")}>{tr("Enregistrer", "Save")}{gami.enabled ? " (+25 XP)" : ""}</button>
          </div>
        </article>

        <article className="kit-card">
          <header className="kit-card-head">
            <span className="kit-ico tone-ok"><Icon name="blood_pressure" size={24} /></span>
            <div>
              <h2>{tr("Tension", "Blood pressure")}</h2>
              <p>{tr("Tensiomètre · saisie", "Cuff · manual entry")}</p>
            </div>
            <Demo />
          </header>
          <div className="kit-readout kit-bp-manual">
            <label className="kit-value"><span>{tr("Systolique", "Systolic")}</span><input inputMode="numeric" value={String(sys)} onChange={(e) => setSys(Number(e.target.value.replace(/\D/g, "")) || 0)} aria-label={tr("Systolique en mmHg", "Systolic in mmHg")} /><small>mmHg</small></label>
            <label className="kit-value"><span>{tr("Diastolique", "Diastolic")}</span><input inputMode="numeric" value={String(dia)} onChange={(e) => setDia(Number(e.target.value.replace(/\D/g, "")) || 0)} aria-label={tr("Diastolique en mmHg", "Diastolic in mmHg")} /><small>mmHg</small></label>
          </div>
          <p className="kit-status">{bpLight !== "ok" && <Lamp l={bpLight} compact />} {bpWord}</p>
          <RateScale label={tr("Systolique", "Systolic")} value={sys} unit="mmHg" min={80} max={180} caution={TH.bp_systolic.orange} high={TH.bp_systolic.rouge} />
          <ol className="kit-steps">
            <li><b>1</b> {tr("Assis, bras à hauteur du cœur, 5 min de repos", "Seated, arm at heart height, 5 min of rest")}</li>
            <li><b>2</b> {tr("Brassard 2 cm au-dessus du coude", "Cuff 2 cm above the elbow")}</li>
            <li><b>3</b> {tr("Ne parlez pas pendant la mesure", "Do not talk during the measurement")}</li>
          </ol>
          <button type="button" className="btn btn-primary" disabled={!sys || !dia} onClick={() => record("m-bp", `${tr("Tension", "Blood pressure")} ${sys}/${dia} mmHg · ${tr("saisie", "entry")}`, bpLight)}>{tr("Enregistrer la tension", "Save blood pressure")}</button>
        </article>

        <TempMoodCards record={record} />
      </div>
    </>
  );
}
function TempMoodCards({ record }: { record: (mission: string, text: string, light: "ok" | "caution" | "warning") => void }) {
  const { tr } = useLang();
  const [temp, setTemp] = useState("36.7");
  const [mood, setMood] = useState(4);
  const c = Number(temp.replace(",", "."));
  const tempState = temperatureLight(c);
  const moodState = moodLight(mood);
  const tempWord = !Number.isFinite(c) || c <= 0
    ? tr("Saisissez la température en °C.", "Enter the temperature in °C.")
    : tempState === "warning" && c >= TH.temperature.rougeHigh
      ? tr("Fièvre — prise en charge par le médecin de bord, tout de suite.", "Fever — the crew surgeon takes over, right now.")
      : tempState === "warning"
        ? tr("Température très basse — prévenir le médecin de bord, tout de suite.", "Very low temperature — tell the crew surgeon right now.")
        : tempState === "caution"
          ? tr("Hors plage 36,1–37,2 °C. Remesurez. L’astronaute et le médecin de bord sont prévenus.", "Outside 36.1–37.2 °C. Remeasure. The astronaut and the crew surgeon are informed.")
          : tr("Dans la plage indicative (36,1–37,2 °C). Continuer la routine.", "Within the guide range (36.1–37.2 °C). Continue the routine.");
  const moodWord = moodState === "warning"
    ? tr("Humeur à 1 — prévenir le médecin de bord maintenant.", "Mood at 1 — tell the crew surgeon now.")
    : moodState === "caution"
      ? tr("Humeur basse. Notez-la. Si cela dure, le médecin de bord fait le point.", "Low mood. Note it. If it lasts, the crew surgeon will review.")
      : tr("Humeur dans votre plage habituelle. Continuer la routine.", "Mood in your usual range. Continue the routine.");
  return (
    <>
      <article className="kit-card">
        <header className="kit-card-head">
          <span className="kit-ico tone-ok"><Icon name="thermometer" size={24} /></span>
          <div>
            <h2>{tr("Température", "Temperature")}</h2>
            <p>{tr("Thermomètre · saisie", "Thermometer · entry")}</p>
          </div>
          <Demo />
        </header>
        <div className="kit-readout">
          <label className="kit-value">
            <span>{tr("Valeur", "Value")}</span>
            <input inputMode="decimal" value={temp} onChange={(e) => setTemp(e.target.value.replace(/[^\d.,]/g, ""))} aria-label={tr("Température en degrés Celsius", "Temperature in degrees Celsius")} />
            <small>°C</small>
          </label>
          <p className="kit-status"><Lamp l={tempState} /> {tempWord}</p>
          {Number.isFinite(c) && c > 0 && (
            <RateScale label={tr("Température", "Temperature")} value={c} unit="°C" min={34} max={40} caution={TH.temperature.orangeHigh} high={TH.temperature.rougeHigh} />
          )}
        </div>
        <button type="button" className="btn btn-primary" disabled={!Number.isFinite(c) || c <= 0} onClick={() => record("m-temp", `${tr("Température", "Temperature")} ${c.toFixed(1)} °C`, tempState)}>{tr("Enregistrer la température", "Save temperature")}</button>
      </article>
      <article className="kit-card">
        <header className="kit-card-head">
          <span className="kit-ico tone-accent"><Icon name="mood" size={24} /></span>
          <div>
            <h2>{tr("Humeur", "Mood")}</h2>
            <p>{tr("Échelle de 1 à 5 · pas de norme médicale", "Scale from 1 to 5 · not a medical standard")}</p>
          </div>
          <Demo />
        </header>
        <div className="dash-tabs" role="radiogroup" aria-label={tr("Humeur du jour, de 1 à 5", "Today’s mood, from 1 to 5")}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={mood === n} onClick={() => setMood(n)}>{n}</button>
          ))}
        </div>
        <p className="kit-status"><Lamp l={moodState} /> {moodWord}</p>
        <p className="r-note">{tr("1 très basse · 5 très bonne. Comparée à vos jours habituels.", "1 very low · 5 very good. Compared with your usual days.")} <Demo /></p>
        <button type="button" className="btn btn-primary" onClick={() => record("m-mood", `${tr("Humeur", "Mood")} ${mood}/5`, moodState)}>{tr("Enregistrer l’humeur", "Save mood")}</button>
      </article>
    </>
  );
}

const WELL_ITEMS: { icon: IconName; title: string; time: string; why: string; kind: "breath" | "sleep" | "ared" | "mind" | "call"; seconds?: number; mission?: string }[] = [
  { icon: "air", title: "Respiration 4-4", time: "5 min", why: "Calme le pouls avant le sommeil", kind: "breath", seconds: 5 * 60, mission: "r-breath" },
  { icon: "bedtime", title: "Routine de sommeil", time: "10 min", why: "Lumière ambrée, écran éteint 30 min avant", kind: "sleep", seconds: 10 * 60 },
  { icon: "fitness_center", title: "Résistance (ARED)", time: "30 min", why: "Protège os et muscles en microgravité", kind: "ared", seconds: 30 * 60, mission: "r-ex" },
  { icon: "groups", title: "Appel famille", time: "Fenêtre 13:50", why: "Isolement et confinement", kind: "call" },
  { icon: "spa", title: "Pleine conscience", time: "8 min", why: "Humeur et concentration", kind: "mind", seconds: 8 * 60 },
];

export function AstroWellbeing() {
  const { tr, lang } = useLang();
  const ME = useMe();
  const gami = useGamification(ME.id);
  const { play } = useSound();
  const [run, setRun] = useState<{ id: string; title: string; left: number; total: number; mission?: string; breath?: boolean } | null>(null);

  const ended = useRef(false);
  useEffect(() => { ended.current = false; }, [run?.id]);
  useEffect(() => {
    if (!run || run.left <= 0) return;
    const id = window.setInterval(() => setRun((r) => (r ? { ...r, left: r.left - 1 } : r)), 1000);
    return () => window.clearInterval(id);
  }, [run?.id]);

  const finish = (done: boolean) => {
    if (!run || ended.current) return;
    ended.current = true;
    const mission = run.mission;
    const title = run.title;
    const wasAred = run.id === "ared";
    setRun(null);
    if (wasAred) stopExercise();
    if (!done && run.left > 0) return;
    const fresh = !!mission && gami.enabled && gami.markDone(mission);
    if (fresh) play("badge");
    notifyOk(tr("Séance terminée", "Session finished"), fresh ? tr(`${title} — routine cochée pour la régularité du jour.`, `${title} — routine checked for today’s regularity.`) : tr(`${title} — notée sur cet appareil.`, `${title} — noted on this device.`));
    pushBoard({ who: ME.id, light: "ok", text: `${tr("Bien-être", "Wellbeing")} · ${title} · ${tr("séance terminée", "session finished")}` });
  };

  useEffect(() => {
    if (run && run.left <= 0) finish(true);
  }, [run?.left]);

  const shown = (item: (typeof WELL_ITEMS)[number]) => {
    if (lang !== "en") return item;
    const en: Record<string, [string, string, string]> = {
      breath: ["4-4 breathing", "5 min", "Calms the pulse before sleep"],
      sleep: ["Sleep routine", "10 min", "Amber light, screen off 30 min before"],
      ared: ["Resistance (ARED)", "30 min", "Protects bone and muscle in microgravity"],
      call: ["Family call", "Window 13:50", "Isolation and confinement"],
      mind: ["Mindfulness", "8 min", "Mood and focus"],
    };
    const [title, time, why] = en[item.kind];
    return { ...item, title, time, why };
  };
  const start = (item: (typeof WELL_ITEMS)[number]) => {
    const view = shown(item);
    if (item.kind === "call") {
      notifyBackend(tr("Appel famille (liaison vers la Terre)", "Family call (link to Earth)"));
      return;
    }
    if (item.kind === "ared") startExercise();
    setRun({ id: item.kind, title: view.title, left: item.seconds ?? 60, total: item.seconds ?? 60, mission: item.mission, breath: item.kind === "breath" });
  };

  const phaseIn = run?.breath ? Math.floor((run.total - run.left) / 4) % 2 === 0 : true;
  const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <>
      <Head title={tr("Vos exercices du jour", "Today’s exercises")} sub={tr("Choisis selon votre sommeil, votre humeur et votre planning.", "Choose according to your sleep, your mood and your schedule.")} />
      <div className="well-hero r-card">
        <div className={`breath-dot${run?.breath ? (phaseIn ? " is-in" : " is-out") : ""}`} aria-hidden="true"><Icon name={run ? "air" : "air"} size={36} /></div>
        {run ? (
          <div>
            <h2>{run.title}</h2>
            <p className="session-time" aria-live="polite">{clock(Math.max(0, run.left))}</p>
            <p>{run.breath ? (phaseIn ? tr("Inspirez · 4 s", "Inhale · 4 s") : tr("Expirez · 4 s", "Exhale · 4 s")) : tr("La séance tourne sur cet appareil.", "The session is running on this device.")}</p>
          </div>
        ) : (
          <div>
            <h2>{tr("Respiration 4-4 · 5 min", "4-4 breathing · 5 min")}</h2>
            <p>{tr("Inspirez 4 s, expirez 4 s. La montre suit votre pouls pendant l’exercice. Son uniquement en cas d’alerte.", "Inhale 4 s, exhale 4 s. The watch follows your pulse during the exercise. Sound only if there is an alert.")} <Demo /></p>
          </div>
        )}
        {run
          ? <button type="button" className="btn btn-primary lg" onClick={() => finish(true)}><Icon name="stop" size={18} /> {tr("Terminer", "Finish")}</button>
          : <button type="button" className="btn btn-primary lg" onClick={() => start(WELL_ITEMS[0])}><Icon name="play_arrow" /> {tr("Commencer", "Start")}</button>}
      </div>
      <ul className="well-list">{WELL_ITEMS.map((raw) => {
        const item = shown(raw);
        return (
        <li key={raw.kind}>
          <button type="button" className="well-pick r-card" aria-pressed={run?.id === raw.kind} onClick={() => start(raw)}>
            <Icon name={item.icon} size={28} /><strong>{item.title}</strong><span className="mono">{item.time}</span><p>{item.why}</p>
          </button>
        </li>
      ); })}</ul>
      <p className="r-note"><GameIcon name="flame" size={16} /> {tr("Série", "Streak")} : {gami.enabled ? tr(`${gami.streak} jours`, `${gami.streak} days`) : tr("gamification désactivée", "gamification off")} · <Demo /></p>
    </>
  );
}
export function AstroWatch() {
  const { tr } = useLang();
  const ME = useMe();
  const gamif = useGamification(ME.id);
  const [read, setRead] = useState(false);
  const wg = gamif.enabled ? { streak: gamif.streak, crew: gamif.crew.pct } : null;
  const pulseLight = heartRateLight(ME.hr);
  return (
    <WatchSection crewId={ME.id}>
      {(watch) => (
        <>
          <Head title={tr("Montre", "Watch")} aside={<span className="watch-linked"><span className="chip"><Icon name="watch" size={16} /> {watch.watchName ?? tr("Sélectionnée", "Selected")}</span><button type="button" className="btn btn-ghost sm" onClick={() => { setRead(false); watch.disconnect(); }}>{tr("Retirer", "Remove")}</button></span>} />
          {!read ? <PcFingerprint onRead={() => { setRead(true); buzzEspFort(); }} /> : (
          <ConductorProvider><TimeConductor />
          <div className="two-col">
            <Card title={tr("Pouls et SpO₂ · temps réel", "Pulse and SpO₂ · realtime")} icon="favorite" aside={<DataTag />}>
              <p className="r-note">{pulseLight !== "ok" && <Lamp l={pulseLight} compact />} {tr("Empreinte lue", "Fingerprint read")} · {ME.hr} bpm · SpO₂ {ME.spo2} % · <Demo /></p>
              <LiveVitalsChart astronautId={ME.id} />
            </Card>
            <Card title={tr("Sommeil (automatique)", "Sleep (automatic)")} icon="bedtime" aside={<Demo />}><div className="kpis one"><div><strong>{ME.sleep}</strong><span>{tr("nuit dernière · objectif 7 h", "last night · 7 h goal")}</span><svg className="hypno" viewBox="0 0 240 48" preserveAspectRatio="none" aria-hidden="true">{[3, 2, 1, 2, 3, 2, 1, 1, 2, 3, 2, 3].map((h, i) => <rect key={i} x={i * 20 + 2} y={48 - h * 14} width={16} height={h * 14} rx={2} />)}</svg></div></div></Card>
            <Card title={tr("Rayonnement · dosimètre", "Radiation · dosimeter")} icon="radiology" aside={<DataTag />}><RadiationChart astronautId={ME.id} /></Card>
            <SpaceWeatherCard />
            <Card title={tr("Aperçu de la montre (interactif)", "Watch preview (interactive)")} icon="watch" aside={<Demo />}><div className="watch-prev"><Watch6 shape="square" goals={wg} /><Watch6 shape="round" view="caution" goals={wg} /></div><p className="muted small">{tr("Touchez le pouls pour la mini-silhouette, l’alerte pour la respiration.", "Tap the pulse for the mini silhouette, the alert for breathing.")}</p></Card>
            <Card title={tr("Historique de synchro", "Sync history")} icon="sync">
              <ul className="log">{[["09:39", tr("Synchro auto · 186 points de pouls", "Auto sync · 186 pulse points")], ["07:12", tr("Nuit importée · 5h10", "Night imported · 5h10")], ["J126 22:40", tr("Synchro auto · 1 040 points", "Auto sync · 1,040 points")]].map(([t, x]) => <li key={t}><span className="mono">{t}</span>{x}</li>)}</ul>
              <Link className="btn btn-ghost" to="/astronaute/montre/ecrans">{tr("Voir les écrans de la montre", "See the watch screens")} <Icon name="arrow_forward" size={18} /></Link>
            </Card>
          </div></ConductorProvider>
          )}
        </>
      )}
    </WatchSection>
  );
}
export function AstroReminders({ go }: { go: Go }) {
  const { tr } = useLang();
  const rows: [string, IconName, string, boolean, string | null][] = [
    ["07:30", "blood_pressure", tr("Tension (kit)", "Blood pressure (kit)"), true, null],
    ["07:45", "bloodtype", tr("Glycémie à jeun", "Fasting glucose"), false, "/astronaute/kits"],
    ["08:00", "face", tr("Scan fatigue", "Fatigue scan"), false, "/astronaute/scan"],
    ["12:30", "mood", tr("Humeur", "Mood"), false, "/astronaute/kits"],
    ["18:00", "fitness_center", tr("Résistance ARED", "ARED resistance"), false, "/astronaute/bien-etre"],
    ["21:30", "thermometer", tr("Température", "Temperature"), false, "/astronaute/kits"],
  ];
  const next = rows.findIndex((r) => !r[3]);
  return (
    <>
      <Head title={tr("Routine de la journée", "Day routine")} sub={tr("Alignée sur le planning de mission. La montre vibre à l’heure prévue.", "Aligned with the mission plan. The watch vibrates at the planned time.")} />
      <ol className="timeline">{rows.map(([t, , l, d, to], i) => (
        <li key={t} className={d ? "is-done" : i === next ? "is-now" : ""}>
          <span className="tl-mark" aria-hidden="true">{d ? <Icon name="check" size={16} /> : null}</span>
          <span className="mono">{t}</span>
          <strong>{l}</strong>
          {d ? <span className="visually-hidden">{tr("Fait", "Done")}</span> : (
            <button type="button" className="btn btn-secondary sm" onClick={() => (to ? go(to) : notifyBackend(tr(`Mesure « ${l} » (capteur)`, `Measurement “${l}” (sensor)`)))}>{tr("Faire", "Do")}</button>
          )}
        </li>
      ))}</ol>
    </>
  );
}
/* Arm mode (spacewalk / EVA): 4 giant actions, usable with gloves */
export function ArmMode({ go }: { go: Go }) {
  const { tr } = useLang();
  const ME = useMe();
  return (
    <main className="arm">
      <header><Emblem size={36} /><Lamp l={ME.light} /><span className="mono">{ME.hr} BPM</span><button className="arm-x" onClick={() => go("/astronaute")} aria-label={tr("Quitter le mode bras", "Leave arm mode")}><Icon name="close" size={28} /></button></header>
      <div className="arm-grid">
        <button type="button" onClick={() => go("/astronaute/kits")}><Icon name="favorite" size={44} /><strong>{tr("Mes constantes", "My vitals")}</strong></button>
        <button type="button" onClick={() => go("/astronaute/bien-etre")}><Icon name="air" size={44} /><strong>{tr("Respirer", "Breathe")}</strong></button>
        <button type="button" onClick={() => go("/astronaute/rappels")}><Icon name="notifications" size={44} /><strong>{tr("Rappels", "Reminders")}</strong></button>
        <button type="button" className="arm-sos" onClick={() => notifyBackend(tr("Appel au médecin de bord", "Call the crew surgeon"))}><Icon name="emergency" size={44} /><strong>{tr("Appeler le médecin de bord", "Call the crew surgeon")}</strong></button>
      </div>
    </main>
  );
}
