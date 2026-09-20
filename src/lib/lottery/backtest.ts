import { benjaminiHochberg, makeRng, mean, normalCdf, stdDev } from "./math";
import type { Draw, GameConfig } from "./types";

export type StrategyId =
  "quentes" | "frias" | "atrasadas" | "equilibrada" | "pares-frequentes" | "aleatoria";

export const STRATEGY_LABELS: Record<StrategyId, string> = {
  quentes: "Dezenas quentes",
  frias: "Dezenas frias",
  atrasadas: "Mais atrasadas",
  equilibrada: "Equilibrada (soma na faixa)",
  "pares-frequentes": "Pares mais frequentes",
  aleatoria: "Aleatória",
};

/** Estado acumulado até o concurso anterior — nenhuma estratégia enxerga o futuro. */
interface History {
  counts: number[];
  lastSeen: number[];
  index: number;
  pairCounts: Map<number, number>;
}

function pick(strategy: StrategyId, hist: History, game: GameConfig, rng: () => number): number[] {
  const all = Array.from({ length: game.pool }, (_, i) => i + 1);

  const byCount = (dir: number) =>
    [...all]
      .sort((a, b) => dir * (hist.counts[b]! - hist.counts[a]!) || rng() - 0.5)
      .slice(0, game.picks);

  switch (strategy) {
    case "quentes":
      return byCount(1);
    case "frias":
      return byCount(-1);
    case "atrasadas":
      return [...all]
        .sort((a, b) => hist.lastSeen[a]! - hist.lastSeen[b]! || rng() - 0.5)
        .slice(0, game.picks);
    case "pares-frequentes": {
      const score = new Array(game.pool + 1).fill(0);
      for (const [k, v] of hist.pairCounts) {
        const a = Math.floor(k / (game.pool + 1));
        const b = k % (game.pool + 1);
        score[a] += v;
        score[b] += v;
      }
      return [...all].sort((a, b) => score[b]! - score[a]! || rng() - 0.5).slice(0, game.picks);
    }
    case "equilibrada": {
      // Sorteia até cair na faixa central de soma e com paridade equilibrada.
      const target = (game.picks * (game.pool + 1)) / 2;
      const tol = Math.sqrt((game.picks * (game.pool + 1) * (game.pool - game.picks)) / 12);
      for (let attempt = 0; attempt < 200; attempt++) {
        const set = randomPick(game, rng);
        const sum = set.reduce((a, b) => a + b, 0);
        const odds = set.filter((x) => x % 2 === 1).length;
        const balanced = Math.abs(odds - game.picks / 2) <= 1;
        if (Math.abs(sum - target) <= tol && balanced) return set;
      }
      return randomPick(game, rng);
    }
    default:
      return randomPick(game, rng);
  }
}

function randomPick(game: GameConfig, rng: () => number): number[] {
  const set = new Set<number>();
  while (set.size < game.picks) set.add(1 + Math.floor(rng() * game.pool));
  return [...set].sort((a, b) => a - b);
}

export interface StrategyResult {
  strategy: StrategyId;
  label: string;
  /** Concursos testados. */
  trials: number;
  meanHits: number;
  sdHits: number;
  /** Erro-padrão da média. */
  se: number;
  /** Distribuição de acertos: hits[k] = quantas vezes acertou k dezenas. */
  hits: number[];
  /** Quantas vezes bateu cada faixa premiada do jogo. */
  tierHits: { tier: number; count: number }[];
  /** z contra a média teórica sob sorteio uniforme. */
  zVsTheory: number;
  pVsTheory: number;
  /** Diferença de acertos médios contra a estratégia aleatória. */
  deltaVsRandom: number;
  /** IC 95% da diferença contra a aleatória. Contendo zero = indistinguível. */
  deltaCi: { low: number; high: number };
  beatsRandom: boolean;
}

