import { parseRawFile } from "../src/lib/lottery/types.ts";
import { analyzeStructure } from "../src/lib/lottery/structure.ts";
import { analyzeRandomness } from "../src/lib/lottery/randomness.ts";
import { analyzePower } from "../src/lib/lottery/power.ts";
import { hardenedBacktest } from "../src/lib/lottery/backtest.ts";

for (const g of ["megasena", "lotofacil"]) {
  const { game, draws } = parseRawFile(await Bun.file(`public/data/${g}.json`).json());
  console.log(`\n${"█".repeat(64)}\n ${game.name} — ${draws.length} concursos\n${"█".repeat(64)}`);

  const st = analyzeStructure(draws, game);
  console.log(`\n[ESTRUTURA] ${st.rejectedCount} de ${st.totalTests} testes rejeitam`);
  for (const o of st.orderStats) {
    console.log(
      `  ${o.label.padEnd(10)} media ${o.observedMean.toFixed(2)} (exata ${o.expectedMean.toFixed(2)})  chi2=${o.fit.chi2.toFixed(1)} p=${o.fit.p.toFixed(4)} ${o.fit.rejects ? "REJEITA" : "ok"}`,
    );
  }
  console.log(
    `  espacamento medio ${st.spacings.observedMean.toFixed(2)} (exato ${st.spacings.expectedMean.toFixed(2)}) p=${st.spacings.fit.p.toFixed(4)} ${st.spacings.fit.rejects ? "REJEITA" : "ok"}`,
  );
  console.log(
    `  amplitude media   ${st.range.observedMean.toFixed(2)} (exata ${st.range.expectedMean.toFixed(2)}) p=${st.range.fit.p.toFixed(4)} ${st.range.fit.rejects ? "REJEITA" : "ok"}`,
  );

  const rd = analyzeRandomness(draws, game);
  console.log(`\n[ALEATORIEDADE] ${rd.rejectedCount} de ${rd.totalTests} testes rejeitam`);
  const lagsSig = rd.lags.filter((l) => l.significant);
  console.log(`  sobreposicao por lag: ${lagsSig.length} de ${rd.lags.length} significativos`);
  console.log(
    `    lag 1: ${rd.lags[0].observedMean.toFixed(3)} dezenas (esperado ${rd.lags[0].expectedMean.toFixed(3)}) z=${rd.lags[0].z.toFixed(2)} q=${rd.lags[0].q.toFixed(3)}`,
  );
  console.log(
    `  intervalo entre aparicoes: media ${rd.gaps.observedMean.toFixed(2)} (geometrica ${rd.gaps.expectedMean.toFixed(2)}) chi2 p=${rd.gaps.fit.p.toFixed(4)} ${rd.gaps.fit.rejects ? "REJEITA" : "ok"}`,
  );
  console.log(
    `  correlacao atraso x sair: r=${rd.gaps.delayCorrelation.toFixed(5)} p=${rd.gaps.delayP.toFixed(4)}  <- teste das "atrasadas"`,
  );
  console.log(
    `  runs test: ${rd.runs.significantCount} dezenas significativas (esperado por acaso ${rd.runs.expectedByChance.toFixed(1)})`,
  );
  console.log(`  periodicidade (Fisher g): ${rd.periodicity.significantCount} dezenas com ciclo`);
  console.log(
    `  entropia ${rd.entropy.toFixed(4)} bits de ${rd.maxEntropy.toFixed(4)} maximos (${((rd.entropy / rd.maxEntropy) * 100).toFixed(3)}%)`,
  );

  const pw = analyzePower(draws.length, game);
  console.log(`\n[PODER]`);
  console.log(
    `  MDE por dezena (alfa corrigido): taxa ${(pw.mde.baseRate * 100).toFixed(2)}% -> detecta a partir de ${(pw.mde.detectableRate * 100).toFixed(2)}% (${pw.mde.relativePercent.toFixed(1)}% relativo)`,
  );
  console.log(`  MDE sem correcao: ${pw.mdeUncorrected.relativePercent.toFixed(1)}% relativo`);
  console.log(
    `  teste global detecta vies de uma dezena a partir de ${pw.global.singleNumberBiasPercent.toFixed(1)}%`,
  );
  for (const s of pw.scenarios) {
    console.log(
      `    para detectar ${s.label}: ${s.draws.toLocaleString("pt-BR")} concursos (~${s.years.toFixed(0)} anos)`,
    );
  }

  const hb = hardenedBacktest(draws, game, { seeds: 8 });
  console.log(`\n[BACKTEST ENDURECIDO] ${hb.seeds} sementes`);
  for (const s of hb.stability) {
    console.log(
      `  ${s.label.padEnd(30)} delta ${s.delta >= 0 ? "+" : ""}${s.delta.toFixed(4)} IC95 [${s.ci.low.toFixed(4)}, ${s.ci.high.toFixed(4)}]  q=${s.q.toFixed(3)} ${s.significant ? "SUPERA" : ""}  | vs teoria z=${s.zVsTheory.toFixed(2)} q=${s.qVsTheory.toFixed(3)}`,
    );
  }
  console.log(`  sobreviventes apos correcao: ${hb.survivorsAfterCorrection}`);
  console.log(
    `  DATA SNOOPING (${hb.snooping.splits.length} divisoes, ${hb.snooping.championChanges} campeas distintas)`,
  );
  for (const sp of hb.snooping.splits) {
    console.log(
      `    corte ${String(sp.splitAt).padStart(5)}: ${sp.winnerLabel.padEnd(28)} dentro ${sp.inSampleDelta >= 0 ? "+" : ""}${sp.inSampleDelta.toFixed(4)}  fora ${sp.outOfSampleDelta >= 0 ? "+" : ""}${sp.outOfSampleDelta.toFixed(4)}`,
    );
  }
  console.log(
    `    media dentro: ${hb.snooping.meanInSample >= 0 ? "+" : ""}${hb.snooping.meanInSample.toFixed(4)}   media fora: ${hb.snooping.meanOutOfSample >= 0 ? "+" : ""}${hb.snooping.meanOutOfSample.toFixed(4)}`,
  );
  console.log(
    `    evaporou: ${hb.snooping.shrinkage.toFixed(4)} (${hb.snooping.shrinkagePercent.toFixed(0)}%)`,
  );
}
