/* Care-plan / measurement strip — plain clinical timeline. */
import { Icon, Lamp, type IconName } from "@/components/ui";
import type { Light } from "@/data/types";
import { useLang } from "@/i18n";

export type CareStep = {
  id: string;
  time: string;
  title: string;
  detail?: string;
  light?: Light;
  icon?: IconName;
  done?: boolean;
};

export function CareTimeline({
  title,
  steps,
}: {
  title?: string;
  steps: CareStep[];
}) {
  const { tr } = useLang();
  const heading = title ?? tr("Plan de soins · J127", "Care plan · D127");
  return (
    <section className="care-tl r-card" aria-labelledby="care-tl-h">
      <header className="a01-card-h">
        <h2 id="care-tl-h"><Icon name="history" size={18} /> {heading}</h2>
      </header>
      <ol className="care-tl-list">
        {steps.map((s) => (
          <li key={s.id} className={s.done ? "is-done" : undefined}>
            <span className="care-tl-time mono">{s.time}</span>
            <span className="care-tl-dot" aria-hidden="true">
              {s.done ? <Icon name="check_circle" size={16} /> : <Icon name={s.icon ?? "circle"} size={16} />}
            </span>
            <div>
              <strong>{s.title}</strong>
              {s.detail && <p>{s.detail}</p>}
              {s.light && s.light !== "ok" && <Lamp l={s.light} compact />}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
