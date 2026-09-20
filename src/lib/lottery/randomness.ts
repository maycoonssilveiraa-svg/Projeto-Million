import { hypergeometric } from "./combinatorics";
import { chiSquareFit, type GoodnessOfFit } from "./gof";
import { benjaminiHochberg, choose, logChoose, mean, twoTailedP } from "./math";
import type { Draw, GameConfig } from "./types";

/**
 * Bateria de testes de aleatoriedade aplicada à série de sorteios.
 *
 * As outras páginas perguntam "esta dezena sai demais?". Aqui a pergunta é
 * outra e mais funda: a SEQUÊNCIA de sorteios carrega alguma estrutura
 * temporal — memória, ciclo, tendência a repetir ou a evitar?
 *
 * É a bateria clássica de validação de geradores aleatórios, adaptada ao
 * formato de loteria.
 */

export interface LagTest {
  lag: number;
  /** Dezenas em comum, em média, entre um concurso e o de `lag` depois. */
  observedMean: number;
  expectedMean: number;
  z: number;
  p: number;
  q: number;
  significant: boolean;
  fit: GoodnessOfFit;
}

/**
 * Sobreposição entre concursos distantes de `lag`. Sob independência, o número
 * de dezenas repetidas segue exatamente a hipergeométrica, qualquer que seja o
 * lag. Desvio aqui seria memória no sorteio — o achado mais forte possível.
 */
export function overlapByLag(draws: Draw[], game: GameConfig, maxLag = 12): LagTest[] {
  const probs = Array.from({ length: game.picks + 1 }, (_, k) =>
    hypergeometric(game.pool, game.picks, game.picks, k),
  );
  const expectedMean = (game.picks * game.picks) / game.pool;
  const variance = probs.reduce((a, p, k) => a + p * (k - expectedMean) ** 2, 0);

  const raw = [];
  for (let lag = 1; lag <= maxLag; lag++) {
    const observed = new Array(game.picks + 1).fill(0);
    const values: number[] = [];
    for (let i = lag; i < draws.length; i++) {
      const prev = new Set(draws[i - lag]!.numbers);
      const overlap = draws[i]!.numbers.filter((x) => prev.has(x)).length;
      observed[overlap]++;
      values.push(overlap);
    }
    const n = values.length;
    const m = mean(values);
    const z = Math.sqrt(n / variance) * (m - expectedMean);
    raw.push({
      lag,
      observedMean: m,
      expectedMean,
      z,
      p: twoTailedP(z),
      fit: chiSquareFit(
        `Lag ${lag}`,
        observed,
        probs,
        n,
        probs.map((_, k) => String(k)),
      ),
    });
  }

  const bh = benjaminiHochberg(raw.map((r) => r.p));
  return raw.map((r, i) => ({ ...r, q: bh.qValues[i]!, significant: bh.rejected[i]! }));
}

export interface GapTestResult {
  /** Intervalos observados entre aparições sucessivas da mesma dezena. */
  observedMean: number;
  /** Média da geométrica sob independência: (1-p)/p. */
  expectedMean: number;
  sampleSize: number;
  fit: GoodnessOfFit;
  /**
   * Correlação entre o atraso atual de uma dezena e ela sair no próximo
   * concurso. É a medida direta da crença nas "atrasadas": deve ser zero.
   */
  delayCorrelation: number;
  delayZ: number;
  delayP: number;
}

/**
 * Teste do intervalo entre aparições contra a distribuição geométrica.
 *
 * Se uma dezena "atrasada" tivesse mais chance de sair, os intervalos longos
 * seriam mais raros do que a geométrica prevê. Este é o teste que decide a
 * questão, e não a tabela de atrasos que todo site de loteria publica.
 */
