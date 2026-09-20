import {
  consecutiveDistribution,
  parityDistribution,
  rangeBuckets,
  repeatDistribution,
  sumDistribution,
} from "./combinatorics";
import { chiSquareFit, type GoodnessOfFit } from "./gof";
import { mean, quantile, stdDev } from "./math";
import type { Draw, GameConfig } from "./types";

export type { GoodnessOfFit };

export interface PatternReport {
  drawCount: number;
  consecutive: GoodnessOfFit & { observedCounts: number[] };
  parity: GoodnessOfFit & { observedCounts: number[] };
  repeats: GoodnessOfFit & { observedCounts: number[] };
  sums: {
    observed: number[];
    mean: number;
    sd: number;
    theoreticalMean: number;
    theoreticalSd: number;
    p10: number;
    p90: number;
    /** Faixa central que concentra 80% dos sorteios, pela teoria. */
    theoreticalBand: { low: number; high: number };
    fit: GoodnessOfFit;
  };
  ranges: { label: string; observed: number; expected: number }[];
  /** Quantos dos testes acima rejeitaram a hipótese de sorteio uniforme. */
  rejectedCount: number;
}

export function analyzePatterns(draws: Draw[], game: GameConfig): PatternReport {
  const n = draws.length;

  // --- Consecutivos ---
  const consProbs = consecutiveDistribution(game.pool, game.picks);
  const consObs = new Array(consProbs.length).fill(0);
  // --- Paridade (ímpares) ---
  const parProbs = parityDistribution(game);
  const parObs = new Array(parProbs.length).fill(0);
  // --- Somas ---
  const sums: number[] = [];
  // --- Faixas ---
  const buckets = rangeBuckets(game);
  const bucketObs = new Array(buckets.length).fill(0);

  for (const draw of draws) {
    let adjacencies = 0;
    let odds = 0;
    let sum = 0;
    for (let i = 0; i < draw.numbers.length; i++) {
      const num = draw.numbers[i]!;
      sum += num;
      if (num % 2 === 1) odds++;
      if (i > 0 && num === draw.numbers[i - 1]! + 1) adjacencies++;
      const b = buckets.findIndex((x) => num >= x.from && num <= x.to);
      if (b >= 0) bucketObs[b]++;
    }
    consObs[Math.min(adjacencies, consProbs.length - 1)]++;
    parObs[odds]++;
    sums.push(sum);
  }

  // --- Repetições em relação ao concurso anterior ---
  const repProbs = repeatDistribution(game);
  const repObs = new Array(repProbs.length).fill(0);
  for (let i = 1; i < draws.length; i++) {
    const prev = new Set(draws[i - 1]!.numbers);
    const overlap = draws[i]!.numbers.filter((x) => prev.has(x)).length;
    repObs[overlap]++;
  }

  // --- Aderência da distribuição de somas ---
  const sd = sumDistribution(game.pool, game.picks);
  const binSize = Math.max(1, Math.round((sd.maxSum - sd.minSum) / 20));
  const sumBinProbs: number[] = [];
  const sumBinObs: number[] = [];
  const sumBinLabels: string[] = [];
  for (let start = sd.minSum; start <= sd.maxSum; start += binSize) {
    const end = Math.min(start + binSize - 1, sd.maxSum);
    let p = 0;
    for (let s = start; s <= end; s++) p += sd.probs.get(s) ?? 0;
    sumBinProbs.push(p);
    sumBinObs.push(sums.filter((x) => x >= start && x <= end).length);
    sumBinLabels.push(`${start}-${end}`);
  }

  const theoMean = (game.picks * (game.pool + 1)) / 2;
  const theoVar = (game.picks * (game.pool + 1) * (game.pool - game.picks)) / 12;
  const sortedTheo = [...sd.probs.entries()].sort((a, b) => a[0] - b[0]);
  const bandAt = (target: number) => {
    let acc = 0;
    for (const [s, p] of sortedTheo) {
      acc += p;
      if (acc >= target) return s;
    }
    return sd.maxSum;
  };

  const sortedSums = [...sums].sort((a, b) => a - b);

  const report: PatternReport = {
    drawCount: n,
    consecutive: {
      ...chiSquareFit(
        "Pares consecutivos",
        consObs,
        consProbs,
        n,
        consProbs.map((_, i) => String(i)),
      ),
      observedCounts: consObs,
    },
    parity: {
      ...chiSquareFit(
        "Dezenas ímpares",
        parObs,
        parProbs,
        n,
        parProbs.map((_, i) => String(i)),
      ),
      observedCounts: parObs,
    },
    repeats: {
      ...chiSquareFit(
        "Repetições do concurso anterior",
        repObs,
        repProbs,
        n - 1,
        repProbs.map((_, i) => String(i)),
      ),
      observedCounts: repObs,
    },
    sums: {
      observed: sums,
      mean: mean(sums),
      sd: stdDev(sums),
      theoreticalMean: theoMean,
      theoreticalSd: Math.sqrt(theoVar),
      p10: quantile(sortedSums, 0.1),
      p90: quantile(sortedSums, 0.9),
      theoreticalBand: { low: bandAt(0.1), high: bandAt(0.9) },
      fit: chiSquareFit("Soma das dezenas", sumBinObs, sumBinProbs, n, sumBinLabels),
    },
    ranges: buckets.map((b, i) => ({
      label: b.label,
      observed: bucketObs[i],
      expected: b.expected * n,
    })),
    rejectedCount: 0,
  };

  report.rejectedCount = [
    report.consecutive,
    report.parity,
    report.repeats,
    report.sums.fit,
  ].filter((t) => t.rejects).length;

  return report;
}