export interface BacktestReport {
  game: GameConfig;
  warmup: number;
  trials: number;
  /** Acertos médios esperados sob sorteio uniforme: picks² / pool. */
  theoreticalMean: number;
  results: StrategyResult[];
  /** Verdadeiro se QUALQUER estratégia superou a aleatória com significância. */
  anyBeatsRandom: boolean;
}

export interface StrategyStability {
  strategy: StrategyId;
  label: string;
  /** Média dos acertos ao longo das réplicas com sementes diferentes. */
  meanAcrossSeeds: number;
  /**
   * Dispersão do resultado ENTRE sementes. Mede só a instabilidade do
   * desempate aleatório da estratégia — NÃO é o erro-padrão do efeito, porque
   * todas as réplicas veem exatamente os mesmos concursos.
   */
  sdAcrossSeeds: number;
  bestSeed: number;
  worstSeed: number;
  /** Vantagem média sobre a aposta aleatória. */
  delta: number;
  /** Erro-padrão amostral do delta, vindo da variação ENTRE CONCURSOS. */
  se: number;
  /** IC 95% do delta. Contendo zero = indistinguível da aleatória. */
  ci: { low: number; high: number };
  /** q do teste unilateral "supera a aleatória", corrigido entre estratégias. */
  q: number;
  /** Verdadeiro só se superar a aleatória após correção. */
  significant: boolean;
  /** Desvio contra a média teórica exata, que tem erro-padrão menor. */
  zVsTheory: number;
  qVsTheory: number;
}

export interface SnoopingSplit {
  splitAt: number;
  winner: StrategyId;
  winnerLabel: string;
  inSampleDelta: number;
  outOfSampleDelta: number;
}

export interface SnoopingDemo {
  /** Cada divisão testada: campeã escolhida à esquerda, medida à direita. */
  splits: SnoopingSplit[];
  /** Vantagem média da campeã ONDE ela foi escolhida. */
  meanInSample: number;
  /** A mesma campeã, fora da amostra de seleção. */
  meanOutOfSample: number;
  /** Quanto da vantagem era artefato da seleção. */
  shrinkage: number;
  /** Fração da vantagem que evaporou. */
  shrinkagePercent: number;
  /** Quantas divisões mantiveram a mesma campeã. */
  championChanges: number;
}

export interface HardenedReport {
  base: BacktestReport;
  /** Réplicas com sementes independentes. */
  seeds: number;
  stability: StrategyStability[];
  snooping: SnoopingDemo;
  /** Estratégias que sobrevivem à correção entre estratégias. */
  survivorsAfterCorrection: number;
}

/**
 * Backtest endurecido.
 *
 * O backtest simples tem três fraquezas que este corrige: depende de uma única
 * semente aleatória, testa seis estratégias sem corrigir o alfa, e não mostra
 * o que acontece quando a melhor estratégia é ESCOLHIDA olhando os dados.
 */
