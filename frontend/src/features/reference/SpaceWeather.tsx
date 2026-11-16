/* Reference space weather (DONKI). The NASA call stays in the back end.
   If the server does not respond: local file, labeled « Hors ligne ». Never a blocking error. */
import { useEffect, useState } from "react";
import { API_URL } from "@/api";
import { Card } from "@/components/ui";
import { useLang } from "@/i18n";

type EventRow = { kind: string; title: string; time: string };
type Report = {
  provenance: "connected" | "cache" | "offline";
  summary: string;
  events: EventRow[];
  note: string;
};

const WORD = { connected: "Connecté", cache: "Cache", offline: "Hors ligne" } as const;
const WORD_EN = { connected: "Connected", cache: "Cache", offline: "Offline" } as const;
const LOCAL_EN: Record<string, string> = {
  "Fichier local : activité solaire modérée, aucun événement extrême dans cette copie.": "Local file: moderate solar activity, no extreme event in this copy.",
  "Référence locale — pas une mesure du dosimètre de bord": "Local reference — not a reading from the onboard dosimeter",
  "Données de référence, pas des mesures de l'équipage. DÉMO.": "Reference data, not crew measurements. DEMO.",
  "Référence locale en cours de lecture.": "Reading the local reference.",
};

async function loadLocal(): Promise<Report> {
  const res = await fetch("/reference/space-weather.json");
  return (await res.json()) as Report;
}

export function SpaceWeatherCard() {
  const { tr, lang } = useLang();
  const say = (text: string) => (lang === "en" ? LOCAL_EN[text] ?? text : text);
  const [report, setReport] = useState<Report | null>(null);
  useEffect(() => {
    let cancel = false;
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 3500);
    fetch(`${API_URL}/reference/space-weather`, { signal: ctrl.signal, headers: { Accept: "application/json" } })
      .then((res) => { if (!res.ok) throw new Error(String(res.status)); return res.json() as Promise<Report>; })
      .catch(() => loadLocal())
      .then((data) => { if (!cancel) setReport(data); })
      .finally(() => window.clearTimeout(timer));
    return () => { cancel = true; ctrl.abort(); };
  }, []);
  const provenance = report?.provenance ?? "offline";
  return (
    <Card title={tr("Météo spatiale", "Space weather")} icon="satellite_alt" aside={<span className="chip">{lang === "en" ? WORD_EN[provenance] : WORD[provenance]}</span>}>
      <p>{say(report?.summary ?? "Référence locale en cours de lecture.")}</p>
      <ul className="log">
        {(report?.events ?? []).map((ev) => (
          <li key={ev.title}><span className="mono">{ev.kind}</span>{say(ev.title)}</li>
        ))}
      </ul>
      <p className="r-note">{say(report?.note ?? "Données de référence, pas des mesures de l'équipage. DÉMO.")}</p>
    </Card>
  );
}
