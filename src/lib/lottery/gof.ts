import { chiSquarePValue } from "./math";

export interface GoodnessOfFit {
  label: string;
  /** Categorias comparadas, já agrupadas para manter esperado >= 5. */
  bins: { label: string; observed: number; expected: number }[];
  chi2: number;
  df: number;
  p: number;
  /** Falso = observado é compatível com o acaso. */
  rejects: boolean;
}

/**
 * Qui-quadrado de aderência com agrupamento automático de caudas.
 *
 * Bins com esperado < 5 inflam a estatística e produzem significância
 * artificial, então são fundidos ao vizinho antes do teste. `extraParams`
 * desconta graus de liberdade quando a distribuição teórica teve parâmetros
 * estimados a partir dos próprios dados.
 */
export function chiSquareFit(
  label: string,
  observed: number[],
  probs: number[],
  n: number,
  labels: string[],
  extraParams = 0,
): GoodnessOfFit {
  const bins: { label: string; observed: number; expected: number }[] = [];
  let accObs = 0;
  let accExp = 0;
  let accLabels: string[] = [];

  const flush = (force = false) => {
    if (accExp >= 5 || force) {
      if (accLabels.length) {
        const first = accLabels[0]!;
        const last = accLabels[accLabels.length - 1]!;
        bins.push({
          label: accLabels.length > 1 ? `${first}–${last}` : first,
          observed: accObs,
          expected: accExp,
        });
      }
      accObs = 0;
      accExp = 0;
      accLabels = [];
    }
  };

  for (let i = 0; i < probs.length; i++) {
    accObs += observed[i] ?? 0;
    accExp += probs[i]! * n;
    accLabels.push(labels[i] ?? String(i));
    flush();
  }
  if (accLabels.length) {
    const tail = bins[bins.length - 1];
    if (tail && accExp < 5) {
      tail.observed += accObs;
      tail.expected += accExp;
    } else {
      flush(true);
    }
  }

  const chi2 = bins.reduce((a, b) => a + (b.observed - b.expected) ** 2 / b.expected, 0);
  const df = Math.max(1, bins.length - 1 - extraParams);
  const p = chiSquarePValue(chi2, df);
  return { label, bins, chi2, df, p, rejects: p < 0.05 };
}
