import { useEffect, useRef, useState } from "react";

import type { HardenedReport } from "../lib/lottery/backtest";
import type { PowerReport } from "../lib/lottery/power";
import type { RandomnessReport } from "../lib/lottery/randomness";
import type { StructureReport } from "../lib/lottery/structure";
import type { GameId } from "../lib/lottery/types";
import type { WorkerRequest, WorkerResponse, WorkerTask } from "../lib/lottery/analysis.worker";

interface ResultMap {
  randomness: RandomnessReport;
  structure: StructureReport;
  power: PowerReport;
  hardened: HardenedReport;
}

let nextId = 1;

/**
 * Executa uma análise pesada no worker. Retorna estado de carregamento em vez
 * de bloquear: a página renderiza o esqueleto e preenche quando o cálculo
 * termina.
 */
export function useHeavyAnalysis<T extends WorkerTask>(
  task: T,
  gameId: GameId,
): { data?: ResultMap[T]; loading: boolean; error?: string } {
  const [state, setState] = useState<{
    data?: ResultMap[T];
    loading: boolean;
    error?: string;
  }>({ loading: true });
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Worker só existe no navegador; no servidor a página renderiza o esqueleto.
    if (typeof window === "undefined") return;

    setState({ loading: true });
    const worker = new Worker(new URL("../lib/lottery/analysis.worker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = worker;

    const id = nextId++;
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.id !== id) return;
      if (event.data.error) {
        setState({ loading: false, error: event.data.error });
      } else {
        setState({ loading: false, data: event.data.result as ResultMap[T] });
      }
    };
    worker.onerror = (e) => setState({ loading: false, error: e.message });

    const request: WorkerRequest = { id, task, gameId };
    worker.postMessage(request);

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [task, gameId]);

  return state;
}