export function gapTest(draws: Draw[], game: GameConfig): GapTestResult {
  const p = game.picks / game.pool;
  const lastSeen = new Array(game.pool + 1).fill(-1);
  const gaps: number[] = [];

  // Para a correlação atraso × sair: pares (atraso antes do concurso, saiu?).
  let sumXY = 0;
  let sumX = 0;
  let sumY = 0;
  let sumX2 = 0;
  let sumY2 = 0;
  let pairs = 0;

  draws.forEach((draw, i) => {
    const drawn = new Set(draw.numbers);
    for (let num = 1; num <= game.pool; num++) {
      const seen = lastSeen[num]!;
      if (seen >= 0) {
        const delay = i - seen - 1; // concursos de espera antes DESTE
        const hit = drawn.has(num) ? 1 : 0;
        sumXY += delay * hit;
        sumX += delay;
        sumY += hit;
        sumX2 += delay * delay;
        sumY2 += hit * hit;
        pairs++;
      }
    }
    for (const num of draw.numbers) {
      const seen = lastSeen[num]!;
      if (seen >= 0) gaps.push(i - seen);
      lastSeen[num] = i;
    }
  });

  const maxGap = Math.max(...gaps, 1);
  const probs: number[] = [0];
  for (let d = 1; d <= maxGap; d++) probs[d] = p * (1 - p) ** (d - 1);

  const observed = new Array(maxGap + 1).fill(0);
  for (const g of gaps) observed[g]++;

  const num = pairs * sumXY - sumX * sumY;
  const den = Math.sqrt((pairs * sumX2 - sumX ** 2) * (pairs * sumY2 - sumY ** 2));
  const r = den > 0 ? num / den : 0;
  const z = r * Math.sqrt(pairs - 1);

  return {
    observedMean: mean(gaps),
    expectedMean: 1 / p,
    sampleSize: gaps.length,
    fit: chiSquareFit(
      "Intervalo entre aparições",
      observed,
      probs,
      gaps.length,
      probs.map((_, i) => String(i)),
    ),
    delayCorrelation: r,
    delayZ: z,
    delayP: twoTailedP(z),
  };
}

export interface RunsResult {
  number: number;
  runs: number;
  expectedRuns: number;
  z: number;
  p: number;
  q: number;
  significant: boolean;
}

/**
 * Teste de sequências (Wald-Wolfowitz) por dezena. Detecta agrupamento
 * ("saiu três vezes seguidas") e alternância excessiva na série de aparições.
 */
export function runsTest(
  draws: Draw[],
  game: GameConfig,
): {
  results: RunsResult[];
  significantCount: number;
  expectedByChance: number;
} {
  const n = draws.length;
  const raw: Omit<RunsResult, "q" | "significant">[] = [];

  for (let num = 1; num <= game.pool; num++) {
    const seq = draws.map((d) => (d.numbers.includes(num) ? 1 : 0));
    const n1 = seq.reduce<number>((a, b) => a + b, 0);
    const n0 = n - n1;
    let runs = seq.length ? 1 : 0;
    for (let i = 1; i < seq.length; i++) if (seq[i] !== seq[i - 1]) runs++;

    const expectedRuns = (2 * n1 * n0) / n + 1;
    const variance = (2 * n1 * n0 * (2 * n1 * n0 - n)) / (n * n * (n - 1));
    const z = variance > 0 ? (runs - expectedRuns) / Math.sqrt(variance) : 0;
    raw.push({ number: num, runs, expectedRuns, z, p: twoTailedP(z) });
  }

  const bh = benjaminiHochberg(raw.map((r) => r.p));
  const results = raw.map((r, i) => ({
    ...r,
    q: bh.qValues[i]!,
    significant: bh.rejected[i]!,
  }));

  return {
    results,
    significantCount: results.filter((r) => r.significant).length,
    expectedByChance: game.pool * 0.05,
  };
}

export interface PeriodicityResult {
  number: number;
  /** Período em concursos do pico espectral. */
  period: number;
  /** Estatística g de Fisher: pico sobre a soma do periodograma. */
  g: number;
  p: number;
  q: number;
  significant: boolean;
}

