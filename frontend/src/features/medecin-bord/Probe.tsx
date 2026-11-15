/* SIMULATED ultrasound image (demo) — later replaced by the probe stream.
   SVG ids are unique: several probes on the same page do not mix. */
import { useId } from "react";

export function Probe({
  live = true,
  marks = false,
  variant = "heart",
  markLabel,
  callout = true,
  depthCm,
  depthLabel,
  label,
}: {
  live?: boolean;
  marks?: boolean;
  variant?: "heart" | "eye";
  /** Caliper text. Default depends on the view. */
  markLabel?: string;
  /** Crew surgeon "review" arrow. Houston crops it: the caption sits beside the image. */
  callout?: boolean;
  depthCm?: number;
  depthLabel?: string;
  /** Description read by the screen reader. */
  label?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const cm = depthCm ?? (variant === "eye" ? 5 : 14);
  const banner = depthLabel ?? (variant === "eye" ? "PROFONDEUR 5 cm · GAIN 48 %" : "PROFONDEUR 14 cm · GAIN 52 %");
  const caliper = markLabel ?? (variant === "eye" ? "GNO 5,4 mm" : "VG 4,1 cm");
  const ticks = variant === "eye" ? [0, 2.5, cm] : [0, cm / 2, cm];
  return (
    <svg className={`echo-img ${live ? "live" : ""}`} viewBox="0 0 400 300" role="img" aria-label={label ?? "Image d’échographie simulée (démo)"}>
      <defs>
        <radialGradient id={`echoG-${uid}`} cx="50%" cy="0%" r="100%">
          <stop offset="0" stopColor="#c5d4dc" stopOpacity=".72" />
          <stop offset=".45" stopColor="#6d828e" stopOpacity=".45" />
          <stop offset="1" stopColor="#0a0f14" stopOpacity="0" />
        </radialGradient>
        <filter id={`echoN-${uid}`}>
          <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed={variant === "eye" ? "9" : "4"} />
          <feColorMatrix values="0 0 0 0 .86  0 0 0 0 .9  0 0 0 0 .93  0 0 0 .22 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
        <clipPath id={`echoC-${uid}`}><path d="M200 18 L380 260 A300 300 0 0 1 20 260 Z" /></clipPath>
      </defs>
      <rect width="400" height="300" fill="#05080b" />
      <g clipPath={`url(#echoC-${uid})`}>
        <rect width="400" height="300" fill={`url(#echoG-${uid})`} />
        <rect width="400" height="300" filter={`url(#echoN-${uid})`} fill="#fff" />
        {variant === "eye" ? <Eye /> : <Heart />}
      </g>
      <path d="M200 18 L380 260 A300 300 0 0 1 20 260 Z" fill="none" stroke="#d5e2e8" strokeOpacity=".55" />
      <g className="echo-scale" aria-hidden="true">
        <line x1="386" y1="24" x2="386" y2="272" />
        {ticks.map((t, i) => {
          const y = 24 + ((272 - 24) * i) / (ticks.length - 1);
          const text = String(t).replace(".", ",");
          return (
            <g key={text}>
              <line x1="380" y1={y} x2="392" y2={y} />
              <text x="368" y={y + 3} textAnchor="end">{text}</text>
            </g>
          );
        })}
        <text x="392" y="286" textAnchor="end">cm</text>
      </g>
      {marks && variant === "heart" && (
        <g className="echo-marks">
          <line x1="124" y1="168" x2="212" y2="168" />
          <circle cx="124" cy="168" r="3.5" />
          <circle cx="212" cy="168" r="3.5" />
          <text x="128" y="158">{caliper}</text>
          {callout && (<><path d="M230 176 l28 -24" /><text x="236" y="146">Flèche : à revoir</text></>)}
        </g>
      )}
      {marks && variant === "eye" && (
        <g className="echo-marks">
          <line x1="184" y1="214" x2="216" y2="214" />
          <circle cx="184" cy="214" r="3.5" />
          <circle cx="216" cy="214" r="3.5" />
          <text x="168" y="206">{caliper}</text>
        </g>
      )}
      <text x="12" y="20" className="echo-meta">{banner}</text>
      <text x="12" y="290" className="echo-meta">IMAGE SIMULÉE · DÉMO</text>
    </svg>
  );
}

function Heart() {
  return (
    <g fill="#071016" stroke="#e7eef2" strokeWidth="1.6" strokeLinejoin="round">
      <ellipse cx="156" cy="112" rx="28" ry="18" />
      <ellipse cx="228" cy="104" rx="22" ry="16" />
      <ellipse cx="164" cy="172" rx="52" ry="42" />
      <ellipse cx="246" cy="156" rx="30" ry="38" />
      <path d="M198 96 L206 208" fill="none" strokeWidth="2" />
    </g>
  );
}

function Eye() {
  return (
    <g fill="none" stroke="#e7eef2" strokeWidth="1.6" strokeLinejoin="round">
      <circle cx="200" cy="118" r="58" fill="#071016" />
      <circle cx="200" cy="118" r="22" fill="#05080b" />
      <path d="M186 170 L176 248" />
      <path d="M214 170 L224 248" />
    </g>
  );
}
