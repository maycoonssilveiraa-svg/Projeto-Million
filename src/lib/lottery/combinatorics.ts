import { choose, logChoose } from "./math";
import type { GameConfig } from "./types";

/**
 * Distribuições EXATAS sob a hipótese de sorteio uniforme. São o régua contra
 * a qual os padrões observados são medidos: sem elas, qualquer contagem parece
 * interessante porque não há referência.
 */

/** Hipergeométrica: P(X = k) ao tirar `draws` bolas de `pool` com `success` marcadas. */
export function hypergeometric(pool: number, success: number, draws: number, k: number): number {
  if (k < 0 || k > draws || k > success || draws - k > pool - success) return 0;
  return Math.exp(
    logChoose(success, k) + logChoose(pool - success, draws - k) - logChoose(pool, draws),
  );
}

/**
 * P(exatamente `adjacencies` pares consecutivos) num sorteio de k dezenas de n.
 * Um subconjunto com m blocos contíguos tem k - m adjacências, e há
 * C(n-k+1, m) * C(k-1, m-1) subconjuntos com m blocos.
 */
export function consecutiveDistribution(pool: number, picks: number): number[] {
  const total = choose(pool, picks);
  const out: number[] = [];
  for (let a = 0; a <= picks - 1; a++) {
    const m = picks - a;
    out[a] = (choose(pool - picks + 1, m) * choose(picks - 1, m - 1)) / total;
  }
  return out;
}

/** P(soma = s) exata, por programação dinâmica sobre subconjuntos de tamanho k. */
export function sumDistribution(pool: number, picks: number) {
  const maxSum = (pool * (pool + 1)) / 2 - ((pool - picks) * (pool - picks + 1)) / 2;
  const minSum = (picks * (picks + 1)) / 2;
  // dp[k][s] = número de subconjuntos de tamanho k com soma s.
  const dp: Float64Array[] = Array.from({ length: picks + 1 }, () => new Float64Array(maxSum + 1));
  dp[0]![0] = 1;
  for (let num = 1; num <= pool; num++) {
    for (let k = Math.min(picks, num); k >= 1; k--) {
      const prev = dp[k - 1]!;
      const cur = dp[k]!;
      for (let s = maxSum; s >= num; s--) {
        const carry = prev[s - num] ?? 0;
        if (carry) cur[s] = (cur[s] ?? 0) + carry;
      }
    }
  }
  const total = choose(pool, picks);
  const probs = new Map<number, number>();
  const final = dp[picks]!;
  for (let s = minSum; s <= maxSum; s++) {
    const c = final[s]!;
    if (c) probs.set(s, c / total);
  }
  return { minSum, maxSum, probs };
}

/** P(exatamente k dezenas ímpares) — hipergeométrica sobre os ímpares do volante. */
export function parityDistribution(game: GameConfig): number[] {
  const odds = Math.ceil(game.pool / 2);
  return Array.from({ length: game.picks + 1 }, (_, k) =>
    hypergeometric(game.pool, odds, game.picks, k),
  );
}

/** P(exatamente k repetições em relação ao concurso anterior). */
export function repeatDistribution(game: GameConfig): number[] {
  return Array.from({ length: game.picks + 1 }, (_, k) =>
    hypergeometric(game.pool, game.picks, game.picks, k),
  );
}

/** Faixas de dezenas (1-10, 11-20, ...) usadas nos gráficos de distribuição. */
export function rangeBuckets(game: GameConfig, size = 10) {
  const buckets: { label: string; from: number; to: number; expected: number }[] = [];
  for (let from = 1; from <= game.pool; from += size) {
    const to = Math.min(from + size - 1, game.pool);
    buckets.push({
      label: `${from}-${to}`,
      from,
      to,
      expected: (game.picks * (to - from + 1)) / game.pool,
    });
  }
  return buckets;
}
