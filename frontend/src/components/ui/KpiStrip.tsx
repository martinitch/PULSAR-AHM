import type { ReactNode } from "react";
import type { Light } from "@/data/types";
import { Spark } from "./Spark";
import { Lamp } from "./Status";
import { Icon, type IconName } from "./Icon";

export type KpiItem = {
  id: string;
  label: string;
  value: ReactNode;
  unit?: string;
  meta?: ReactNode;
  spark?: number[];
  light?: Light;
  lamp?: Light;
  /** Information (space cyan), distinct from a medical lamp. */
  info?: boolean;
  icon?: IconName;
};

/** Clinical KPI strip: large mono figure + optional spark + state outside nominal. */
export function KpiStrip({ items, label = "Indicateurs", className }: { items: KpiItem[]; label?: string; className?: string }) {
  return (
    <div className={`kpi-strip${className ? ` ${className}` : ""}`} aria-label={label}>
      {items.map((k) => {
        const tone = k.light === "warning" ? " is-warning" : k.light === "caution" ? " is-caution" : k.info ? " is-info" : "";
        return (
          <article key={k.id} className={`kpi-cell${tone}`}>
            <p className="kpi-cell-l">{k.icon && <Icon name={k.icon} size={14} />}{k.label}</p>
            <p className="kpi-cell-v mono">
              {k.value}
              {k.unit != null && <small>{k.unit}</small>}
            </p>
            {k.spark && k.spark.length > 0 && <Spark v={k.spark} l={k.light ?? "ok"} w={120} h={28} />}
            {(k.lamp || k.meta != null) && (
              <p className="kpi-cell-meta">
                {k.lamp && <Lamp l={k.lamp} compact />}
                {k.meta}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
