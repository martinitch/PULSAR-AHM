/* Fixed banner: confirmation, or « Backend requis ». Icon + words, never color alone. */
import { Icon } from "./Icon";
import { dismissNotice, useNotices } from "./noticeStore";
import { useLang } from "@/i18n";

export function NoticeHost() {
  const items = useNotices();
  const { tr } = useLang();
  if (!items.length) return null;
  return (
    <div className="notice-host" aria-live="polite" aria-relevant="additions">
      {items.map((n) => (
        <div key={n.id} className={`notice notice-${n.kind}`} role="status" data-testid="notice">
          <Icon name={n.kind === "backend" ? "cloud_off" : "check_circle"} size={20} />
          <div>
            <strong>{n.title}</strong>
            <p>{n.detail}</p>
          </div>
          <button type="button" className="icon-btn" aria-label={tr("Fermer la notification", "Dismiss notification")} onClick={() => dismissNotice(n.id)}>
            <Icon name="close" size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
