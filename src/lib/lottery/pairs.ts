import { benjaminiHochberg, choose, twoTailedP } from "./math";
import type { Draw, GameConfig } from "./types";

export interface PairStat {
  a: number;
  b: number;
  count: number;
  /** Esperado sob sorteio uniforme perfeito. */
  expected: number;
  z: number;
  p: number;
  q: number;
  significant: boolean;
  /**
   * Esperado CONDICIONADO às frequências observadas das duas dezenas. Se o par
   * parece anômalo só porque uma das dezenas saiu muito, isto captura a
   * diferença e zCond cai para perto de zero.
   */
  expectedCond: number;
  zCond: number;
  /** Verdadeiro se a anomalia do par sobrevive ao controle pelas marginais. */
  anomalousBeyondMarginals: boolean;
}

export interface PairReport {
  top: PairStat[];
  bottom: PairStat[];
  totalPairs: number;
  significantCount: number;
  /** Quantos "achados" a 5% seriam esperados por puro acaso, sem correção. */
  falsePositivesExpected: number;
  maxAbsZ: number;
  /** Maior |z| esperado em 1770 testes sob a hipótese nula — a régua honesta. */
  expectedMaxZ: number;
  /**
   * Pares que continuam anômalos depois de descontar a frequência individual
   * das suas dezenas. É o número que realmente indicaria dependência entre
   * dezenas — e não apenas uma dezena desviante arrastando todos os seus pares.
   */
  significantBeyondMarginals: number;
}

/**
 * Co-ocorrência de pares. Testar todos os C(60,2) = 1770 pares sem correção
 * produziria ~88 "pares significativos" a 5% mesmo num sorteio perfeito — é
 * exatamente isso que o BH e a coluna expectedMaxZ tornam visível.
 */
export function analyzePairs(draws: Draw[], game: GameConfig): PairReport {
  const n = draws.length;
  const pPair = choose(game.pool - 2, game.picks - 2) / choose(game.pool, game.picks) || 0;
  const expected = n * pPair;
  const sd = Math.sqrt(n * pPair * (1 - pPair));

  const counts = new Map<number, number>();
  const key = (a: number, b: number) => a * (game.pool + 1) + b;

  // Frequência individual observada, para condicionar o esperado dos pares.
  const singles: number[] = new Array(game.pool + 1).fill(0);
  for (const draw of draws) for (const num of draw.numbers) singles[num] = (singles[num] ?? 0) + 1;

  for (const draw of draws) {
    const nums = draw.numbers;
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        const k = key(nums[i]!, nums[j]!);
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
    }
  }

  const stats: Omit<PairStat, "q" | "significant" | "anomalousBeyondMarginals">[] = [];
  for (let a = 1; a <= game.pool; a++) {
    for (let b = a + 1; b <= game.pool; b++) {
      const count = counts.get(key(a, b)) ?? 0;
      const z = sd > 0 ? (count - expected) / sd : 0;

      // Sob independência entre as duas dezenas, mantidas as suas taxas
      // observadas, o esperado do par é n * pA * pB reescalado para a
      // densidade de pares do jogo.
      const pA = singles[a]! / n;
      const pB = singles[b]! / n;
      const scale = pPair / (game.picks / game.pool) ** 2;
      const pCond = pA * pB * scale;
      const expectedCond = n * pCond;
      const sdCond = Math.sqrt(n * pCond * (1 - pCond));
      const zCond = sdCond > 0 ? (count - expectedCond) / sdCond : 0;

      stats.push({
        a,
        b,
        count,
        expected,
        z,
        p: twoTailedP(z),
        expectedCond,
        zCond,
      });
    }
  }

  const bh = benjaminiHochberg(stats.map((s) => s.p));
  const bhCond = benjaminiHochberg(stats.map((s) => twoTailedP(s.zCond)));
  const full: PairStat[] = stats.map((s, i) => ({
    ...s,
    q: bh.qValues[i]!,
    significant: bh.rejected[i]!,
    anomalousBeyondMarginals: bhCond.rejected[i]!,
  }));

  const byCount = [...full].sort((x, y) => y.count - x.count);
  const m = full.length;

  return {
    top: byCount.slice(0, 15),
    bottom: byCount.slice(-15).reverse(),
    totalPairs: m,
    significantCount: full.filter((s) => s.significant).length,
    falsePositivesExpected: m * 0.05,
    maxAbsZ: Math.max(...full.map((s) => Math.abs(s.z))),
    // Máximo esperado de m normais padrão: aproximação clássica de valores extremos.
    expectedMaxZ: Math.sqrt(2 * Math.log(m)),
    significantBeyondMarginals: full.filter((s) => s.anomalousBeyondMarginals).length,
  };
}
