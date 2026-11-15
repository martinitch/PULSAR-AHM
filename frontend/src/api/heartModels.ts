/* Same three models as the backend (DÉMO fallback if the API is unreachable):
   XGBoost (second-order boosting + trend), seasonal LSTM, Prophet (Fourier).
   Demonstration series. Decision support, not a diagnosis. */
import type { ForecastPoint, HeartLiveForecast } from "./types";

const H = 4;
const LAGS = [1, 2, 3, 6, 12];
const HR: Record<string, number> = { AM: 68, LK: 94, NO: 62, SR: 71 };

const clip = (v: number) => Math.max(40, Math.min(160, v));
const r1 = (v: number) => Math.round(clip(v) * 10) / 10;
const sigmoid = (x: number) => (x > 15 ? 1 : x < -15 ? 0 : 1 / (1 + Math.exp(-x)));
const tanh = (x: number) => Math.tanh(Math.max(-8, Math.min(8, x)));

function solve(a: number[][], b: number[]) {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    [m[col], m[pivot]] = [m[pivot], m[col]];
    const div = m[col][col] || 1e-8;
    for (let j = col; j <= n; j++) m[col][j] /= div;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = m[r][col];
      for (let j = col; j <= n; j++) m[r][j] -= factor * m[col][j];
    }
  }
  return m.map((row) => row[n]);
}

function lstsq(x: number[][], y: number[]) {
  const p = x[0].length;
  const xtx = Array.from({ length: p }, () => Array(p).fill(0));
  const xty = Array(p).fill(0);
  x.forEach((row, i) => {
    for (let a = 0; a < p; a++) {
      xty[a] += row[a] * y[i];
      for (let b = 0; b < p; b++) xtx[a][b] += row[a] * row[b];
    }
  });
  for (let a = 0; a < p; a++) xtx[a][a] += 1e-2;
  return solve(xtx, xty);
}

function dot(row: number[], beta: number[]) {
  return row.reduce((s, v, i) => s + v * beta[i], 0);
}

type Leaf = { w: number };
type Split = { feat: number; thr: number; left: Node; right: Node };
type Node = Leaf | Split;
const isLeaf = (n: Node): n is Leaf => "w" in n;

function features(values: number[], index0: number, idx: number, period: number) {
  const lag = (k: number) => {
    const j = idx - k - index0;
    return j < 0 || j >= values.length ? values[0] : values[j];
  };
  const ang = (2 * Math.PI * idx) / period;
  return [...LAGS.map(lag), Math.sin(ang), Math.cos(ang)];
}

function buildTree(x: number[][], g: number[], idxs: number[], depth: number): Node {
  const total = idxs.reduce((s, i) => s + g[i], 0);
  const leaf = (): Leaf => ({ w: -total / (idxs.length + 1) });
  if (depth === 0 || idxs.length < 6) return leaf();
  let best: { gain: number; feat: number; thr: number; left: number[]; right: number[] } | null = null;
  for (let feat = 0; feat < x[0].length; feat++) {
    const order = [...idxs].sort((a, b) => x[a][feat] - x[b][feat]);
    let gl = 0;
    let seen = 0;
    for (let s = 1; s < order.length; s++) {
      gl += g[order[s - 1]];
      seen++;
      if (x[order[s]][feat] === x[order[s - 1]][feat] || seen < 2 || order.length - seen < 2) continue;
      const gr = total - gl;
      const hr = order.length - seen;
      const gain = 0.5 * ((gl * gl) / (seen + 1) + (gr * gr) / (hr + 1) - (total * total) / (order.length + 1));
      if (!best || gain > best.gain) best = { gain, feat, thr: 0.5 * (x[order[s - 1]][feat] + x[order[s]][feat]), left: order.slice(0, s), right: order.slice(s) };
    }
  }
  if (!best || best.gain <= 0) return leaf();
  return { feat: best.feat, thr: best.thr, left: buildTree(x, g, best.left, depth - 1), right: buildTree(x, g, best.right, depth - 1) };
}

function predictNode(node: Node, row: number[]): number {
  if (isLeaf(node)) return node.w;
  return predictNode(row[node.feat] <= node.thr ? node.left : node.right, row);
}

