import { benjaminiHochberg, chiSquarePValue, twoTailedP, wilsonInterval } from "./math";
import type { Draw, GameConfig } from "./types";

export interface NumberStat {
  number: number;
  /** Vezes que a dezena saiu na janela analisada. */
  count: number;
  /** Quantas vezes seria esperado se tudo fosse uniforme. */
  expected: number;
  /** Desvio em unidades de desvio-padrão, sob a hipótese nula. */
  z: number;
  /** p bicaudal isolado, ANTES da correção de múltiplas comparações. */
  p: number;
  /** p ajustado por Benjamini-Hochberg. É este que vale. */
  q: number;
  /** Verdadeiro só se sobreviver à correção de FDR. */
  significant: boolean;
  /** IC de Wilson 95% para a proporção de concursos em que a dezena aparece. */
  ci: { low: number; high: number };
  /** Concursos desde a última aparição. */
  gap: number;
  /** Intervalo médio observado entre aparições. */
  meanGap: number;
  /** Intervalo esperado sob uniformidade: 1/p - 1. */
  expectedGap: number;
  /** Último concurso em que saiu. */
  lastContest: number | null;
}

export interface FrequencyReport {
  stats: NumberStat[];
  drawCount: number;
  /** Teste qui-quadrado de aderência à distribuição uniforme. */
  uniformity: {
    chi2: number;
    df: number;
    p: number;
    /** Falso = os dados são compatíveis com sorteio honesto. */
    rejectsUniform: boolean;
    critical5pct: number;
  };
  /** Quantas dezenas passaram no BH. Sob sorteio justo, o esperado é zero. */
  significantCount: number;
}

/**
 * Frequência por dezena com o aparato completo de teste: z-score, IC de Wilson,
 * correção de FDR e qui-quadrado global.
 *
 * O ponto não é "descobrir dezenas quentes". É mostrar que, depois da correção
 * de múltiplas comparações, elas somem — que é o resultado esperado de um
 * sorteio honesto.
 */
export function analyzeFrequency(draws: Draw[], game: GameConfig): FrequencyReport {
  const n = draws.length;
  const pHit = game.picks / game.pool; // prob. de uma dezena específica sair num concurso
  const expected = n * pHit;
  const sd = Math.sqrt(n * pHit * (1 - pHit));

  const counts = new Array(game.pool + 1).fill(0);
  const lastSeen = new Array(game.pool + 1).fill(-1);
  const gaps: number[][] = Array.from({ length: game.pool + 1 }, () => []);

  draws.forEach((draw, i) => {
    for (const num of draw.numbers) {
      counts[num]++;
      const seen = lastSeen[num]!;
      if (seen >= 0) gaps[num]!.push(i - seen);
      lastSeen[num] = i;
    }
  });

  const raw: Omit<NumberStat, "q" | "significant">[] = [];
  for (let num = 1; num <= game.pool; num++) {
    const count = counts[num]!;
    const z = sd > 0 ? (count - expected) / sd : 0;
    const g = gaps[num]!;
    const seen = lastSeen[num]!;
    raw.push({
      number: num,
      count,
      expected,
      z,
      p: twoTailedP(z),
      ci: wilsonInterval(count, n),
      gap: seen >= 0 ? n - 1 - seen : n,
      meanGap: g.length ? g.reduce((a, b) => a + b, 0) / g.length : 0,
      expectedGap: 1 / pHit - 1,
      lastContest: seen >= 0 ? draws[seen]!.contest : null,
    });
  }

  const bh = benjaminiHochberg(raw.map((r) => r.p));
  const stats: NumberStat[] = raw.map((r, i) => ({
    ...r,
    q: bh.qValues[i]!,
    significant: bh.rejected[i]!,
  }));

  // Qui-quadrado de aderência sobre as contagens das dezenas.
  const chi2 = stats.reduce((acc, s) => acc + (s.count - expected) ** 2 / expected, 0);
  const df = game.pool - 1;
  const p = chiSquarePValue(chi2, df);

  return {
    stats,
    drawCount: n,
    uniformity: {
      chi2,
      df,
      p,
      rejectsUniform: p < 0.05,
      critical5pct: criticalChi2(df),
    },
    significantCount: stats.filter((s) => s.significant).length,
  };
}

/** Valor crítico a 5% por busca binária na CDF. Evita carregar tabela. */
export function criticalChi2(df: number): number {
  let lo = 0;
  let hi = df * 10 + 50;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (chiSquarePValue(mid, df) > 0.05) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