export function hardenedBacktest(
  draws: Draw[],
  game: GameConfig,
  opts: { seeds?: number } = {},
): HardenedReport {
  const seeds = opts.seeds ?? 12;
  const strategies = Object.keys(STRATEGY_LABELS) as StrategyId[];

  // --- Réplicas: a conclusão não pode depender da semente ---
  const perSeed: BacktestReport[] = [];
  for (let s = 0; s < seeds; s++) {
    perSeed.push(backtest(draws, game, { seed: 1000 + s * 7919 }));
  }

  const stabilityRaw = strategies.map((id) => {
    const rows = perSeed.map((r) => r.results.find((x) => x.strategy === id));
    const means = rows.map((r) => r?.meanHits ?? 0);
    const deltas = rows.map((r) => r?.deltaVsRandom ?? 0);

    // As réplicas compartilham os mesmos concursos, então a média entre
    // sementes NÃO tem erro-padrão reduzido por sqrt(seeds). O erro-padrão
    // correto é o amostral entre concursos, que cada réplica já estima.
    const se = mean(rows.map((r) => (r ? (r.deltaCi.high - r.deltaCi.low) / (2 * 1.96) : 0)));
    const delta = mean(deltas);
    const z = se > 0 ? delta / se : 0;

    // Contra a média teórica exata o erro-padrão é menor: é o teste mais
    // potente disponível, porque a referência não precisa ser estimada.
    const zTheory = mean(rows.map((r) => r?.zVsTheory ?? 0));

    return {
      strategy: id,
      label: STRATEGY_LABELS[id],
      meanAcrossSeeds: mean(means),
      sdAcrossSeeds: stdDev(means),
      bestSeed: Math.max(...means),
      worstSeed: Math.min(...means),
      delta,
      se,
      ci: { low: delta - 1.96 * se, high: delta + 1.96 * se },
      // Unilateral: só interessa SUPERAR a aleatória, não diferir dela.
      p: id === "aleatoria" ? 1 : 1 - normalCdf(z),
      zVsTheory: zTheory,
      pVsTheory: id === "aleatoria" ? 1 : 2 * (1 - normalCdf(Math.abs(zTheory))),
    };
  });

  const bh = benjaminiHochberg(stabilityRaw.map((r) => r.p));
  const bhTheory = benjaminiHochberg(stabilityRaw.map((r) => r.pVsTheory));
  const stability: StrategyStability[] = stabilityRaw.map((r, i) => ({
    strategy: r.strategy,
    label: r.label,
    meanAcrossSeeds: r.meanAcrossSeeds,
    sdAcrossSeeds: r.sdAcrossSeeds,
    bestSeed: r.bestSeed,
    worstSeed: r.worstSeed,
    delta: r.delta,
    se: r.se,
    ci: r.ci,
    q: bh.qValues[i]!,
    significant: r.strategy !== "aleatoria" && bh.rejected[i]! && r.delta > 0,
    zVsTheory: r.zVsTheory,
    qVsTheory: bhTheory.qValues[i]!,
  }));

  // --- Data snooping ---
  // Uma divisão única é ela própria ruidosa: às vezes a campeã melhora fora da
  // amostra por acaso. Repetir em vários pontos de corte isola o viés de
  // seleção do ruído de uma partição específica.
  const splits: SnoopingSplit[] = [];
  const cuts = [0.35, 0.45, 0.55, 0.65, 0.75];

  for (const frac of cuts) {
    const splitAt = Math.floor(draws.length * frac);
    if (splitAt < 300 || draws.length - splitAt < 300) continue;

    const left = backtest(draws.slice(0, splitAt), game, { seed: 4242 });
    const right = backtest(draws.slice(splitAt), game, { seed: 4242 });

    const candidates = left.results.filter((r) => r.strategy !== "aleatoria");
    const champion = candidates.reduce<StrategyResult | undefined>(
      (best, r) => (!best || r.deltaVsRandom > best.deltaVsRandom ? r : best),
      undefined,
    );
    if (!champion) continue;

    splits.push({
      splitAt,
      winner: champion.strategy,
      winnerLabel: champion.label,
      inSampleDelta: champion.deltaVsRandom,
      outOfSampleDelta:
        right.results.find((r) => r.strategy === champion.strategy)?.deltaVsRandom ?? 0,
    });
  }

  const meanIn = mean(splits.map((s) => s.inSampleDelta));
  const meanOut = mean(splits.map((s) => s.outOfSampleDelta));
  const uniqueChampions = new Set(splits.map((s) => s.winner)).size;

  return {
    base: perSeed[0]!,
    seeds,
    stability,
    snooping: {
      splits,
      meanInSample: meanIn,
      meanOutOfSample: meanOut,
      shrinkage: meanIn - meanOut,
      shrinkagePercent: meanIn !== 0 ? ((meanIn - meanOut) / Math.abs(meanIn)) * 100 : 0,
      championChanges: uniqueChampions,
    },
    survivorsAfterCorrection: stability.filter((s) => s.significant).length,
  };
}

