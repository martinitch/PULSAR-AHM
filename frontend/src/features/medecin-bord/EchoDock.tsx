/* Probe link bar — visible throughout the exam, before moving to the next step. */
import { useRef, useState, type ReactNode } from "react";
import { Demo, Icon } from "@/components/ui";
import { useLang } from "@/i18n";

export const ECHO_NOTE_FR = "Coupe 4 cavités. VG 4,1 cm. Pas d’épanchement visible. Avis du sol souhaité.";
export const ECHO_NOTE_EN = "4-chamber view. LV 4.1 cm. No visible effusion. Ground opinion requested.";

const KEY = "pulsar.echo.exam";

export type EchoExam = {
  linked: boolean;
  battery: number;
  checks: [boolean, boolean, boolean];
  reached: number;
  zone: string;
  placed: boolean;
  note: string;
};

const FRESH: EchoExam = {
  linked: false,
  battery: 76,
  checks: [false, false, false],
  reached: 1,
  zone: "heart",
  placed: false,
  note: ECHO_NOTE_FR,
};

function loadExam(): EchoExam {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...FRESH, checks: [false, false, false] };
    const p = JSON.parse(raw) as Partial<EchoExam>;
    const checks: [boolean, boolean, boolean] = Array.isArray(p.checks) && p.checks.length === 3
      ? [!!p.checks[0], !!p.checks[1], !!p.checks[2]]
      : [false, false, false];
    const zone = typeof p.zone === "string" && p.zone ? p.zone : FRESH.zone;
    return {
      linked: !!p.linked,
      battery: 76,
      checks,
      reached: Math.min(6, Math.max(1, Number(p.reached) || 1)),
      zone,
      placed: !!p.placed,
      note: typeof p.note === "string" ? p.note : FRESH.note,
    };
  } catch {
    return { ...FRESH, checks: [false, false, false] };
  }
}

export function useEchoExam() {
  const [exam, setExam] = useState<EchoExam>(loadExam);
  const ref = useRef(exam);
  ref.current = exam;
  const patch = (partial: Partial<EchoExam>) => {
    const next = { ...ref.current, ...partial };
    ref.current = next;
    setExam(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  };
  const reset = () => patch({ ...FRESH, checks: [false, false, false] });
  return { exam, patch, reset };
}

/** Probe battery gauge: bar + bolt + percentage. No halo. */
export function ProbeBattery({ pct, linked }: { pct: number; linked: boolean }) {
  const { tr } = useLang();
  const level = !linked ? "off" : pct < 20 ? "low" : pct < 40 ? "mid" : "ok";
  const shown = linked ? pct : 0;
  return (
    <div
      className={`probe-bat is-${level}`}
      style={{ ["--bat" as string]: `${shown}%` }}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={shown}
      aria-valuetext={linked ? tr(`${pct} pour cent`, `${pct} percent`) : tr("Sonde non reliée", "Probe not linked")}
      aria-label={tr("Batterie de la sonde", "Probe battery")}
    >
      <span className="probe-bat-fill" />
      <span className="probe-bat-read">
        <Icon name="bolt" size={14} />
        <b>{linked ? pct : "–"}</b>
      </span>
    </div>
  );
}

export function EchoDock({
  linked,
  battery,
  hint,
  onBack,
  children,
}: {
  linked: boolean;
  battery: number;
  hint: string;
  onBack?: () => void;
  children: ReactNode;
}) {
  const { tr } = useLang();
  return (
    <footer className="echo-dock" aria-label={tr("Liaison de la sonde", "Probe link")}>
      <div className="echo-dock-status">
        <span className={`echo-dock-mark${linked ? " is-on" : ""}`} aria-hidden="true">
          <Icon name={linked ? "link" : "link_off"} size={18} />
        </span>
        <div>
          <strong>{linked ? tr("Liaison sonde", "Probe link") : tr("Sonde non reliée", "Probe not linked")}</strong>
          <span>{linked ? tr("USB-C · tablette médicale", "USB-C · medical tablet") : tr("En attente du branchement", "Waiting for the connection")}</span>
        </div>
      </div>
      <ProbeBattery pct={battery} linked={linked} />
      {linked && <Demo />}
      <p className="echo-dock-hint" role="status">{hint}</p>
      <div className="echo-dock-actions">
        {onBack && <button type="button" className="btn btn-secondary" onClick={onBack}>{tr("Retour", "Back")}</button>}
        {children}
      </div>
    </footer>
  );
}
