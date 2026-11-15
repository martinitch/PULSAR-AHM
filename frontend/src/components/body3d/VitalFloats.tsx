/* Vital-sign chips around the silhouette. Neutral when nominal, tinted only outside range. */
import { Icon, Lamp, type IconName } from "@/components/ui";
import type { Light } from "@/data/types";

export type VitalFloatItem = {
  id: string;
  label: string;
  value: string | number;
  unit?: string;
  icon: IconName;
  light?: Light;
  zone?: string;
};

const SLOT = ["tl", "tr", "bl", "br"] as const;

export function VitalFloats({ items, hidden, onPick }: { items: VitalFloatItem[]; hidden?: boolean; onPick?: (zone: string) => void }) {
  if (hidden || items.length === 0) return null;
  return (
    <div className="vital-floats">
      {items.slice(0, 4).map((it, i) => {
        const light = it.light ?? "ok";
        const body = (
          <>
            <span className="vf-ico" aria-hidden="true"><Icon name={it.icon} size={16} /></span>
            <span className="vf-copy">
              <span className="vf-lab">{it.label}</span>
              <span className="vf-val mono">{it.value}{it.unit ? <small>{it.unit}</small> : null}</span>
            </span>
            {light !== "ok" && <Lamp l={light} compact />}
          </>
        );
        const cls = `vf vf-${SLOT[i]} is-${light}`;
        const aria = `${it.label} ${it.value}${it.unit ? ` ${it.unit}` : ""}`;
        if (onPick && it.zone) {
          return <button key={it.id} type="button" className={cls} aria-label={aria} onClick={() => onPick(it.zone!)}>{body}</button>;
        }
        return <div key={it.id} className={cls} role="group" aria-label={aria}>{body}</div>;
      })}
    </div>
  );
}
