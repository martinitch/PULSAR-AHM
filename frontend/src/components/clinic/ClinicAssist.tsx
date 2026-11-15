/* Clinical assist panel (inspired by « Aria AI ») — alerts + insights.
   Decision support, not a diagnosis. No glass / glow. */
import type { ReactNode } from "react";
import { Icon, Lamp, type IconName } from "@/components/ui";
import type { Light } from "@/data/types";
import { useLang } from "@/i18n";

export type ClinicInsight = {
  id: string;
  light: Light;
  title: string;
  detail: string;
  meta?: string;
  icon?: IconName;
};

export function ClinicAssist({
  title,
  items,
  footer,
  onOpen,
}: {
  title?: string;
  items: ClinicInsight[];
  footer?: ReactNode;
  onOpen?: () => void;
}) {
  const { tr } = useLang();
  const heading = title ?? tr("Aide clinique", "Clinical assist");
  return (
    <section className="clinic-assist r-card" aria-labelledby="clinic-assist-h">
      <header className="clinic-assist-h">
        <div>
          <h2 id="clinic-assist-h">{heading}</h2>
        </div>
        {onOpen && (
          <button type="button" className="btn btn-ghost sm" onClick={onOpen}>
            <Icon name="insights" size={16} /> {tr("Détail", "Detail")}
          </button>
        )}
      </header>
      {items.length === 0 ? (
        <p className="r-note">{tr("Aucun signal hors nominal pour le moment.", "No off-nominal signal right now.")}</p>
      ) : (
        <ul className="clinic-assist-list">
          {items.map((it) => (
            <li key={it.id} className={`clinic-assist-item is-${it.light}`}>
              <Lamp l={it.light} compact />
              <div>
                <strong>{it.title}</strong>
                <p>{it.detail}</p>
                {it.meta && <small className="mono">{it.meta}</small>}
              </div>
            </li>
          ))}
        </ul>
      )}
      {footer}
    </section>
  );
}
