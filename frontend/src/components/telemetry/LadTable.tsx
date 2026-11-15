/* “Last available value” table (LAD), inspired by Open MCT (no code reused):
   one row per metric: name · time · value · unit · thresholds; row colored ONLY outside limits
   (yellow = caution, red = alert), always with icon + direction arrow (above / below). Stale value indicated. */
import { Icon } from "@/components/ui";
import { useLang } from "@/i18n";

export type LadRow = { key: string; name: string; time?: string; value: number | string | null; unit?: string; orange?: number; rouge?: number; direction?: "above" | "below"; staleSec?: number };

export function limitOf(r: LadRow): "ok" | "caution" | "warning" {
  if (typeof r.value !== "number" || !r.direction) return "ok";
  const past = (t?: number) => t != null && (r.direction === "above" ? (r.value as number) >= t : (r.value as number) <= t);
  return past(r.rouge) ? "warning" : past(r.orange) ? "caution" : "ok";
}

export function LadTable({ rows, caption, staleAfterSec = 600 }: { rows: LadRow[]; caption?: string; staleAfterSec?: number }) {
  const { tr } = useLang();
  return (
    <table className="lad">
      {caption && <caption className="visually-hidden">{caption}</caption>}
      <thead><tr><th scope="col">{tr("Indicateur", "Metric")}</th><th scope="col">{tr("Heure (UTC)", "Time (UTC)")}</th><th scope="col" className="num">{tr("Valeur", "Value")}</th><th scope="col">{tr("Unité", "Unit")}</th><th scope="col" className="num">{tr("Seuil orange", "Orange threshold")}</th><th scope="col" className="num">{tr("Seuil rouge", "Red threshold")}</th></tr></thead>
      <tbody>
        {rows.map((r) => {
          const lim = limitOf(r);
          const stale = r.staleSec != null && r.staleSec > staleAfterSec;
          return (
            <tr key={r.key} className={`${lim !== "ok" ? `is-limit is-limit--${lim}` : ""} ${stale ? "is-stale" : ""}`} data-limit={lim}>
              <th scope="row">
                {lim !== "ok" && <span className="lad-lim"><Icon name={lim === "warning" ? "error" : "warning"} size={14} /><Icon name={r.direction === "below" ? "arrow_downward" : "arrow_upward"} size={12} /><span className="visually-hidden">{lim === "warning" ? tr("Alerte", "Alert") : tr("Attention", "Caution")}, {r.direction === "below" ? tr("sous", "below") : tr("au-dessus de", "above")} {tr("la limite", "the limit")}</span></span>}
                {r.name}
              </th>
              <td className="mono">{r.time ?? "—"}{stale && <span className="lad-stale"> · {tr("périmée", "stale")}</span>}</td>
              <td className="num mono">{r.value ?? "—"}</td>
              <td className="muted">{r.unit}</td>
              <td className="num mono muted">{r.orange != null ? `${r.direction === "below" ? "≤" : "≥"} ${r.orange}` : "—"}</td>
              <td className="num mono muted">{r.rouge != null ? `${r.direction === "below" ? "≤" : "≥"} ${r.rouge}` : "—"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
