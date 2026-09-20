/**
 * Worker de análise pesada.
 *
 * A bateria de aleatoriedade (periodicidade de Fisher em todas as dezenas) e o
 * backtest com múltiplas sementes somam alguns segundos de CPU. Na thread
 * principal isso congelaria a interface, então rodam aqui.
 *
 * O worker busca os dados por conta própria: enviar milhares de concursos por
 * postMessage custaria mais que o cálculo.
 */
import { hardenedBacktest, type HardenedReport } from "./backtest";
import { analyzePower, type PowerReport } from "./power";
import { analyzeRandomness, type RandomnessReport } from "./randomness";
import { analyzeStructure, type StructureReport } from "./structure";
import { parseRawFile, type GameId } from "./types";

export type WorkerTask = "randomness" | "structure" | "power" | "hardened";

export interface WorkerRequest {
  id: number;
  task: WorkerTask;
  gameId: GameId;
}

export interface WorkerResponse {
  id: number;
  task: WorkerTask;
  result?: RandomnessReport | StructureReport | PowerReport | HardenedReport;
  error?: string;
}

const cache = new Map<GameId, Awaited<ReturnType<typeof load>>>();

async function load(gameId: GameId) {
  const res = await fetch(`/data/${gameId}.json`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseRawFile(await res.json());
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, task, gameId } = event.data;
  try {
    let set = cache.get(gameId);
    if (!set) {
      set = await load(gameId);
      cache.set(gameId, set);
    }
    const { draws, game } = set;

    const result =
      task === "randomness"
        ? analyzeRandomness(draws, game)
        : task === "structure"
          ? analyzeStructure(draws, game)
          : task === "power"
            ? analyzePower(draws.length, game)
            : hardenedBacktest(draws, game, { seeds: 8 });

    const response: WorkerResponse = { id, task, result };
    self.postMessage(response);
  } catch (error) {
    const response: WorkerResponse = {
      id,
      task,
      error: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(response);
  }
};