/**
 * Backtest walk-forward: para cada concurso, monta o jogo usando apenas o
 * passado e confere contra o resultado seguinte.
 *
 * É o único teste que importa. Frequência, atraso e padrão só teriam valor se
 * sobrevivessem aqui — e a previsão desta implementação é que nenhum sobrevive.
 */
export function backtest(
  draws: Draw[],
  game: GameConfig,
  opts: { warmup?: number; seed?: number; strategies?: StrategyId[] } = {},
): BacktestReport {
  const warmup = opts.warmup ?? Math.min(200, Math.floor(draws.length / 4));
  const strategies = opts.strategies ?? (Object.keys(STRATEGY_LABELS) as StrategyId[]);
  const rng = makeRng(opts.seed ?? 42);

  const hist: History = {
    counts: new Array(game.pool + 1).fill(0),
    lastSeen: new Array(game.pool + 1).fill(-1),
    index: 0,
    pairCounts: new Map(),
  };

  const perStrategy = new Map<StrategyId, number[]>(strategies.map((s) => [s, [] as number[]]));

  const absorb = (draw: Draw, i: number) => {
    for (const num of draw.numbers) {
      hist.counts[num] = (hist.counts[num] ?? 0) + 1;
      hist.lastSeen[num] = i;
    }
    for (let a = 0; a < draw.numbers.length; a++) {
      for (let b = a + 1; b < draw.numbers.length; b++) {
        const k = draw.numbers[a]! * (game.pool + 1) + draw.numbers[b]!;
        hist.pairCounts.set(k, (hist.pairCounts.get(k) ?? 0) + 1);
      }
    }
    hist.index = i;
  };

  for (let i = 0; i < warmup && i < draws.length; i++) absorb(draws[i]!, i);

  for (let i = warmup; i < draws.length; i++) {
    const actual = new Set(draws[i]!.numbers);
    for (const s of strategies) {
      const guess = pick(s, hist, game, rng);
      perStrategy.get(s)?.push(guess.filter((x) => actual.has(x)).length);
    }
    absorb(draws[i]!, i);
  }

  const theoreticalMean = (game.picks * game.picks) / game.pool;
  const randomHits = perStrategy.get("aleatoria") ?? [];
  const randomMean = mean(randomHits);
  const randomVar = stdDev(randomHits) ** 2;

  const results: StrategyResult[] = strategies.map((s) => {
    const hitsList = perStrategy.get(s) ?? [];
    const m = mean(hitsList);
    const sd = stdDev(hitsList);
    const n = hitsList.length;
    const se = sd / Math.sqrt(n);

    const hits = new Array(game.picks + 1).fill(0);
    for (const h of hitsList) hits[h]++;

    // Variância teórica dos acertos: hipergeométrica.
    const N = game.pool;
    const K = game.picks;
    const theoVar = K * (K / N) * ((N - K) / N) * ((N - K) / (N - 1));
    const zTheory = (m - theoreticalMean) / Math.sqrt(theoVar / n) || 0;

    const delta = m - randomMean;
    const seDelta = Math.sqrt(sd ** 2 / n + randomVar / Math.max(1, randomHits.length));
    const low = delta - 1.96 * seDelta;
    const high = delta + 1.96 * seDelta;

    return {
      strategy: s,
      label: STRATEGY_LABELS[s],
      trials: n,
      meanHits: m,
      sdHits: sd,
      se,
      hits,
      tierHits: game.tiers.map((tier) => ({ tier, count: hits[tier] ?? 0 })),
      zVsTheory: zTheory,
      pVsTheory: 2 * (1 - normalCdf(Math.abs(zTheory))),
      deltaVsRandom: delta,
      deltaCi: { low, high },
      beatsRandom: s !== "aleatoria" && low > 0,
    };
  });

  return {
    game,
    warmup,
    trials: draws.length - warmup,
    theoreticalMean,
    results,
    anyBeatsRandom: results.some((r) => r.beatsRandom),
  };
}
