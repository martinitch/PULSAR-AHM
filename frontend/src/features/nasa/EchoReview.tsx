/* Ultrasound reading on the Houston side: identity, view and measurement on the same frame,
   so a clip, another astronaut, or another zone cannot be mixed up. */
import { Demo, Lamp, Avatar } from "@/components/ui";
import type { EchoStudy, Light } from "@/data/types";
import { CREW } from "@/data/demo/crew";
import { readLang, useCrew, useLang, useReports } from "@/i18n";
import { Probe } from "@/features/medecin-bord/Probe";

type ReportLike = { id?: string; lights: Record<string, Light>; studies?: EchoStudy[] };

export function retainFor(memberId: string, reason: string, report: ReportLike): string {
  const en = readLang() === "en";
  if (memberId === "SR" && report.lights[memberId] === "warning") {
    return en
      ? "SpO₂ 91% for 4 min, remeasured at 98% — event closed on board."
      : "SpO₂ 91 % pendant 4 min, remesurée à 98 % — événement clos à bord.";
  }
  const still = report.studies?.find((s) => s.astronautId === memberId && s.kind === "still");
  if (!still) return reason;
  const measure = still.measures[0];
  const read = measure
    ? `${measure.label} ${measure.value} ${measure.unit}, ${measure.verdict.toLowerCase()} (${measure.range}).`
    : still.finding;
  return en ? `${reason} — ${still.view} attached. ${read} Opinion requested.` : `${reason} — ${still.view} jointe. ${read} Avis demandé.`;
}

export function studyLine(study: EchoStudy): string {
  const en = readLang() === "en";
  const who = CREW.find((m) => m.id === study.astronautId);
  const kind = study.kind === "clip" ? `clip ${study.duration ?? ""}`.trim() : en ? "still image" : "image fixe";
  const measure = study.measures[0];
  const read = measure
    ? `${measure.label} ${measure.value} ${measure.unit}, ${measure.verdict.toLowerCase()} (${measure.range})`
    : en ? "no measurement" : "sans mesure";
  return `${who?.name ?? study.astronautId} (${study.astronautId}) · ${kind} · ${study.view} · ${study.captured} · ${read}`;
}

function depthOf(study: EchoStudy) {
  return `${study.depthCm} cm`;
}

