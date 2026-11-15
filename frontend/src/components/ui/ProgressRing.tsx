/* Progress ring (right-hand panel, product-dashboard style). */
export function ProgressRing({
  value, total, label, sub,
}: {
  value: number;
  total: number;
  label?: string;
  sub?: string;
}) {
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  const R = 54;
  const C = 2 * Math.PI * R;
  const done = pct * C;
  return (
    <div className="progress-ring" role="img" aria-label={`${value} sur ${total} ${label ?? ""}`}>
      <svg viewBox="0 0 140 140" aria-hidden="true">
        <circle className="pr-track" cx="70" cy="70" r={R} />
        <circle className="pr-arc" cx="70" cy="70" r={R} strokeDasharray={`${done} ${C}`} transform="rotate(-90 70 70)" />
        <circle className="pr-arc-2" cx="70" cy="70" r={R} strokeDasharray={`${Math.max(0, (1 - pct) * C * 0.35)} ${C}`} strokeDashoffset={-done} transform="rotate(-90 70 70)" />
      </svg>
      <div className="pr-read">
        <strong className="mono">{value}</strong>
        <span>{label ?? "faites"}</span>
        {sub && <small>{sub}</small>}
      </div>
    </div>
  );
}
