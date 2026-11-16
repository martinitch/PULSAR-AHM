/* Crew surgeon — medical tablet / sickbay screen + ultrasound probe.
   Figma mockups: "Crew surgeon" page (1:4), screens M01–M11. Sees the WHOLE crew. */
import { useEffect, useRef, useState } from "react";
import { Icon, type IconName, Demo, Card, Lamp, Spark, Avatar, PageHead as Head, WorkflowBadge, HudDial, CrewPhotoButton } from "@/components/ui";
import { notifyBackend, notifyOk } from "@/components/ui/noticeStore";
import { BodyFigure, ZoneLegend, statesFor, useZoneZoom, zoneBrief } from "@/components/body3d";
import { ClinicAssist, CareTimeline, StatusDonut, ZoneInsights } from "@/components/clinic";
import { TRENDS, WINDOWS } from "@/data/demo/crew";
import type { Light, Member } from "@/data/types";
import type { Go } from "@/app/types";
import { Probe } from "./Probe";
import { EchoDock, ECHO_NOTE_EN, ECHO_NOTE_FR, useEchoExam } from "./EchoDock";
import { AiAlerts } from "./AiAlerts";
import { SoundButton } from "@/features/sound";
import { CrewParticipationCard } from "@/features/gamification";
import { LiveVitalsChart, RadiationChart } from "@/components/charts";
import { ConductorProvider, TimeConductor } from "@/components/telemetry";
import { AstronautLad } from "@/features/predictions";
import { DataTag } from "@/app/DataSource";
import { SpaceWeatherCard } from "@/features/reference/SpaceWeather";
import { pushBoard, useJournal } from "@/features/board/localLog";
import { bpLights, spo2Light } from "@/data/thresholds";
import { useCrew, useEchoSteps, useEchoZones, useLang, useTrends } from "@/i18n";
const SEV: Record<Light, number> = { ok: 0, caution: 1, warning: 2 };
function CrewTile({ m, go }: { m: Member; go: Go }) {
  const { tr } = useLang();
  const spark = TRENDS[0].series[m.id] ?? [m.hr];
  return (
    <button type="button" className={`crew-tile t-${m.light}`} onClick={() => go(`/medecin-bord/dossier/${m.id}`)}>
      <div className="ct-top">
        <Avatar id={m.id} l={m.light} />
        <div><strong>{m.name}</strong><span className="mono">{m.id} · {m.role}</span></div>
        <Lamp l={m.light} />
      </div>
      <p>{m.reason}</p>
      <div className="ct-metrics">
        <dl>
          <div><dt>{tr("FC", "HR")}</dt><dd>{m.hr}<small>bpm</small></dd></div>
          <div><dt>SpO₂</dt><dd>{m.spo2}<small>%</small></dd></div>
          <div><dt>{tr("TA", "BP")}</dt><dd>{m.bp}</dd></div>
          <div><dt>{tr("Sommeil", "Sleep")}</dt><dd>{m.sleep}</dd></div>
        </dl>
        <Spark v={spark} l={m.light} w={88} h={28} />
      </div>
      <span className="ct-sync"><Icon name="watch" size={14} /> {m.sync}</span>
    </button>
  );
}
export function CmoBoard({ go }: { go: Go }) {
  const { t, tr } = useLang();
  const CREW = useCrew();
  const events = useJournal();
  const n = (l: Light) => CREW.filter((m) => m.light === l).length;
  const priority = [...CREW].sort((a, b) => SEV[b.light] - SEV[a.light])[0];
  const sys = Number(priority.bp.split("/")[0]) || 120;
  const zones = statesFor(priority.light);
  const body = useZoneZoom(zones, priority.light === "ok" ? "" : "heart", priority.id);
  return (
    <div className="m01 m01--clinic m01--saas">
      <section className="ops-board" aria-label={tr("Surveillance équipage", "Crew monitoring")}>
        <header className="ops-head">
          <h1>{t.dash.cmo}</h1>
          <div className="lamp-sum"><Lamp l="ok" /><b className="mono">{n("ok")}</b><Lamp l="caution" /><b className="mono">{n("caution")}</b><Lamp l="warning" /><b className="mono">{n("warning")}</b><Demo /></div>
        </header>

        <div className={`ops-split m01-patient${priority.light !== "ok" ? " is-priority" : ""}`} aria-label={`Priorité ${priority.name}`}>
          <div className="m01-patient-profile">
            <Avatar id={priority.id} l={priority.light} />
            <div>
              <h2>{priority.name}</h2>
              <p className="mono">{priority.id} · {priority.role} · {priority.cabin}</p>
              <Lamp l={priority.light} />
              <WorkflowBadge status="vu" assignee="CMO-001" />
            </div>
            <p className="m01-patient-reason">{priority.reason}</p>
            <div className="btn-row">
              <button type="button" className="btn btn-primary" onClick={() => go(`/medecin-bord/dossier/${priority.id}`)}>{tr("Dossier", "File")}</button>
              <button type="button" className="btn btn-secondary" onClick={() => go("/medecin-bord/echographie/1")}><Icon name="monitor_heart" size={16} /> {tr("Écho", "Echo")}</button>
              <button type="button" className="btn btn-ghost" onClick={() => go(`/medecin-bord/predictions/${priority.id}`)}>{tr("Prévisions", "Forecasts")}</button>
            </div>
          </div>
          <div className="m01-patient-dials" aria-label={tr("Constantes prioritaires", "Priority vitals")}>
            <HudDial label={tr("Pouls", "Pulse")} value={priority.hr} unit="bpm" pct={priority.hr / 130} light={priority.light} />
            <HudDial label="SpO₂" value={priority.spo2} unit="%" pct={priority.spo2 / 100} light={spo2Light(priority.spo2)} />
            <HudDial label={tr("Temp.", "Temp.")} value={priority.temp} unit="°C" pct={0.55} light="ok" />
            <HudDial label={tr("Tension", "Pressure")} value={priority.bp} unit="mmHg" pct={sys / 180} light={bpLights(sys, Number(priority.bp.split("/")[1]) || 80)} />
          </div>
          <div className="m01-patient-body">
            <BodyFigure states={zones} sel={body.sel} onPick={body.pick} zoom={body.zoom} need={body.need} views={false} />
            <ZoneInsights states={zones} onPick={body.pick} />
            <Demo />
          </div>
        </div>

        <div className="ops-split m01-ops-mid">
          <ClinicAssist
            title={tr("Aide clinique", "Clinical assist")}
            onOpen={() => go(`/medecin-bord/predictions/${priority.id}`)}
            items={[
              {
                id: "prio",
                light: priority.light,
                title: priority.light === "ok" ? tr("Aucun cas prioritaire", "No priority case") : `Focus · ${priority.id}`,
                detail: priority.reason,
                meta: `Dérive · ${priority.sync}`,
              },
              {
                id: "link",
                light: "ok",
                title: tr("Liaison sol ouverte", "Ground link open"),
                detail: tr(`Fenêtre jusqu’à ${WINDOWS.linkUntil} · prochaine montante ${WINDOWS.nextUp}.`, `Window until ${WINDOWS.linkUntil} · next uplink ${WINDOWS.nextUp}.`),
                meta: "MCC Houston",
              },
            ]}
            footer={<div className="clinic-assist-embed"><AiAlerts astronautId={priority.id} /></div>}
          />
          <StatusDonut
            title={tr("Flux équipage", "Crew flow")}
            center={`${CREW.length}`}
            slices={[
              { id: "ok", label: tr("Nominaux", "Nominal"), value: n("ok"), color: "var(--ok)" },
              { id: "caution", label: tr("Attention", "Caution"), value: n("caution"), color: "var(--medium)" },
              { id: "warning", label: tr("Alerte", "Alert"), value: n("warning"), color: "var(--high)" },
            ]}
          />
          <CareTimeline
            title={tr("Plan de soins · priorité", "Care plan · priority")}
            steps={[
              { id: "c1", time: "09:05", title: "Écho cardiaque", detail: `${priority.id} · faite`, done: true, icon: "monitor_heart" },
              { id: "c2", time: "09:38", title: "Revue FC repos", detail: `${priority.hr} bpm`, light: priority.light, icon: "vital_signs" },
              { id: "c3", time: "10:00", title: "Hydratation + repos", detail: "500 mL · 20 min", icon: "self_improvement" },
              { id: "c4", time: WINDOWS.nextUp, title: "Rapport sol", detail: "File montante", icon: "satellite_alt" },
            ]}
          />
        </div>

        <div className="ops-split cmo-layout">
          <div className="crew-grid m01-grid" role="list">
            {[...CREW].sort((a, b) => SEV[b.light] - SEV[a.light]).map((m) => <CrewTile key={m.id} m={m} go={go} />)}
          </div>
          <aside className="cmo-side">
            <Card title={tr("Journal", "Log")} icon="history">
              <ul className="log log--dense">{events.slice(0, 6).map((e) => <li key={e.t + e.text}><span className="mono">{e.t}</span><Lamp l={e.light} compact /><span><b>{e.who}</b> · {e.text}</span></li>)}</ul>
              <button type="button" className="btn btn-ghost sm" onClick={() => go("/medecin-bord/journal")}>{tr("Journal complet", "Full log")}</button>
            </Card>
            <CrewParticipationCard />
            <SpaceWeatherCard />
          </aside>
        </div>
      </section>
    </div>
  );
}
export function CmoCrew({ id, go }: { id?: string; go: Go }) {
  const { tr } = useLang();
  const CREW = useCrew();
  const TRENDS = useTrends();
  const m = CREW.find((c) => c.id === id) ?? CREW[1];
  const zones = statesFor(m.light);
  const body = useZoneZoom(zones, m.light === "ok" ? "" : "heart", m.id);
  return (
    <>
      <Head title={m.name} sub={m.role} aside={<div className="btn-row"><Lamp l={m.light} /><button className="btn btn-secondary" onClick={() => go(`/medecin-bord/predictions/${m.id}`)}><Icon name="insights" size={18} /> {tr("Prédictions", "Predictions")}</button><button className="btn btn-primary" onClick={() => go("/medecin-bord/echographie/1")}><Icon name="monitor_heart" size={18} /> {tr("Examen échographique", "Ultrasound exam")}</button></div>} />
      <div className="dossier-photo">
        <Avatar id={m.id} l={m.light} />
        <div>
          <CrewPhotoButton crewId={m.id} />
        </div>
      </div>
      <nav className="crew-tabs" aria-label={tr("Autres membres", "Other members")}>{CREW.map((c) => <button key={c.id} aria-current={c.id === m.id ? "page" : undefined} onClick={() => go(`/medecin-bord/dossier/${c.id}`)}><Avatar id={c.id} l={c.light} />{c.name.split(" ")[0]}</button>)}</nav>
      <div className="crew-detail">
        <Card title={tr("Constantes", "Vitals")} icon="vital_signs" aside={<Demo />}>
          <div className="vit">{([[tr("FC repos", "Resting HR"), `${m.hr} bpm`, TRENDS[0].series[m.id]], [tr("Sommeil", "Sleep"), m.sleep, TRENDS[1].series[m.id]], [tr("Humeur", "Mood"), `${m.mood}/5`, TRENDS[2].series[m.id]]] as [string, string, number[]][]).map(([l, v, s]) => <div key={l}><span>{l}</span><strong>{v}</strong><Spark v={s} l={m.light} /></div>)}
            <div><span>{tr("Tension", "Pressure")}</span><strong>{m.bp}</strong></div><div><span>SpO₂</span><strong>{m.spo2} %</strong></div><div><span>{tr("Température", "Temperature")}</span><strong>{m.temp} °C</strong></div></div>
        </Card>
        <Card title={tr("Silhouette 3D", "3D silhouette")} icon="accessibility_new"><BodyFigure states={zones} sel={body.sel} onPick={body.pick} zoom={body.zoom} need={body.need} /><ZoneLegend /></Card>
        <CmoNotes m={m} />
      </div>
      <ConductorProvider>
      <TimeConductor />
      <div className="two-col crew-live">
        <Card title={tr("Capteurs · temps réel", "Sensors · realtime")} icon="monitor_heart" aside={<DataTag />} className="dense"><LiveVitalsChart astronautId={m.id} /></Card>
        <Card title={tr("Dernières valeurs disponibles", "Latest available values")} icon="monitoring" className="dense"><AstronautLad astronautId={m.id} /></Card>
        <Card title={tr("Alertes du modèle (dérive)", "Model alerts (drift)")} icon="notification_important" aside={<DataTag />} className="dense"><AiAlerts astronautId={m.id} /></Card>
        <Card title={tr("Rayonnement · dosimètre", "Radiation · dosimeter")} icon="radiology" aside={<DataTag />} className="dense"><RadiationChart astronautId={m.id} height={130} /></Card>
      </div>
      </ConductorProvider>
    </>
  );
}
const ECHO_PREP: { icon: IconName; title: string; text: string }[] = [
  { icon: "accessibility_new", title: "Patient", text: "Sanglé au poste médical, torse dégagé." },
  { icon: "tablet", title: "Tablette", text: "Fixée sur le bras articulé." },
  { icon: "videocam", title: "Enregistrement", text: "Vidéo activée pour le sol." },
];

