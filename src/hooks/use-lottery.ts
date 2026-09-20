import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import {
  analyzeFrequency,
  analyzePairs,
  analyzePatterns,
  analyzeTrends,
  backtest,
  parseRawFile,
  type DrawSet,
  type GameId,
} from "../lib/lottery";

async function fetchDraws(game: GameId): Promise<DrawSet> {
  const res = await fetch(`/data/${game}.json`);
  if (!res.ok) throw new Error(`Falha ao carregar ${game}: HTTP ${res.status}`);
  return parseRawFile(await res.json());
}

export function useDraws(game: GameId) {
  return useQuery({
    queryKey: ["draws", game],
    queryFn: () => fetchDraws(game),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

/**
 * Análises derivadas. Memoizadas porque o backtest percorre milhares de
 * concursos e não deve rodar a cada render.
 */
export function useAnalysis(game: GameId, window?: number) {
  const query = useDraws(game);
  const set = query.data;

  const scoped = useMemo(() => {
    if (!set) return undefined;
    const draws = window ? set.draws.slice(-window) : set.draws;
    return { ...set, draws };
  }, [set, window]);

  const frequency = useMemo(
    () => (scoped ? analyzeFrequency(scoped.draws, scoped.game) : undefined),
    [scoped],
  );
  const patterns = useMemo(
    () => (scoped ? analyzePatterns(scoped.draws, scoped.game) : undefined),
    [scoped],
  );
  const pairs = useMemo(
    () => (scoped ? analyzePairs(scoped.draws, scoped.game) : undefined),
    [scoped],
  );
  const trends = useMemo(
    () => (scoped ? analyzeTrends(scoped.draws, scoped.game) : undefined),
    [scoped],
  );

  return { ...query, set: scoped, full: set, frequency, patterns, pairs, trends };
}

export function useBacktest(game: GameId) {
  const { data: set } = useDraws(game);
  return useMemo(() => (set ? backtest(set.draws, set.game) : undefined), [set]);
}
