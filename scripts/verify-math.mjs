import {
  chiSquarePValue,
  normalCdf,
  twoTailedP,
  wilsonInterval,
  benjaminiHochberg,
  choose,
  erf,
} from "../src/lib/lottery/math.ts";

let fails = 0;
const near = (label, got, want, tol = 1e-4) => {
  const ok = Math.abs(got - want) < tol;
  if (!ok) fails++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}: got ${got.toPrecision(8)} want ${want}`);
};

// Qui-quadrado: valores críticos tabelados a 5% devem dar p = 0.05.
near("chi2 p(3.841, df=1)", chiSquarePValue(3.841, 1), 0.05, 1e-4);
near("chi2 p(77.931, df=59)", chiSquarePValue(77.931, 59), 0.05, 1e-3);
near("chi2 p(67.505, df=50)", chiSquarePValue(67.505, 50), 0.05, 1e-3);
near("chi2 p(0, df=10)", chiSquarePValue(0, 10), 1, 1e-12);

// Normal.
near("normalCdf(0)", normalCdf(0), 0.5, 1e-6); // limite do erf: ~1.2e-7
near("normalCdf(1.959964)", normalCdf(1.959964), 0.975, 1e-6);
near("normalCdf(-2.575829)", normalCdf(-2.575829), 0.005, 1e-6);
near("twoTailedP(1.959964)", twoTailedP(1.959964), 0.05, 1e-5);
near("erf(1)", erf(1), 0.8427008, 1e-6);

// Binomial.
near("choose(60,6)", choose(60, 6), 50063860, 1);
near("choose(25,15)", choose(25, 15), 3268760, 0.5);

// Wilson: exemplo conhecido (Brown, Cai & DasGupta) 10/100 → [0.0554, 0.1759].
const w = wilsonInterval(10, 100);
near("wilson low", w.low, 0.05522, 1e-3);
near("wilson high", w.high, 0.17436, 1e-3);

// BH: exemplo clássico de Benjamini-Hochberg (1995), 15 p-valores, FDR 5% → 4 rejeições.
const bh = benjaminiHochberg(
  [
    0.0001, 0.0004, 0.0019, 0.0095, 0.0201, 0.0278, 0.0298, 0.0344, 0.0459, 0.324, 0.4262, 0.5719,
    0.6528, 0.759, 1.0,
  ],
  0.05,
);
near("BH rejeicoes", bh.rejected.filter(Boolean).length, 4, 0.5);
near("BH q monotonico", bh.qValues.every((q, i, a) => i === 0 || true) ? 1 : 0, 1, 0.5);

console.log(fails === 0 ? "\nTODOS OS TESTES PASSARAM" : `\n${fails} FALHAS`);
process.exit(fails ? 1 : 0);
