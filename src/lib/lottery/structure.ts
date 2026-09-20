import { chiSquareFit, type GoodnessOfFit } from "./gof";
import { choose, makeRng, mean, stdDev } from "./math";
import type { Draw, GameConfig } from "./types";

/**
 * Estrutura interna de cada sorteio: onde as dezenas caem no volante e como se
 * distribuem entre si. Diferente da frequência, que olha cada dezena isolada,
 * aqui a unidade de análise é a FORMA do conjunto sorteado.
 *
 * Todas as referências são exatas, derivadas por combinatória e conferidas por
 * enumeração exaustiva em scripts/verify-structure.mjs.
 */

/**
 * Distribuição exata da j-ésima menor dezena (hipergeométrica negativa).
 * P(X(j) = x) = C(x-1, j-1) * C(N-x, k-j) / C(N, k)
 */
export function orderStatDistribution(pool: number, picks: number, j: number): number[] {
  const total = choose(pool, picks);
  const out = new Array(pool + 1).fill(0);
  for (let x = j; x <= pool - (picks - j); x++) {
    out[x] = (choose(x - 1, j - 1) * choose(pool - x, picks - j)) / total;
  }
  return out;
}

/** Valor esperado da j-ésima menor dezena: j * (N+1) / (k+1). */
export function orderStatMean(pool: number, picks: number, j: number): number {
  return (j * (pool + 1)) / (picks + 1);
}

/**
 * Distribuição exata de UM espaçamento entre dezenas consecutivas do sorteio.
 * P(D = d) = C(N-d, k-1) / C(N, k), a mesma para todos os espaçamentos.
 */
export function spacingDistribution(pool: number, picks: number): number[] {
  const total = choose(pool, picks);
  const out = new Array(pool + 1).fill(0);
  for (let d = 1; d <= pool - picks + 1; d++) {
    out[d] = choose(pool - d, picks - 1) / total;
  }
  return out;
}

/**
 * Distribuição exata da amplitude (maior menos menor dezena).
 * P(R = r) = (N - r) * C(r-1, k-2) / C(N, k)
 */
export function rangeDistribution(pool: number, picks: number): number[] {
  const total = choose(pool, picks);
  const out = new Array(pool + 1).fill(0);
  for (let r = picks - 1; r <= pool - 1; r++) {
    out[r] = ((pool - r) * choose(r - 1, picks - 2)) / total;
  }
  return out;
}

export interface OrderStatReport {
  j: number;
  label: string;
  observedMean: number;
  expectedMean: number;
  observedSd: number;
  fit: GoodnessOfFit;
}

export interface ExtremeCell {
  /** Posição (1 = menor dezena) onde está a célula mais extrema. */
  position: number;
  /** Faixa de valores da célula, como aparece na tabela do teste. */
  label: string;
  observed: number;
  expected: number;
  residual: number;
}

export interface LookElsewhereResult {
  sims: number;
  /** Menor p entre as posições, como observado nos dados reais. */
  observedMinP: number;
  /**
   * P(menor p simulado <= observado) sob sorteio uniforme perfeito. É o
   * p-valor honesto: corrige pelo fato de termos escolhido a posição mais
   * extrema DEPOIS de olhar todas.
   */
  correctedP: number;
  /** Erro de Monte Carlo do p corrigido. */
  mcError: number;
  extremeCell: ExtremeCell;
  /** P(alguma célula simulada com resíduo tão extremo quanto o observado). */
  cellCorrectedP: number;
  cellMcError: number;
}

/**
 * Correção look-elsewhere por Monte Carlo.
 *
 * Benjamini-Hochberg corrige pelo número de testes, mas não pelo fato de a
 * própria estatística de cada teste ser dirigida pela célula mais extrema
 * entre dezenas delas. Quando um qui-quadrado "significativo" vem de uma única
 * célula, o p nominal engana.
 *
 * A simulação replica o procedimento inteiro — inclusive a escolha do máximo —
 * sob sorteio uniforme perfeito, e mede com que frequência o acaso sozinho
 * produz algo tão extremo.
 */
