// Confere a aproximação de Patnaik e o MDE contra simulação.
import { noncentralChiSquareCdf, numberMde, normalQuantile } from "../src/lib/lottery/power.ts";
import { makeRng } from "../src/lib/lottery/math.ts";
import { GAMES } from "../src/lib/lottery/types.ts";

let fails = 0;
const near = (l, got, want, tol) => {
  const ok = Math.abs(got - want) < tol;
  if (!ok) fails++;
  console.log(`${ok ? "ok  " : "FAIL"} ${l}: ${got.toPrecision(6)} vs ${want.toPrecision(6)}`);
};

// Quantis da normal contra valores tabelados.
near("z(0.975)", normalQuantile(0.975), 1.959964, 1e-4);
near("z(0.8)", normalQuantile(0.8), 0.841621, 1e-4);
near("z(1 - 0.05/60/2)", normalQuantile(1 - 0.05 / 60 / 2), 3.341479, 1e-3);

// Patnaik contra Monte Carlo da qui-quadrado nao central.
const rng = makeRng(11);
const normal = () =>
  Math.sqrt(-2 * Math.log(Math.max(rng(), 1e-12))) * Math.cos(2 * Math.PI * rng());
for (const [df, lambda, x] of [
  [5, 3, 12],
  [10, 8, 20],
  [59, 20, 78],
]) {
  const SIMS = 40000;
  let below = 0;
  const shift = Math.sqrt(lambda);
  for (let s = 0; s < SIMS; s++) {
    let acc = (normal() + shift) ** 2;
    for (let i = 1; i < df; i++) acc += normal() ** 2;
    if (acc <= x) below++;
  }
  near(
    `Patnaik df=${df} lambda=${lambda} x=${x}`,
    noncentralChiSquareCdf(x, df, lambda),
    below / SIMS,
    0.02,
  );
}

// MDE: simula o poder real no ponto declarado como detectavel.
const game = GAMES.megasena;
const n = 3059;
const mde = numberMde(n, game);
const p1 = mde.detectableRate;
const p0 = game.picks / game.pool;
const zc = normalQuantile(1 - 0.05 / game.pool / 2);
const sd = Math.sqrt((p0 * (1 - p0)) / n);
let detected = 0;
const SIMS = 20000;
for (let s = 0; s < SIMS; s++) {
  let hits = 0;
  for (let i = 0; i < n; i++) if (rng() < p1) hits++;
  if (Math.abs(hits / n - p0) / sd > zc) detected++;
}
near("poder empirico no MDE", detected / SIMS, 0.8, 0.03);
console.log(
  `\nMDE: taxa base ${(p0 * 100).toFixed(2)}% -> detectavel ${(p1 * 100).toFixed(2)}% (${mde.relativePercent.toFixed(1)}% relativo)`,
);

console.log(fails === 0 ? "\nTODOS OS TESTES PASSARAM" : `\n${fails} FALHAS`);
process.exit(fails ? 1 : 0);