/**
 * Teste g de Fisher para periodicidade oculta.
 *
 * Procura ciclos na série de aparições de cada dezena ("sai a cada 7
 * concursos"). O p-valor é exato, não assintótico — o que importa porque o
 * pico do periodograma é, por construção, um máximo entre centenas de
 * frequências e sempre parece grande.
 */
export function periodicityTest(
  draws: Draw[],
  game: GameConfig,
): {
  results: PeriodicityResult[];
  significantCount: number;
} {
  const n = draws.length;
  const m = Math.floor((n - 1) / 2);
  const raw: Omit<PeriodicityResult, "q" | "significant">[] = [];

  for (let num = 1; num <= game.pool; num++) {
    const seq = draws.map((d) => (d.numbers.includes(num) ? 1 : 0));
    const avg = mean(seq);
    const centered = seq.map((v) => v - avg);

    let peak = 0;
    let peakIndex = 1;
    let total = 0;
    for (let f = 1; f <= m; f++) {
      const w = (2 * Math.PI * f) / n;
      let re = 0;
      let im = 0;
      for (let t = 0; t < n; t++) {
        re += centered[t]! * Math.cos(w * t);
        im += centered[t]! * Math.sin(w * t);
      }
      const power = (re * re + im * im) / n;
      total += power;
      if (power > peak) {
        peak = power;
        peakIndex = f;
      }
    }

    const g = total > 0 ? peak / total : 0;
    raw.push({ number: num, period: n / peakIndex, g, p: fisherGPValue(g, m) });
  }

  const bh = benjaminiHochberg(raw.map((r) => r.p));
  const results = raw.map((r, i) => ({
    ...r,
    q: bh.qValues[i]!,
    significant: bh.rejected[i]!,
  }));

  return { results, significantCount: results.filter((r) => r.significant).length };
}

/** P(g > x) exato para a estatística de Fisher com m frequências. */
export function fisherGPValue(x: number, m: number): number {
  if (x <= 0) return 1;
  if (x >= 1) return 0;
  const jMax = Math.min(Math.floor(1 / x), m);
  let sum = 0;
  for (let j = 1; j <= jMax; j++) {
    const term = Math.exp(logChoose(m, j) + (m - 1) * Math.log(1 - j * x));
    sum += (j % 2 === 1 ? 1 : -1) * term;
    if (!Number.isFinite(sum)) break;
  }
  return Math.min(1, Math.max(0, sum));
}

export interface RandomnessReport {
  drawCount: number;
  lags: LagTest[];
  gaps: GapTestResult;
  runs: ReturnType<typeof runsTest>;
  periodicity: ReturnType<typeof periodicityTest>;
  /** Entropia da distribuição de dezenas, em bits. */
  entropy: number;
  maxEntropy: number;
  /** Total de combinações possíveis, para contexto. */
  totalCombinations: number;
  rejectedCount: number;
  totalTests: number;
}

export function analyzeRandomness(draws: Draw[], game: GameConfig): RandomnessReport {
  const lags = overlapByLag(draws, game);
  const gaps = gapTest(draws, game);
  const runs = runsTest(draws, game);
  const periodicity = periodicityTest(draws, game);

  const counts = new Array(game.pool + 1).fill(0);
  for (const d of draws) for (const num of d.numbers) counts[num]++;
  const totalDrawn = draws.length * game.picks;
  const entropy = -counts.slice(1).reduce((acc, c) => {
    if (!c) return acc;
    const p = c / totalDrawn;
    return acc + p * Math.log2(p);
  }, 0);

  const rejectedCount =
    lags.filter((l) => l.significant).length +
    (gaps.fit.rejects ? 1 : 0) +
    (gaps.delayP < 0.05 ? 1 : 0) +
    runs.significantCount +
    periodicity.significantCount;

  return {
    drawCount: draws.length,
    lags,
    gaps,
    runs,
    periodicity,
    entropy,
    maxEntropy: Math.log2(game.pool),
    totalCombinations: choose(game.pool, game.picks),
    rejectedCount,
    totalTests: lags.length + 2 + game.pool * 2,
  };
}
