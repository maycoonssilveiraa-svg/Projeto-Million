import { normalCdf, stdDev } from "./math";
import type { Draw, GameConfig } from "./types";

export interface TrendStat {
  number: number;
  /** Inclinação da regressão linear da ocorrência (0/1) ao longo do tempo. */
  slope: number;
  /** Erro-padrão da inclinação. */
  se: number;
  /** t = slope / se. */
  t: number;
  p: number;
  /** Frequência na primeira metade da janela, em %. */
  firstHalf: number;
  /** Frequência na segunda metade, em %. */
  secondHalf: number;
  direction: "subindo" | "descendo" | "estável";
}

export interface TrendReport {
  window: number;
  stats: TrendStat[];
  /** Dezenas com tendência significativa a 5% SEM correção de múltiplos testes. */
  naiveSignificant: number;
  /** Quantas apareceriam por puro acaso. É o mesmo número, e esse é o ponto. */
  expectedByChance: number;
}

/**
 * Regressão da ocorrência de cada dezena contra o tempo. O site original chama
 * isto de "análise preditiva"; aqui ele vem acompanhado do número de achados
 * que o acaso produziria sozinho, que é o que torna o resultado interpretável.
 */
export function analyzeTrends(draws: Draw[], game: GameConfig, window = 200): TrendReport {
  const recent = draws.slice(-window);
  const n = recent.length;
  const half = Math.floor(n / 2);

  const xs = Array.from({ length: n }, (_, i) => i);
  const xMean = (n - 1) / 2;
  const sxx = xs.reduce((a, x) => a + (x - xMean) ** 2, 0);

  const stats: TrendStat[] = [];
  for (let num = 1; num <= game.pool; num++) {
    const ys: number[] = recent.map((d) => (d.numbers.includes(num) ? 1 : 0));
    const yMean = ys.reduce<number>((a, b) => a + b, 0) / n;
    const sxy = ys.reduce<number>((a, y, i) => a + (i - xMean) * (y - yMean), 0);
    const slope = sxx > 0 ? sxy / sxx : 0;

    const residuals = ys.map((y, i) => y - (yMean + slope * (i - xMean)));
    const sRes = stdDev(residuals, true);
    const se = sxx > 0 ? sRes / Math.sqrt(sxx) : 0;
    const t = se > 0 ? slope / se : 0;

    stats.push({
      number: num,
      slope,
      se,
      t,
      p: 2 * (1 - normalCdf(Math.abs(t))),
      firstHalf: (ys.slice(0, half).reduce<number>((a, b) => a + b, 0) / half) * 100,
      secondHalf: (ys.slice(half).reduce<number>((a, b) => a + b, 0) / (n - half)) * 100,
      direction: Math.abs(t) < 1.96 ? "estável" : slope > 0 ? "subindo" : "descendo",
    });
  }

  return {
    window: n,
    stats,
    naiveSignificant: stats.filter((s) => s.p < 0.05).length,
    expectedByChance: game.pool * 0.05,
  };
}

/** Média móvel da frequência de uma dezena, em % de concursos. */
export function movingAverage(draws: Draw[], num: number, window = 50): number[] {
  const hits = draws.map((d) => (d.numbers.includes(num) ? 1 : 0));
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < hits.length; i++) {
    sum += hits[i]!;
    if (i >= window) sum -= hits[i - window]!;
    if (i >= window - 1) out.push((sum / window) * 100);
  }
  return out;
}