function lin(values: number[]) {
  const n = values.length;
  const tMean = (n - 1) / 2;
  const yMean = values.reduce((s, v) => s + v, 0) / n;
  const varT = values.reduce((s, _v, i) => s + (i - tMean) ** 2, 0) || 1;
  const cov = values.reduce((s, v, i) => s + (i - tMean) * (v - yMean), 0);
  const slope = cov / varT;
  return { slope, intercept: yMean - slope * tMean };
}

function xgbAhead(values: number[], index0: number, period: number, steps: number) {
  const { slope, intercept } = lin(values);
  const resid = values.map((v, i) => v - (intercept + slope * i));
  const start = Math.min(12, Math.max(2, Math.floor(resid.length / 3)));
  const rows: number[][] = [];
  const y: number[] = [];
  for (let local = start; local < resid.length; local++) {
    rows.push(features(resid, index0, index0 + local, period));
    y.push(resid[local]);
  }
  const init = y.reduce((s, v) => s + v, 0) / y.length;
  let pred = y.map(() => init);
  const trees: Node[] = [];
  for (let round = 0; round < 8; round++) {
    const g = pred.map((p, i) => p - y[i]);
    trees.push(buildTree(rows, g, y.map((_v, i) => i), 2));
    pred = pred.map((p, i) => p + 0.35 * predictNode(trees[round], rows[i]));
  }
  const hist = resid.slice();
  const out: number[] = [];
  let local = values.length;
  let idx = index0 + local;
  for (let s = 0; s < steps; s++) {
    const row = features(hist, index0, idx, period);
    const r = init + 0.35 * trees.reduce((sum, tree) => sum + predictNode(tree, row), 0);
    hist.push(r);
    out.push(clip(intercept + slope * local + r));
    local++;
    idx++;
  }
  return out;
}

function prophetAhead(values: number[], index0: number, period: number, trendScale: number, steps: number) {
  const rowOf = (t: number) => {
    const row = [1, (t - index0) / trendScale];
    for (let k = 1; k <= 3; k++) {
      const ang = (2 * Math.PI * k * t) / period;
      row.push(Math.sin(ang), Math.cos(ang));
    }
    return row;
  };
  const x = values.map((_v, i) => rowOf(index0 + i));
  const beta = lstsq(x, values);
  const resid = values.map((v, i) => v - dot(x[i], beta));
  const mean = resid.reduce((s, v) => s + v, 0) / resid.length;
  const sigma = Math.sqrt(resid.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, resid.length - 1)) || 0.6;
  return Array.from({ length: steps }, (_v, s) => {
    const y = clip(dot(rowOf(index0 + values.length + s), beta));
    const band = 1.28155 * sigma;
    return { y, lo: clip(y - band), hi: clip(y + band) };
  });
}

function rng(seed: number) {
  let state = seed % 2147483647 || 1;
  return () => {
    state = (1103515245 * state + 12345) % 2147483647;
    return (state / 2147483647) * 0.2 - 0.1;
  };
}

