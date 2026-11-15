/* State-distribution donut (crew / day) — Recharts, tokens only. */
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Icon } from "@/components/ui";

export type DonutSlice = { id: string; label: string; value: number; color: string };

export function StatusDonut({
  title,
  slices,
  center,
}: {
  title: string;
  slices: DonutSlice[];
  center?: string;
}) {
  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  const data = slices.filter((s) => s.value > 0);
  return (
    <section className="status-donut r-card" aria-labelledby="status-donut-h">
      <header className="a01-card-h">
        <h2 id="status-donut-h"><Icon name="monitoring" size={18} /> {title}</h2>
      </header>
      <div className="status-donut-body">
        <div className="status-donut-chart" role="img" aria-label={slices.map((s) => `${s.label} ${s.value}`).join(", ")}>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                innerRadius={42}
                outerRadius={58}
                paddingAngle={2}
                stroke="var(--surface)"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {data.map((s) => <Cell key={s.id} fill={s.color} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 4, fontSize: 12 }}
                itemStyle={{ color: "var(--text)" }}
              />
            </PieChart>
          </ResponsiveContainer>
          {center && <p className="status-donut-center mono">{center}</p>}
        </div>
        <ul className="status-donut-legend">
          {slices.map((s) => (
            <li key={s.id}>
              <i style={{ background: s.color }} aria-hidden="true" />
              <span>{s.label}</span>
              <b className="mono">{s.value}</b>
              <small className="mono">{Math.round((s.value / total) * 100)} %</small>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
