/* PULSAR brand — clinical monogram (circle + orbit + ECG), colors = tokens.
   No « glossy » PNG, no decorative stars. Export assets: public/brand/. */
export function Emblem({ size = 28, className }: { size?: number; className?: string }) {
  const sw = size < 40 ? 1.6 : 1.4;
  return (
    <svg
      className={`emblem ${className ?? ""}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="30" stroke="var(--accent)" strokeWidth={sw} fill="var(--bg)" />
      <ellipse
        cx="32"
        cy="32"
        rx="22"
        ry="10"
        transform="rotate(-28 32 32)"
        stroke="var(--accent)"
        strokeWidth={sw * 0.7}
        opacity={0.7}
      />
      <path
        d="M8 33h14l3-10 4 18 3-12 2 4h8l3-10 4 18 3-12 2 4h7"
        stroke="var(--accent)"
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="48" cy="18" r={size < 40 ? 2 : 2.4} fill="var(--text)" />
    </svg>
  );
}

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <span className="logo" aria-label="PULSAR">
      <Emblem size={size} />
      <span className="logo-word" aria-hidden="true">PULSAR</span>
    </span>
  );
}