export function EchoReview({
  studies,
  selectedId,
  onSelect,
}: {
  studies: EchoStudy[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const { tr } = useLang();
  const crew = useCrew();
  const study = studies.find((s) => s.id === selectedId) ?? studies[0];
  return (
    <div data-testid="echo-review">
      <p className="r-note">{tr("Aide à la lecture, pas un diagnostic.", "A reading aid, not a diagnosis.")} <Demo /></p>
      {!study ? (
        <p className="r-note">{tr("Aucune image dans ce rapport. Ne pas interpréter d’échographie pour cet envoi.", "No image in this report. Do not interpret an ultrasound for this send.")}</p>
      ) : (
        <div className="echo-review">
          <ul className="echo-pick" aria-label={tr("Pièces échographiques", "Ultrasound items")}>
            {studies.map((item) => {
              const who = crew.find((m) => m.id === item.astronautId);
              const measure = item.measures[0];
              return (
                <li key={item.id}>
                  <button type="button" aria-pressed={item.id === study.id} onClick={() => onSelect(item.id)}>
                    <span className="echo-kind">{item.kind === "clip" ? `Clip ${item.duration}` : tr("Image fixe", "Still image")}</span>
                    <strong>{who?.name ?? item.astronautId}</strong>
                    <span>{item.view}</span>
                    <span className="mono">{measure ? `${measure.value} ${measure.unit}` : tr("Sans mesure", "No measurement")} · {item.captured}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <StudyOpen study={study} />
        </div>
      )}
    </div>
  );
}

function StudyOpen({ study }: { study: EchoStudy }) {
  const { tr } = useLang();
  const crew = useCrew();
  const member = crew.find((m) => m.id === study.astronautId);
  const kind = study.kind === "clip" ? `Clip ${study.duration}` : tr("Image fixe", "Still image");
  const measure = study.measures[0];
  return (
    <div className="echo-stage">
      <div>
        <div className={`echo-frame ${study.quality === "ok" ? "ok" : ""}`}>
          <Probe
            live={false}
            variant={study.zone === "eye" ? "eye" : "heart"}
            marks={study.annotated}
            markLabel={study.mark}
            callout={false}
            depthCm={study.depthCm}
            depthLabel={`${tr("PROFONDEUR", "DEPTH")} ${depthOf(study)} · ${tr("GAIN", "GAIN")} ${study.gain}`}
            label={tr(`Échographie simulée, ${member?.name ?? study.astronautId}, ${study.view}, ${kind}`, `Simulated ultrasound, ${member?.name ?? study.astronautId}, ${study.view}, ${kind}`)}
          />
          <span className="echo-badge">{kind}</span>
        </div>
        <p className="echo-cap">
          <b>{member?.name}</b> · {member?.id} · {member?.cabin}
          <span>{study.view} · {study.captured}</span>
        </p>
      </div>
      <div className="echo-dossier" data-testid="echo-dossier">
        {member && (
          <div className="echo-who">
            <Avatar id={member.id} />
            <div>
              <strong>{member.name}</strong>
              <span className="mono">{member.id} · {member.role} · {member.cabin}</span>
            </div>
          </div>
        )}
        <dl className="facts">
          <div><dt>{tr("Coupe", "View")}</dt><dd>{study.view}</dd></div>
          <div><dt>{tr("Type", "Type")}</dt><dd>{kind}</dd></div>
          <div><dt>{tr("Acquisition", "Acquired")}</dt><dd className="mono">{study.captured}</dd></div>
          <div><dt>{tr("Opérateur", "Operator")}</dt><dd>{study.operator}</dd></div>
          <div><dt>{tr("Préréglage", "Preset")}</dt><dd>{study.preset}</dd></div>
          <div><dt>{tr("Profondeur", "Depth")}</dt><dd className="mono">{depthOf(study)}</dd></div>
          <div><dt>{tr("Gain", "Gain")}</dt><dd className="mono">{study.gain}</dd></div>
          <div><dt>{tr("Qualité", "Quality")}</dt><dd><Lamp l={study.quality} compact /> {study.qualityLabel}</dd></div>
        </dl>
        {measure ? (
          <div className="echo-measure">
            <p className="eyebrow">{tr("Mesure retenue", "Kept measurement")}</p>
            <p className="echo-measure-name">{measure.label}</p>
            <p className="mono echo-measure-val">{measure.value} {measure.unit}</p>
            <p>{tr("Limites", "Limits")} <span className="mono">{measure.range}</span></p>
            <p><Lamp l={measure.light} compact /> {measure.verdict}</p>
          </div>
        ) : (
          <p className="r-note">{tr("Aucune mesure sur ce clip. Ne pas relever de diamètre ici : la mesure est sur l’image fixe de la même coupe.", "No measurement on this clip. Do not read a diameter here: the measurement is on the still of the same view.")}</p>
        )}
        <p>{study.finding}</p>
        {study.legend && <p className="echo-legend">{study.legend}</p>}
      </div>
    </div>
  );
}

/** Locked reminder before the recommendation of report R-127-03. */
export function EchoConfirm({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  const { tr } = useLang();
  const report = useReports().find((r) => r.id === "R-127-03");
  const still = report?.studies?.find((s) => s.kind === "still");
  const member = useCrew().find((m) => m.id === still?.astronautId);
  const measure = still?.measures[0];
  if (!still || !member || !measure) return null;
  return (
    <div className="echo-target" data-testid="echo-target">
      <p><b>{member.name}</b> · {member.id} · {member.cabin}</p>
      <p>{still.view} · {tr("image fixe", "still image")} · {still.captured}</p>
      <p>{measure.label} <span className="mono">{measure.value} {measure.unit}</span> · {measure.verdict.toLowerCase()} ({measure.range})</p>
      <p className="r-note">{tr("Le clip de 6 s de la même coupe ne porte pas de mesure.", "The 6 s clip of the same view has no measurement.")}</p>
      <label className="echo-confirm">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span>{tr("J’ai vérifié l’identité, la coupe et la mesure ci-dessus avant l’envoi.", "I checked the identity, the view and the measurement above before sending.")}</span>
      </label>
    </div>
  );
}