function lstmAhead(values: number[], index0: number, period: number, seed: number, steps: number) {
  const zdim = 3 + H;
  const rnd = rng(seed);
  const mat = () => Array.from({ length: H }, () => Array.from({ length: zdim }, () => rnd()));
  const model = {
    Wf: mat(), Wi: mat(), Wo: mat(), Wc: mat(),
    bf: [1, 0, 0, 0], bi: [0, 0, 0, 0], bo: [0, 0, 0, 0], bc: [0, 0, 0, 0],
    Wy: [rnd(), rnd(), rnd(), rnd()], by: 0,
  };
  const scale = (v: number) => (v - 70) / 25;
  const series = values.map(scale);
  const phase = (idx: number) => {
    const ang = (2 * Math.PI * idx) / period;
    return [Math.sin(ang), Math.cos(ang)];
  };
  const gate = (w: number[][], b: number[], z: number[], fn: (x: number) => number) =>
    w.map((row, r) => fn(row.reduce((s, c, i) => s + c * z[i], 0) + b[r]));
  const forward = (x: number, seasonal: number, sn: number, cs: number, h: number[], c: number[]) => {
    const z = [x, sn, cs, ...h];
    const f = gate(model.Wf, model.bf, z, sigmoid);
    const i = gate(model.Wi, model.bi, z, sigmoid);
    const o = gate(model.Wo, model.bo, z, sigmoid);
    const g = gate(model.Wc, model.bc, z, tanh);
    const c2 = c.map((ck, k) => f[k] * ck + i[k] * g[k]);
    const th = c2.map((ck) => tanh(ck));
    const h2 = o.map((ok, k) => ok * th[k]);
    const raw = Math.max(-0.9, Math.min(0.9, model.by + model.Wy.reduce((s, w, k) => s + w * h2[k], 0)));
    return { y: seasonal + raw, h: h2, c: c2, z, f, i, o, g, th };
  };
  const lag = Math.max(1, Math.round(period));
  for (let epoch = 0; epoch < 12; epoch++) {
    let h = [0, 0, 0, 0];
    let c = [0, 0, 0, 0];
    const stepsFit = [];
    for (let t = 0; t < series.length - 1; t++) {
      const [sn, cs] = phase(index0 + t);
      const seasonal = t + 1 >= lag ? series[t + 1 - lag] : series[t];
      const snap = forward(series[t], seasonal, sn, cs, h, c);
      h = snap.h;
      c = snap.c;
      stepsFit.push({ ...snap, target: series[t + 1] });
    }
    const grads = {
      Wf: mat().map((row) => row.map(() => 0)), Wi: mat().map((row) => row.map(() => 0)),
      Wo: mat().map((row) => row.map(() => 0)), Wc: mat().map((row) => row.map(() => 0)),
      bf: [0, 0, 0, 0], bi: [0, 0, 0, 0], bo: [0, 0, 0, 0], bc: [0, 0, 0, 0],
    };
    const dwy = [0, 0, 0, 0];
    let dby = 0;
    let dhNext = [0, 0, 0, 0];
    let dcNext = [0, 0, 0, 0];
    for (let s = stepsFit.length - 1; s >= 0; s--) {
      const snap = stepsFit[s];
      const dy = snap.y - snap.target;
      snap.h.forEach((hk, k) => { dwy[k] += dy * hk; });
      dby += dy;
      const dh = snap.h.map((_hk, k) => dy * model.Wy[k] + dhNext[k]);
      const dc = dh.map((v, k) => v * snap.o[k] * (1 - snap.th[k] ** 2) + dcNext[k]);
      const prev = s > 0 ? stepsFit[s - 1].c : [0, 0, 0, 0];
      const df = dc.map((v, k) => v * prev[k] * snap.f[k] * (1 - snap.f[k]));
      const di = dc.map((v, k) => v * snap.g[k] * snap.i[k] * (1 - snap.i[k]));
      const ddo = dh.map((v, k) => v * snap.th[k] * snap.o[k] * (1 - snap.o[k]));
      const dg = dc.map((v, k) => v * snap.i[k] * (1 - snap.g[k] ** 2));
      dcNext = dc.map((v, k) => v * snap.f[k]);
      const dz = Array(zdim).fill(0);
      ([["Wf", df], ["Wi", di], ["Wo", ddo], ["Wc", dg]] as const).forEach(([name, delta]) => {
        const bias = ("b" + name[1]) as "bf" | "bi" | "bo" | "bc";
        delta.forEach((d, r) => {
          grads[bias][r] += d;
          for (let col = 0; col < zdim; col++) {
            grads[name][r][col] += d * snap.z[col];
            dz[col] += model[name][r][col] * d;
          }
        });
      });
      dhNext = dz.slice(3);
    }
    (["Wf", "Wi", "Wo", "Wc"] as const).forEach((name) => {
      for (let r = 0; r < H; r++) for (let col = 0; col < zdim; col++) model[name][r][col] -= 0.06 * Math.max(-1, Math.min(1, grads[name][r][col]));
    });
    (["bf", "bi", "bo", "bc"] as const).forEach((name) => {
      for (let r = 0; r < H; r++) model[name][r] -= 0.06 * Math.max(-1, Math.min(1, grads[name][r]));
    });
    for (let k = 0; k < H; k++) model.Wy[k] -= 0.06 * Math.max(-1, Math.min(1, dwy[k]));
    model.by -= 0.06 * Math.max(-1, Math.min(1, dby));
  }
  let h = [0, 0, 0, 0];
  let c = [0, 0, 0, 0];
  for (let t = 0; t < series.length - 1; t++) {
    const [sn, cs] = phase(index0 + t);
    const seasonal = t + 1 >= lag ? series[t + 1 - lag] : series[t];
    const snap = forward(series[t], seasonal, sn, cs, h, c);
    h = snap.h;
    c = snap.c;
  }
  const extended = series.slice();
  const out: number[] = [];
  for (let s = 0; s < steps; s++) {
    const t = series.length - 1 + s;
    const [sn, cs] = phase(index0 + t);
    const seasonal = t + 1 >= lag ? extended[t + 1 - lag] : extended[t];
    const snap = forward(extended[t], seasonal, sn, cs, h, c);
    h = snap.h;
    c = snap.c;
    extended.push(snap.y);
    out.push(clip(snap.y * 25 + 70));
  }
  return out;
}

