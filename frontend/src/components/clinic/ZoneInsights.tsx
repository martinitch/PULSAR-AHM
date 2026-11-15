/* Biomarker chips per anatomical zone — around the 3D silhouette. */
import { Icon, Lamp } from "@/components/ui";
import type { Light } from "@/data/types";
import { ZONES3D, type ZoneState } from "@/components/body3d";
import { useLang, ZONE_NAME_EN } from "@/i18n";

const STATE_LIGHT: Record<ZoneState, Light> = {
  nominal: "ok",
  medium: "caution",
  high: "warning",
  active: "ok",
  none: "ok",
};

export function ZoneInsights({
  states,
  onPick,
}: {
  states: Record<string, ZoneState>;
  onPick?: (id: string) => void;
}) {
  const { tr, lang } = useLang();
  const rows = ZONES3D.filter((z) => states[z.id] && states[z.id] !== "none").slice(0, 6);
  const name = (id: string, label: string) => (lang === "en" ? ZONE_NAME_EN[id] ?? label : label);
  return (
    <ul className="zone-insights" aria-label={tr("Indicateurs par zone", "Readings by zone")}>
      {rows.map((z) => {
        const st = states[z.id] ?? "nominal";
        const light = STATE_LIGHT[st];
        return (
          <li key={z.id}>
            <button type="button" className={`zone-chip is-${st}`} onClick={() => onPick?.(z.id)}>
              <Lamp l={light} compact />
              <span>
                <strong>{name(z.id, z.label)}</strong>
                <small className="mono">{st === "nominal" ? tr("nominal", "nominal") : st === "medium" ? tr("attention", "caution") : tr("alerte", "alert")}</small>
              </span>
              <Icon name="chevron_right" size={14} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
