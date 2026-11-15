/* Reference space weather (DONKI). The NASA call stays in the back end.
   If the server does not respond: local file, labeled « Hors ligne ». Never a blocking error. */
import { useEffect, useState } from "react";
import { API_URL } from "@/api";
import { Card } from "@/components/ui";

type EventRow = { kind: string; title: string; time: string };
type Report = {
  provenance: "connected" | "cache" | "offline";
  summary: string;
  events: EventRow[];
  note: string;
};

const WORD = { connected: "Connecté", cache: "Cache", offline: "Hors ligne" } as const;

async function loadLocal(): Promise<Report> {
  const res = await fetch("/reference/space-weather.json");
  return (await res.json()) as Report;
}

export function SpaceWeatherCard() {
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
    <Card title="Météo spatiale" icon="satellite_alt" aside={<span className="chip">{WORD[provenance]}</span>}>
      <p>{report?.summary ?? "Référence locale en cours de lecture."}</p>
      <ul className="log">
        {(report?.events ?? []).map((ev) => (
          <li key={ev.title}><span className="mono">{ev.kind}</span>{ev.title}</li>
        ))}
      </ul>
      <p className="r-note">{report?.note ?? "Données de référence, pas des mesures de l'équipage. DÉMO."}</p>
    </Card>
  );
}