export function forecastTrio(values: number[], steps: number, period: number, trendScale = 1, seed = 17) {
  const index0 = 0;
  const xgb = xgbAhead(values, index0, period, steps);
  const lstm = lstmAhead(values, index0, period, seed, steps);
  const prophet = prophetAhead(values, index0, period, trendScale, steps);
  return xgb.map((xg, i) => {
    const trio = [xg, lstm[i], prophet[i].y].sort((a, b) => a - b);
    return {
      predicted: r1(trio[1]),
      lower: r1(Math.min(trio[0], prophet[i].lo)),
      upper: r1(Math.max(trio[2], prophet[i].hi)),
      xgboost: r1(xg),
      lstm: r1(lstm[i]),
      prophet: r1(prophet[i].y),
    };
  });
}

export function applyHeartModels(points: ForecastPoint[], period: number): ForecastPoint[] {
  const observed = points.filter((p) => p.observed != null).map((p) => p.observed!);
  const future = points.filter((p) => p.predicted != null && p.observed == null);
  if (observed.length < 4 || !future.length) return points;
  const trio = forecastTrio(observed, future.length, period, 1, 17 + Math.round(period));
  let n = 0;
  return points.map((p) => {
    if (p.observed != null && p.predicted != null) {
      return { ...p, xgboost: p.observed, lstm: p.observed, prophet: p.observed };
    }
    if (p.predicted != null && p.observed == null) return { ...p, ...trio[n++] };
    return p;
  });
}

export function mockHeartLive(astronautId: string, until?: string): HeartLiveForecast {
  const base = HR[astronautId] ?? 70;
  const endMs = until ? Date.parse(until) : Date.now();
  const end = Math.floor(endMs / 1000 / 2) * 2;
  const hist = Array.from({ length: 60 }, (_v, i) => {
    const sec = end - (59 - i) * 2;
    return { sec, hr: Math.round(base + 3 * Math.sin(sec / 9)) };
  });
  const period = (2 * Math.PI * 9) / 2;
  const trio = forecastTrio(hist.map((p) => p.hr), 45, period, 1800, [...astronautId].reduce((s, c) => s + c.charCodeAt(0), 0));
  const iso = (sec: number) => new Date(sec * 1000).toISOString().replace(".000Z", "Z");
  const points: HeartLiveForecast["points"] = hist.map((p) => ({ timestamp: iso(p.sec), heartRate: p.hr }));
  const last = points[points.length - 1];
  last.xgboost = last.heartRate;
  last.lstm = last.heartRate;
  last.prophet = last.heartRate;
  trio.forEach((row, s) => points.push({ timestamp: iso(end + (s + 1) * 2), ...row }));
  return {
    astronautId,
    generatedAt: iso(end),
    stepSec: 2,
    models: ["xgboost", "lstm", "prophet"],
    note: "Aide à la décision, pas un diagnostic. Série de démonstration.",
    points,
  };
}
