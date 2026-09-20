// Confere as fórmulas exatas contra enumeração exaustiva em casos pequenos.
import {
  orderStatDistribution,
  spacingDistribution,
  rangeDistribution,
  orderStatMean,
} from "../src/lib/lottery/structure.ts";

let fails = 0;
const near = (l, got, want, tol = 1e-9) => {
  const ok = Math.abs(got - want) < tol;
  if (!ok) fails++;
  console.log(`${ok ? "ok  " : "FAIL"} ${l}: ${got.toPrecision(10)} vs ${want.toPrecision(10)}`);
};

function* subsets(pool, picks, start = 1, acc = []) {
  if (acc.length === picks) {
    yield acc;
    return;
  }
  for (let x = start; x <= pool; x++) yield* subsets(pool, picks, x + 1, [...acc, x]);
}

// Força bruta em N=12, k=4 (495 combinações) e N=10, k=3 (120).
for (const [N, k] of [
  [12, 4],
  [10, 3],
  [9, 5],
]) {
  const all = [...subsets(N, k)];
  const total = all.length;

  for (let j = 1; j <= k; j++) {
    const brute = new Array(N + 1).fill(0);
    for (const s of all) brute[s[j - 1]]++;
    const formula = orderStatDistribution(N, k, j);
    let diff = 0;
    for (let x = 0; x <= N; x++) diff = Math.max(diff, Math.abs(brute[x] / total - formula[x]));
    near(`N=${N} k=${k} ordem j=${j}`, diff, 0, 1e-12);

    const bruteMean = all.reduce((a, s) => a + s[j - 1], 0) / total;
    near(`N=${N} k=${k} media ordem j=${j}`, orderStatMean(N, k, j), bruteMean, 1e-12);
  }

  const bruteSp = new Array(N + 1).fill(0);
  let spCount = 0;
  for (const s of all)
    for (let i = 1; i < k; i++) {
      bruteSp[s[i] - s[i - 1]]++;
      spCount++;
    }
  const fSp = spacingDistribution(N, k);
  let dSp = 0;
  for (let d = 0; d <= N; d++) dSp = Math.max(dSp, Math.abs(bruteSp[d] / spCount - fSp[d]));
  near(`N=${N} k=${k} espacamentos`, dSp, 0, 1e-12);

  const bruteR = new Array(N + 1).fill(0);
  for (const s of all) bruteR[s[k - 1] - s[0]]++;
  const fR = rangeDistribution(N, k);
  let dR = 0;
  for (let r = 0; r <= N; r++) dR = Math.max(dR, Math.abs(bruteR[r] / total - fR[r]));
  near(`N=${N} k=${k} amplitude`, dR, 0, 1e-12);
}

console.log(fails === 0 ? "\nTODOS OS TESTES PASSARAM" : `\n${fails} FALHAS`);
process.exit(fails ? 1 : 0);
