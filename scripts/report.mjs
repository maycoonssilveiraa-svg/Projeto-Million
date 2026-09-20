import { parseRawFile } from "../src/lib/lottery/types.ts";
import { analyzeFrequency } from "../src/lib/lottery/frequency.ts";
import { analyzePatterns } from "../src/lib/lottery/patterns.ts";
import { analyzePairs } from "../src/lib/lottery/pairs.ts";
import { backtest } from "../src/lib/lottery/backtest.ts";

for (const g of ["megasena", "lotofacil"]) {
  const set = parseRawFile(await Bun.file(`public/data/${g}.json`).json());
  const { game, draws } = set;
  console.log(`\n${"=".repeat(60)}\n${game.name} — ${draws.length} concursos\n${"=".repeat(60)}`);

  const f = analyzeFrequency(draws, game);
  console.log(`\n[FREQUENCIA]`);
  console.log(
    `  qui-quadrado = ${f.uniformity.chi2.toFixed(2)} (df=${f.uniformity.df}, critico 5% = ${f.uniformity.critical5pct.toFixed(2)})`,
  );
  console.log(
    `  p = ${f.uniformity.p.toFixed(4)} → ${f.uniformity.rejectsUniform ? "REJEITA uniformidade" : "compativel com sorteio justo"}`,
  );
  console.log(`  dezenas significativas apos BH: ${f.significantCount} de ${game.pool}`);
  const hot = [...f.stats].sort((a, b) => b.count - a.count).slice(0, 3);
  const cold = [...f.stats].sort((a, b) => a.count - b.count).slice(0, 3);
  console.log(
    `  mais frequentes: ${hot.map((s) => `${s.number}(${s.count}, z=${s.z.toFixed(2)}, q=${s.q.toFixed(2)})`).join(", ")}`,
  );
  console.log(
    `  menos frequentes: ${cold.map((s) => `${s.number}(${s.count}, z=${s.z.toFixed(2)}, q=${s.q.toFixed(2)})`).join(", ")}`,
  );

  const pat = analyzePatterns(draws, game);
  console.log(`\n[PADROES] testes que rejeitam o acaso: ${pat.rejectedCount} de 4`);
  for (const t of [pat.consecutive, pat.parity, pat.repeats, pat.sums.fit]) {
    console.log(
      `  ${t.label.padEnd(34)} chi2=${t.chi2.toFixed(2)} df=${t.df} p=${t.p.toFixed(4)} ${t.rejects ? "REJEITA" : "ok"}`,
    );
  }
  console.log(
    `  soma observada: media ${pat.sums.mean.toFixed(1)} (teorica ${pat.sums.theoreticalMean}), sd ${pat.sums.sd.toFixed(1)} (teorica ${pat.sums.theoreticalSd.toFixed(1)})`,
  );

  const pr = analyzePairs(draws, game);
  console.log(`\n[PARES] ${pr.totalPairs} pares testados`);
  console.log(`  significativos apos BH: ${pr.significantCount}`);
  console.log(`  falsos positivos esperados sem correcao: ${pr.falsePositivesExpected.toFixed(0)}`);
  console.log(
    `  maior |z| observado: ${pr.maxAbsZ.toFixed(2)} (esperado por acaso: ${pr.expectedMaxZ.toFixed(2)})`,
  );
  console.log(`  significativos APOS controlar as marginais: ${pr.significantBeyondMarginals}`);
  console.log(
    `  par mais frequente: ${pr.top[0].a}-${pr.top[0].b} saiu ${pr.top[0].count}x (esperado ${pr.top[0].expected.toFixed(1)}, condicionado ${pr.top[0].expectedCond.toFixed(1)}, zCond=${pr.top[0].zCond.toFixed(2)})`,
  );

  const bt = backtest(draws, game);
  console.log(
    `\n[BACKTEST] ${bt.trials} concursos, acerto medio teorico = ${bt.theoreticalMean.toFixed(4)}`,
  );
  for (const r of bt.results) {
    console.log(
      `  ${r.label.padEnd(30)} ${r.meanHits.toFixed(4)} acertos  delta vs aleatoria ${r.deltaVsRandom >= 0 ? "+" : ""}${r.deltaVsRandom.toFixed(4)} IC95 [${r.deltaCi.low.toFixed(4)}, ${r.deltaCi.high.toFixed(4)}] ${r.beatsRandom ? "SUPERA" : ""}`,
    );
  }
  console.log(`  alguma estrategia supera a aleatoria? ${bt.anyBeatsRandom ? "SIM" : "NAO"}`);
}
