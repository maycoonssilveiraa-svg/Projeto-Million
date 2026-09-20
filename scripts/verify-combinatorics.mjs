import {
  consecutiveDistribution,
  sumDistribution,
  parityDistribution,
  repeatDistribution,
  hypergeometric,
} from "../src/lib/lottery/combinatorics.ts";
import { GAMES } from "../src/lib/lottery/types.ts";

let fails = 0;
const near = (l, got, want, tol = 1e-6) => {
  const ok = Math.abs(got - want) < tol;
  if (!ok) fails++;
  console.log(`${ok ? "ok  " : "FAIL"} ${l}: ${got.toPrecision(8)} vs ${want}`);
};
const sums = (l, arr) =>
  near(
    `${l} soma 1`,
    arr.reduce((a, b) => a + b, 0),
    1,
    1e-9,
  );

const ms = GAMES.megasena;
const cons = consecutiveDistribution(ms.pool, ms.picks);
near("MS P(0 consecutivos)", cons[0], 0.579, 1e-4); // valor conhecido
sums("MS consecutivos", cons);

const par = parityDistribution(ms);
sums("MS paridade", par);
near("MS P(3 impares)", par[3], hypergeometric(60, 30, 6, 3), 1e-12);

const rep = repeatDistribution(ms);
sums("MS repeticoes", rep);
near("MS P(0 repeticoes)", rep[0], hypergeometric(60, 6, 6, 0), 1e-12);

const sd = sumDistribution(ms.pool, ms.picks);
near("MS soma minima", sd.minSum, 21, 0.5);
near("MS soma maxima", sd.maxSum, 345, 0.5);
sums("MS distribuicao de somas", [...sd.probs.values()]);
const esperada = [...sd.probs.entries()].reduce((a, [s, p]) => a + s * p, 0);
near("MS soma esperada", esperada, 6 * 30.5, 1e-6); // k*(n+1)/2

const lf = GAMES.lotofacil;
const sdl = sumDistribution(lf.pool, lf.picks);
sums("LF distribuicao de somas", [...sdl.probs.values()]);
near(
  "LF soma esperada",
  [...sdl.probs.entries()].reduce((a, [s, p]) => a + s * p, 0),
  15 * 13,
  1e-6,
);

console.log(fails === 0 ? "\nTODOS OS TESTES PASSARAM" : `\n${fails} FALHAS`);
process.exit(fails ? 1 : 0);
