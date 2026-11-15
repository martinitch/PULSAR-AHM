/* Scale for a rate: the marker sits between min and max.
   Color appears only outside nominal (caution / alert), with the word beside it. */

type Direction = "above" | "below";

export function RateScale({
  label,
  value,
  unit,
  min,
  max,
  caution,
  high,
  direction = "above",
  compact = false,
}: {
  label: string;
  value: number;
  unit?: string;
  min: number;
  max: number;
  caution: number;
  high: number;
  direction?: Direction;
  compact?: boolean;
}) {
  const span = Math.max(1, max - min);
  const pct = (n: number) => Math.min(100, Math.max(0, ((n - min) / span) * 100));
  const off = direction === "above" ? value >= high : value <= high;
  const warn = !off && (direction === "above" ? value >= caution : value <= caution);
  const tone = off ? "warning" : warn ? "caution" : "ok";
  const word = off ? "Alerte" : warn ? "Attention" : "Nominal";
  const c = pct(caution);
  const h = pct(high);
  const zones = direction === "above"
    ? [
        { left: 0, width: c },
        { left: c, width: Math.max(0, h - c), tone: "caution" as const },
        { left: h, width: Math.max(0, 100 - h), tone: "warning" as const },
      ]
    : [
        { left: 0, width: h, tone: "warning" as const },
        { left: h, width: Math.max(0, c - h), tone: "caution" as const },
        { left: c, width: Math.max(0, 100 - c) },
      ];

  return (
    <div className={`rate${compact ? " is-compact" : ""}`}>
      {!compact && (
        <div className="rate-h">
          <span>{label}</span>
          <strong className="mono">{value}{unit ? <small> {unit}</small> : null}</strong>
        </div>
      )}
      <div
        className="rate-track"
        role="meter"
        aria-label={`${label} : ${value}${unit ? ` ${unit}` : ""}, ${word}`}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={word}
      >
        {zones.map((z, i) => (
          <i key={i} className={z.tone ? `is-${z.tone}` : undefined} style={{ left: `${z.left}%`, width: `${z.width}%` }} />
        ))}
        <b className={`rate-mark is-${tone}`} style={{ left: `${pct(value)}%` }} />
      </div>
    </div>
  );
}
