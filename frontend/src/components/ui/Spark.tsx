/* Mini trend curve (Recharts), no axis and no gradient. Color: accent, or status color outside nominal. */
import { Line, LineChart, YAxis } from "recharts";
import type { Light } from "@/data/types";

const COLOR: Record<Light, string> = { ok: "var(--accent)", caution: "var(--medium)", warning: "var(--high)" };

export function Spark({ v, l = "ok", w = 120, h = 32 }: { v: number[]; l?: Light; w?: number; h?: number }) {
  const data = v.map((y, i) => ({ i, y }));
  const last = data.length - 1;
  return (
    <span className={`spark spark-${l}`} aria-hidden="true" style={{ display: "inline-block", width: w, height: h }}>
      <LineChart width={w} height={h} data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <Line type="linear" dataKey="y" stroke={COLOR[l]} strokeWidth={2} strokeLinejoin="round" isAnimationActive={false}
          dot={(p: { index?: number; cx?: number; cy?: number }) => (p.index === last ? <circle key="last" cx={p.cx} cy={p.cy} r={3} fill={COLOR[l]} /> : <g key={p.index} />)} activeDot={false} />
      </LineChart>
    </span>
  );
}