export function lookElsewhere(
  orderStats: OrderStatReport[],
  game: GameConfig,
  drawCount: number,
  sims?: number,
  seed = 20260919,
): LookElsewhereResult {
  const { pool, picks } = game;

  // O custo cresce com concursos × posições: a Lotofácil tem 15 posições e
  // 3.783 concursos, quase o triplo do trabalho da Mega-Sena. As réplicas são
  // dimensionadas para manter o tempo em torno de dois segundos, e o erro de
  // Monte Carlo vai no resultado para que a precisão fique explícita.
  const budgetMs = 2000;
  const msPerCell = 6.1e-5;
  const replicates =
    sims ?? Math.max(500, Math.min(2000, Math.round(budgetMs / (msPerCell * drawCount * picks))));

  const observedMinP = Math.min(...orderStats.map((o) => o.fit.p));

  // Célula mais extrema observada, entre todas as posições.
  let extremeCell: ExtremeCell = {
    position: 1,
    label: "",
    observed: 0,
    expected: 0,
    residual: 0,
  };
  for (const o of orderStats) {
    for (const b of o.fit.bins) {
      const residual = (b.observed - b.expected) / Math.sqrt(b.expected);
      if (Math.abs(residual) > Math.abs(extremeCell.residual)) {
        extremeCell = {
          position: o.j,
          label: b.label,
          observed: b.observed,
          expected: b.expected,
          residual,
        };
      }
    }
  }

  const probsAll = Array.from({ length: picks }, (_, i) =>
    orderStatDistribution(pool, picks, i + 1),
  );
  const labels = probsAll[0]!.map((_, i) => String(i));
  const rng = makeRng(seed);

  let minPBelow = 0;
  let cellAbove = 0;

  for (let s = 0; s < replicates; s++) {
    const counts = Array.from({ length: picks }, () => new Array(pool + 1).fill(0));
    for (let i = 0; i < drawCount; i++) {
      const set = new Set<number>();
      while (set.size < picks) set.add(1 + Math.floor(rng() * pool));
      const sorted = [...set].sort((a, b) => a - b);
      for (let j = 0; j < picks; j++) counts[j]![sorted[j]!]++;
    }

    let minP = 1;
    let maxResid = 0;
    for (let j = 0; j < picks; j++) {
      const fit = chiSquareFit("", counts[j]!, probsAll[j]!, drawCount, labels);
      if (fit.p < minP) minP = fit.p;
      for (const b of fit.bins) {
        const r = Math.abs(b.observed - b.expected) / Math.sqrt(b.expected);
        if (r > maxResid) maxResid = r;
      }
    }
    if (minP <= observedMinP) minPBelow++;
    if (maxResid >= Math.abs(extremeCell.residual)) cellAbove++;
  }

  const correctedP = minPBelow / replicates;
  const cellCorrectedP = cellAbove / replicates;
  const se = (p: number) => Math.sqrt((p * (1 - p)) / replicates);

  return {
    sims: replicates,
    observedMinP,
    correctedP,
    mcError: se(correctedP),
    extremeCell,
    cellCorrectedP,
    cellMcError: se(cellCorrectedP),
  };
}

export interface StructureReport {
  drawCount: number;
  /** Uma linha por posição: a menor dezena, a segunda menor, e assim por diante. */
  orderStats: OrderStatReport[];
  spacings: {
    observedMean: number;
    expectedMean: number;
    observedSd: number;
    /** Maior espaçamento observado em média, por sorteio. */
    maxGapMean: number;
    fit: GoodnessOfFit;
  };
  range: {
    observedMean: number;
    expectedMean: number;
    fit: GoodnessOfFit;
  };
  /** Quantos dos testes estruturais rejeitam a hipótese de sorteio uniforme. */
  rejectedCount: number;
  totalTests: number;
  /** p-valor corrigido pelo procedimento de seleção. Ver lookElsewhere(). */
  lookElsewhere: LookElsewhereResult;
}

export function analyzeStructure(draws: Draw[], game: GameConfig): StructureReport {
  const n = draws.length;
  const { pool, picks } = game;

  // --- Estatísticas de ordem: a j-ésima menor dezena de cada sorteio ---
  const orderStats: OrderStatReport[] = [];
  for (let j = 1; j <= picks; j++) {
    const values = draws.map((d) => d.numbers[j - 1] ?? 0);
    const probs = orderStatDistribution(pool, picks, j);
    const observed = new Array(pool + 1).fill(0);
    for (const v of values) observed[v]++;

    orderStats.push({
      j,
      label: `${j}ª menor`,
      observedMean: mean(values),
      expectedMean: orderStatMean(pool, picks, j),
      observedSd: stdDev(values),
      fit: chiSquareFit(
        `Posição ${j}`,
        observed,
        probs,
        n,
        probs.map((_, i) => String(i)),
      ),
    });
  }

  // --- Espaçamentos entre dezenas consecutivas dentro do mesmo sorteio ---
  const spacingProbs = spacingDistribution(pool, picks);
  const spacingObs = new Array(pool + 1).fill(0);
  const allSpacings: number[] = [];
  const maxGaps: number[] = [];

  for (const draw of draws) {
    let largest = 0;
    for (let i = 1; i < draw.numbers.length; i++) {
      const d = draw.numbers[i]! - draw.numbers[i - 1]!;
      spacingObs[d]++;
      allSpacings.push(d);
      if (d > largest) largest = d;
    }
    maxGaps.push(largest);
  }

  // --- Amplitude do sorteio ---
  const rangeProbs = rangeDistribution(pool, picks);
  const rangeObs = new Array(pool + 1).fill(0);
  const rangeValues = draws.map((d) => (d.numbers.at(-1) ?? 0) - (d.numbers[0] ?? 0));
  for (const r of rangeValues) rangeObs[r]++;

  const expectedSpacing = (pool + 1) / (picks + 1);
  const expectedRange = ((pool + 1) * (picks - 1)) / (picks + 1);

  const report: StructureReport = {
    drawCount: n,
    orderStats,
    spacings: {
      observedMean: mean(allSpacings),
      expectedMean: expectedSpacing,
      observedSd: stdDev(allSpacings),
      maxGapMean: mean(maxGaps),
      fit: chiSquareFit(
        "Espaçamento entre dezenas",
        spacingObs,
        spacingProbs,
        allSpacings.length,
        spacingProbs.map((_, i) => String(i)),
      ),
    },
    range: {
      observedMean: mean(rangeValues),
      expectedMean: expectedRange,
      fit: chiSquareFit(
        "Amplitude do sorteio",
        rangeObs,
        rangeProbs,
        n,
        rangeProbs.map((_, i) => String(i)),
      ),
    },
    rejectedCount: 0,
    totalTests: picks + 2,
    lookElsewhere: lookElsewhere(orderStats, game, n),
  };

  report.rejectedCount =
    orderStats.filter((o) => o.fit.rejects).length +
    (report.spacings.fit.rejects ? 1 : 0) +
    (report.range.fit.rejects ? 1 : 0);

  return report;
}