export function CmoEcho({ step: s0, go }: { step?: string; go: Go }) {
  const { tr, lang } = useLang();
  const ECHO_ZONES = useEchoZones();
  const ECHO_STEPS = useEchoSteps();
  const asked = Math.min(6, Math.max(1, Number(s0) || 1));
  const { exam, patch, reset } = useEchoExam();
  const step = Math.min(asked, exam.reached);
  const [zone, setZone] = useState(exam.zone);
  const [tool, setTool] = useState<IconName>("edit");
  const z = ECHO_ZONES.find((x) => x.id === zone) ?? ECHO_ZONES[0];
  const checksOk = exam.checks.every(Boolean);
  const noteOk = exam.note.trim().length > 0;
  useEffect(() => {
    if (asked !== step) go(`/medecin-bord/echographie/${step}`);
  }, [asked, step, go]);

  const pickZone = (id: string) => {
    if (!ECHO_ZONES.some((x) => x.id === id)) return;
    setZone(id);
    patch({ zone: id });
  };
  const toggleCheck = (i: number) => {
    const checks = [...exam.checks] as [boolean, boolean, boolean];
    checks[i] = !checks[i];
    patch({ checks });
  };
  const ready = exam.linked && (step === 1 ? checksOk : step === 3 ? exam.placed : step === 5 ? noteOk : true);
  const linking = step === 1 && !exam.linked;
  const hint = !exam.linked
    ? tr("Reliez la sonde (USB-C) avant de passer à l’étape suivante.", "Link the probe (USB-C) before the next step.")
    : step === 1 && !checksOk
      ? tr("Cochez les trois points de la checklist cabine.", "Tick the three cabin-checklist items.")
      : step === 1
        ? tr("Liaison établie. Vous pouvez choisir la zone.", "Link up. You can choose the zone.")
        : step === 2
          ? tr(`Zone retenue : ${z.label}.`, `Zone kept: ${z.label}.`)
          : step === 3 && !exam.placed
            ? tr("Confirmez que la sonde est en place.", "Confirm the probe is in place.")
            : step === 3
              ? tr("Sonde en place. L’image peut s’afficher.", "Probe in place. The image can appear.")
              : step === 4
                ? tr("Capturez l’image avant d’annoter.", "Capture the image before annotating.")
                : step === 5 && !noteOk
                  ? tr("Ajoutez un commentaire avant de joindre l’image.", "Add a comment before attaching the image.")
                  : step === 5
                    ? tr("Le commentaire part avec les images.", "The comment goes with the images.")
                    : tr(`Liaison sol active jusqu’à ${WINDOWS.linkUntil}.`, `Ground link active until ${WINDOWS.linkUntil}.`);
  const goStep = (n: number) => {
    patch({ reached: Math.max(exam.reached, n) });
    go(`/medecin-bord/echographie/${n}`);
  };
  const send = () => {
    pushBoard({ who: "NO", light: "ok", text: tr("Échographie · Lina Kovacs · images jointes au dossier local", "Ultrasound · Lina Kovacs · images attached to the local file") });
    notifyBackend(tr("Envoi du rapport au sol (liaison satellite)", "Sending the report to the ground (satellite link)"));
    reset();
    go("/medecin-bord/journal");
  };
  const tools: { id: IconName; label: string }[] = [
    { id: "straighten", label: tr("Règle", "Ruler") },
    { id: "arrow_forward", label: tr("Flèche", "Arrow") },
    { id: "edit", label: tr("Trait", "Line") },
    { id: "label", label: tr("Étiquette", "Label") },
  ];
  const primaryLabel = [tr("Continuer", "Continue"), tr("Guider le positionnement", "Guide positioning"), tr("Voir l’image", "See the image"), tr("Capturer", "Capture"), tr("Joindre au dossier", "Attach to the file"), tr("Envoyer avec le rapport", "Send with the report")][step - 1];
  return (
    <div className="echo-flow">
      <header className="echo-top">
      <Head title={[tr("Connecter la sonde", "Connect the probe"), tr("Choisir la zone", "Choose the zone"), tr("Positionnement guidé", "Guided positioning"), tr("Image en direct", "Live image"), tr("Annoter", "Annotate"), tr("Joindre et envoyer", "Attach and send")][step - 1]} aside={<Lamp l="caution" />} />
      <WorkflowBadge status={step >= 6 ? "resolu" : step >= 4 ? "pris_en_charge" : step >= 2 ? "vu" : "nouveau"} assignee="CMO-001" />
      <ol className="stepper" aria-label={tr("Étapes de l’examen", "Exam steps")}>{ECHO_STEPS.map((l, i) => {
        const n = i + 1;
        const locked = n > exam.reached;
        const done = n < exam.reached && n !== step;
        return (
          <li key={l} className={done ? "done" : n === step ? "now" : ""}>
            <button type="button" aria-current={n === step ? "step" : undefined} disabled={locked} title={locked ? tr("Terminez l’étape en cours avant d’avancer.", "Finish the current step before moving on.") : undefined} onClick={() => go(`/medecin-bord/echographie/${n}`)}>
              <span>{done ? <Icon name="check" size={14} /> : n}</span>{l}
            </button>
          </li>
        );
      })}</ol>
      </header>
      <div className="echo-flow-body">
      {step === 1 && (
        <div className="echo-work is-even">
          <Card title={tr("Sonde portable", "Portable probe")} icon="link" aside={exam.linked ? <span className="chip ok"><Icon name="check_circle" size={14} /> {tr("Reliée", "Linked")}</span> : <span className="chip"><Icon name="link_off" size={14} /> {tr("En attente", "Waiting")}</span>}>
            <dl className="facts">
              <div><dt>{tr("Connexion", "Connection")}</dt><dd>{exam.linked ? tr("USB-C · tablette médicale", "USB-C · medical tablet") : tr("Non reliée", "Not linked")}</dd></div>
              <div><dt>{tr("Batterie sonde", "Probe battery")}</dt><dd>{exam.linked ? <>{exam.battery} % <Demo /></> : "—"}</dd></div>
              <div><dt>{tr("Préréglage", "Preset")}</dt><dd>{tr("Cardiaque · 2–4 MHz", "Cardiac · 2–4 MHz")}</dd></div>
              <div><dt>{tr("Gel", "Gel")}</dt><dd>{tr("Sachet stérile · fixer le patient (sangles)", "Sterile pack · strap the patient")}</dd></div>
            </dl>
          </Card>
          <Card title={tr("Avant de commencer", "Before you start")} icon="checklist">
            <ul className="echo-prep">
              {ECHO_PREP.map((item, i) => (
                <li key={item.icon} data-on={exam.checks[i] ? "true" : "false"}>
                  <label>
                    <input type="checkbox" checked={exam.checks[i]} onChange={() => toggleCheck(i)} />
                    <span className="echo-prep-ic" aria-hidden="true"><Icon name={item.icon} size={20} /></span>
                    <span>
                      <strong>{lang === "en" ? (["Patient", "Tablet", "Recording"][i] ?? item.title) : item.title}</strong>
                      <p>{lang === "en" ? (["Strapped at the medical station, torso clear.", "Fixed on the articulated arm.", "Video on for the ground."][i] ?? item.text) : item.text}</p>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <p className="r-note">{tr("Checklist cabine — à cocher avant de continuer.", "Cabin checklist — tick it before you continue.")}</p>
          </Card>
        </div>
      )}
      {step === 2 && (<div className="echo-work is-even"><Card title={tr("Zone d’examen", "Exam zone")} icon="accessibility_new"><BodyFigure states={statesFor("caution")} sel={zone} onPick={pickZone} zoom need={zoneBrief(statesFor("caution"), zone)} /></Card><Card title={z.label} icon="target"><ul className="zone-list">{ECHO_ZONES.map((x) => <li key={x.id}><button aria-pressed={x.id === zone} onClick={() => pickZone(x.id)}><strong>{x.label}</strong><span>{x.why}</span></button></li>)}</ul></Card></div>)}
      {step === 3 && (
        <div className="echo-work is-even">
          <Card title={tr("Où poser la sonde", "Where to place the probe")} icon="target">
            <BodyFigure states={statesFor("caution")} sel={zone} probe views={false} zoom need={zoneBrief(statesFor("caution"), zone)} initial={["kidneys", "muscles"].includes(zone) ? "back" : "front"} />
          </Card>
          <Card title={`${z.label} · ${tr("consigne", "instruction")}`} icon="pan_tool">
            <p className="big-line">{z.probe}</p>
            <ol className="steps">
              <li>{tr("Inclinez doucement jusqu’à voir les 4 cavités", "Tilt gently until the 4 chambers appear")}</li>
              <li>{tr("Gardez la sonde immobile 3 s", "Hold the probe still for 3 s")}</li>
              <li>{tr("Le cadre devient cyan quand l’image est exploitable", "The frame turns cyan when the image is usable")}</li>
            </ol>
            <label className="echo-confirm">
              <input type="checkbox" checked={exam.placed} onChange={() => patch({ placed: !exam.placed })} />
              <span>{tr("Sonde posée selon la consigne, patient immobile.", "Probe placed as instructed, patient still.")}</span>
            </label>
          </Card>
        </div>
      )}
      {step === 4 && (
        <div className="echo-work">
          <div className="echo-stage-img">
            <div className="echo-frame ok"><Probe /><span className="rec"><i /> {tr("EN DIRECT", "LIVE")} · 00:42</span></div>
          </div>
          <div className="echo-modules">
            <Card title={tr("Contrôles", "Controls")} icon="tune">
              <dl className="facts">
                <div><dt>{tr("Zone", "Zone")}</dt><dd>{z.label}</dd></div>
                <div><dt>{tr("Profondeur", "Depth")}</dt><dd>14 cm</dd></div>
                <div><dt>{tr("Gain", "Gain")}</dt><dd>52 %</dd></div>
                <div><dt>{tr("Qualité", "Quality")}</dt><dd><Lamp l="ok" compact /> {tr("Exploitable", "Usable")}</dd></div>
              </dl>
            </Card>
            <Card title={tr("Enregistrement", "Recording")} icon="videocam">
              <p className="r-note">{tr("Clip de 6 s joint au dossier, en plus de l’image capturée.", "A 6 s clip is attached to the file, in addition to the captured image.")}</p>
              <button type="button" className="btn btn-secondary" onClick={() => notifyBackend(tr("Enregistrement d’un clip de 6 s (sonde d’échographie)", "Recording a 6 s clip (ultrasound probe)"))}>{tr("Enregistrer un clip 6 s", "Record a 6 s clip")}</button>
            </Card>
          </div>
        </div>
      )}
      {step === 5 && (
        <div className="echo-work">
          <div className="echo-stage-img">
            <div className="echo-frame"><Probe live={false} marks /></div>
          </div>
          <div className="echo-modules">
            <Card title={tr("Outils", "Tools")} icon="ink_pen">
              <div className="tools">{tools.map((t) => <button type="button" key={t.id} className="icon-btn" aria-label={t.label} aria-pressed={tool === t.id} onClick={() => setTool(t.id)}><Icon name={t.id} /></button>)}</div>
              <p className="r-note">{tr("Outil", "Tool")} {tools.find((t) => t.id === tool)?.label} — {tr("repère posé sur l’image de démo.", "mark placed on the demo image.")}</p>
            </Card>
            <Card title={tr("Commentaire", "Comment")} icon="edit_note">
              <textarea className="r-text" value={exam.note === ECHO_NOTE_FR || exam.note === ECHO_NOTE_EN ? tr(ECHO_NOTE_FR, ECHO_NOTE_EN) : exam.note} aria-label={tr("Commentaire", "Comment")} onChange={(e) => patch({ note: e.target.value })} />
            </Card>
          </div>
        </div>
      )}
      {step === 6 && (
        <div className="echo-work is-even">
          <Card title={tr("Pièces jointes", "Attachments")} icon="attach_file">
            <div className="thumbs"><Probe live={false} marks /><Probe live={false} /></div>
            <p className="r-note">{tr("2 images + 1 clip · dossier de Lina Kovacs", "2 images + 1 clip · Lina Kovacs’s file")} · <Demo /></p>
          </Card>
          <Card title={tr("Envoi au sol", "Send to the ground")} icon="outbox">
            <dl className="facts">
              <div><dt>{tr("Destinataire", "Recipient")}</dt><dd>{tr("Chirurgiens de vol · MCC Houston", "Flight surgeons · MCC Houston")}</dd></div>
              <div><dt>{tr("Liaison", "Link")}</dt><dd><Icon name="satellite_alt" size={14} /> {tr("Active jusqu’à", "Active until")} {WINDOWS.linkUntil}</dd></div>
              <div><dt>{tr("Délai estimé", "Estimated delay")}</dt><dd>{tr("~14 min (bande passante)", "~14 min (bandwidth)")}</dd></div>
            </dl>
            <p className="r-note">{tr(`Si la liaison tombe, l’envoi part à la prochaine fenêtre (${WINDOWS.nextUp}).`, `If the link drops, the send leaves on the next window (${WINDOWS.nextUp}).`)}</p>
          </Card>
        </div>
      )}
      </div>
      <EchoDock linked={exam.linked} battery={exam.battery} hint={hint} onBack={step > 1 ? () => go(`/medecin-bord/echographie/${step - 1}`) : undefined}>
        {step === 6 ? (
          <SoundButton sound="reportOut" className="btn btn-primary" disabled={!ready} title={ready ? undefined : hint} onClick={send}><Icon name="send" size={18} /> {primaryLabel}</SoundButton>
        ) : (
          <button type="button" className="btn btn-primary" disabled={!linking && !ready} title={!linking && !ready ? hint : undefined} onClick={() => (linking ? patch({ linked: true }) : ready && goStep(step + 1))}>
            <Icon name={linking ? "link" : step === 4 ? "photo_camera" : "arrow_forward"} size={18} />
            {linking ? tr("Établir la liaison", "Establish the link") : primaryLabel}
          </button>
        )}
      </EchoDock>
    </div>
  );
}
export function CmoLog() {
  const { tr } = useLang();
  const events = useJournal();
  return (<><Head title={tr("Événements de l’équipage", "Crew events")} /><Card title={tr("Aujourd’hui · J127", "Today · D127")} icon="history"><ul className="log">{events.map((e) => <li key={e.t + e.text}><span className="mono">{e.t}</span><Lamp l={e.light} compact /><span><b>{e.who}</b> · {e.text}</span></li>)}</ul></Card></>);
}

const NOTE_FR = "Tachycardie de repos modérée, sommeil court. Écho cardiaque prévue. Repos 20 min + hydratation 500 mL.";
const NOTE_EN = "Moderate resting tachycardia, short sleep. Cardiac ultrasound planned. Rest 20 min + hydration 500 mL.";

function CmoNotes({ m }: { m: Member }) {
  const { tr, lang } = useLang();
  const key = `pulsar.cmo-note.${m.id}`;
  const fallback = () => (m.light === "ok" ? "" : (lang === "en" ? NOTE_EN : NOTE_FR));
  const stored = () => {
    const raw = localStorage.getItem(key);
    if (!raw || raw === NOTE_FR || raw === NOTE_EN) return fallback();
    return raw;
  };
  const [text, setText] = useState(stored);
  const [forId, setForId] = useState(m.id);
  const dirty = useRef(false);
  if (forId !== m.id) {
    setForId(m.id);
    dirty.current = false;
    setText(stored());
  }
  useEffect(() => {
    if (dirty.current) return;
    const raw = localStorage.getItem(key);
    if (!raw || raw === NOTE_FR || raw === NOTE_EN) setText(fallback());
  }, [lang, m.id]);
  return (
    <Card title={tr("Notes du médecin de bord", "Crew surgeon notes")} icon="ink_pen">
      <textarea
        className="r-text"
        value={text}
        aria-label={tr("Notes", "Notes")}
        onChange={(e) => { setText(e.target.value); dirty.current = true; localStorage.setItem(key, e.target.value); }}
        onBlur={() => { if (!dirty.current) return; dirty.current = false; notifyOk(tr("Note enregistrée", "Note saved"), tr("Conservée sur cet appareil. Elle partira avec le prochain rapport quand le backend sera branché.", "Kept on this device. It will leave with the next report once the backend is connected.")); }}
      />
      <p className="r-note">{tr("Les notes restent sur cet appareil. L’envoi au sol part avec le backend.", "Notes stay on this device. The send to the ground leaves with the backend.")}</p>
    </Card>
  );
}
