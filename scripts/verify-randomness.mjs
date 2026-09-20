// Valida o p-valor exato de Fisher contra simulação Monte Carlo.
import { fisherGPValue } from "../src/lib/lottery/randomness.ts";
import { makeRng } from "../src/lib/lottery/math.ts";

const rng = makeRng(7);
const normal = () => {
  const u = Math.max(rng(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
};

const n = 101;
const m = Math.floor((n - 1) / 2);
const SIMS = 20000;
const gs = [];

for (let s = 0; s < SIMS; s++) {
  const x = Array.from({ length: n }, normal);
  const avg = x.reduce((a, b) => a + b, 0) / n;
  const c = x.map((v) => v - avg);
  let peak = 0,
    total = 0;
  for (let f = 1; f <= m; f++) {
    const w = (2 * Math.PI * f) / n;
    let re = 0,
      im = 0;
    for (let t = 0; t < n; t++) {
      re += c[t] * Math.cos(w * t);
      im += c[t] * Math.sin(w * t);
    }
    const p = (re * re + im * im) / n;
    total += p;
    if (p > peak) peak = p;
  }
  gs.push(peak / total);
}
gs.sort((a, b) => a - b);

let fails = 0;
for (const alpha of [0.5, 0.2, 0.1, 0.05, 0.01]) {
  const empirical = gs[Math.floor((1 - alpha) * SIMS)];
  const formula = fisherGPValue(empirical, m);
  const ok = Math.abs(formula - alpha) < 0.015;
  if (!ok) fails++;
  console.log(
    `${ok ? "ok  " : "FAIL"} alpha=${alpha}: g critico simulado ${empirical.toFixed(4)} -> p da formula ${formula.toFixed(4)}`,
  );
}
console.log(fails === 0 ? "\nFORMULA DE FISHER CONFERE" : `\n${fails} FALHAS`);
process.exit(fails ? 1 : 0);
