import { chiSquarePValue, normalCdf } from "./math";
import { criticalChi2 } from "./frequency";
import type { GameConfig } from "./types";

/**
 * Análise de poder.
 *
 * "Não encontramos viés" só é informativo se o teste conseguiria encontrá-lo
 * caso existisse. Este módulo responde à pergunta que falta em toda análise de
 * loteria: com os concursos disponíveis, QUAL o menor desvio detectável?
 *
 * Sem isso, um resultado nulo é indistinguível de um teste cego.
 */

/** Quantil da normal padrão, por busca binária na CDF. */
export function normalQuantile(p: number): number {
  let lo = -10;
  let hi = 10;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (normalCdf(mid) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Aproximação de Patnaik para a qui-quadrado não central, usada para calcular
 * o poder do teste de aderência sem depender de tabelas.
 */
export function noncentralChiSquareCdf(x: number, df: number, lambda: number): number {
  if (lambda <= 0) return 1 - chiSquarePValue(x, df);
  const h = (df + lambda) ** 2 / (df + 2 * lambda);
  const c = (df + 2 * lambda) / (df + lambda);
  return 1 - chiSquarePValue(x / c, h);
}

export interface NumberMde {
  /** Taxa de aparição sob sorteio honesto. */
  baseRate: number;
  /** Menor taxa detectável, em termos absolutos de probabilidade. */
  detectableRate: number;
  /** O mesmo desvio, em % relativo à taxa base. */
  relativePercent: number;
  /** Quantas aparições a mais, no total de concursos, isso representa. */
  extraAppearances: number;
}

/**
 * Menor viés detectável para UMA dezena, com o alfa já corrigido pelo número
 * de dezenas testadas — que é como a plataforma de fato decide.
 */
export function numberMde(
  n: number,
  game: GameConfig,
  power = 0.8,
  alpha = 0.05,
  correctForPool = true,
): NumberMde {
  const p0 = game.picks / game.pool;
  const effectiveAlpha = correctForPool ? alpha / game.pool : alpha;
  const zAlpha = normalQuantile(1 - effectiveAlpha / 2);
  const zBeta = normalQuantile(power);

  // A variância sob a alternativa difere da variância sob a nula, e a
  // alternativa depende do próprio delta. Resolve-se por ponto fixo: sem isso
  // o poder declarado fica alguns pontos acima do real.
  let delta = (zAlpha + zBeta) * Math.sqrt((p0 * (1 - p0)) / n);
  for (let i = 0; i < 50; i++) {
    const p1 = Math.min(0.999999, p0 + delta);
    const next =
      (zAlpha * Math.sqrt(p0 * (1 - p0)) + zBeta * Math.sqrt(p1 * (1 - p1))) / Math.sqrt(n);
    if (Math.abs(next - delta) < 1e-12) break;
    delta = next;
  }

  return {
    baseRate: p0,
    detectableRate: p0 + delta,
    relativePercent: (delta / p0) * 100,
    extraAppearances: delta * n,
  };
}

export interface GlobalPower {
  /** Tamanho de efeito de Cohen detectável no teste global. */
  detectableW: number;
  /** O mesmo efeito traduzido: desvio de uma única dezena viciada. */
  singleNumberBiasPercent: number;
  power: number;
  criticalValue: number;
}

/**
 * Poder do qui-quadrado global de aderência: qual tamanho de efeito w o teste
 * detecta com a probabilidade desejada, dados os concursos disponíveis.
 */
export function globalPower(n: number, game: GameConfig, power = 0.8, alpha = 0.05): GlobalPower {
  const df = game.pool - 1;
  const critical = criticalChi2(df);

  // Busca o menor w cujo poder atinge o alvo. λ = n_efetivo * w².
  const trials = n * game.picks; // cada concurso contribui com `picks` observações
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 120; i++) {
    const mid = (lo + hi) / 2;
    const achieved = 1 - noncentralChiSquareCdf(critical, df, trials * mid * mid);
    if (achieved < power) lo = mid;
    else hi = mid;
  }
  const w = (lo + hi) / 2;

  // Tradução: uma única dezena com probabilidade p0*(1+b) e as demais
  // reescaladas produz w² = b² * p0 / (1 - p0) aproximadamente.
  const p0 = 1 / game.pool;
  const bias = w * Math.sqrt((1 - p0) / p0);

  return {
    detectableW: w,
    singleNumberBiasPercent: bias * 100,
    power,
    criticalValue: critical,
  };
}

/** Quantos concursos seriam necessários para detectar um viés relativo dado. */
export function drawsNeeded(
  relativeBias: number,
  game: GameConfig,
  power = 0.8,
  alpha = 0.05,
  correctForPool = true,
): number {
  const p0 = game.picks / game.pool;
  const delta = p0 * relativeBias;
  const effectiveAlpha = correctForPool ? alpha / game.pool : alpha;
  const zAlpha = normalQuantile(1 - effectiveAlpha / 2);
  const zBeta = normalQuantile(power);
  return Math.ceil(((zAlpha + zBeta) ** 2 * p0 * (1 - p0)) / delta ** 2);
}

export interface PowerReport {
  drawCount: number;
  mde: NumberMde;
  mdeUncorrected: NumberMde;
  global: GlobalPower;
  /** Concursos necessários para detectar vieses de referência. */
  scenarios: { label: string; relativeBias: number; draws: number; years: number }[];
  /** Concursos por ano, usado para traduzir a espera em tempo. */
  drawsPerYear: number;
}

export function analyzePower(n: number, game: GameConfig, drawsPerYear = 156): PowerReport {
  const scenarios = [0.01, 0.02, 0.05, 0.1].map((b) => {
    const draws = drawsNeeded(b, game);
    return {
      label: `${(b * 100).toFixed(0)}% de viés`,
      relativeBias: b,
      draws,
      years: draws / drawsPerYear,
    };
  });

  return {
    drawCount: n,
    mde: numberMde(n, game),
    mdeUncorrected: numberMde(n, game, 0.8, 0.05, false),
    global: globalPower(n, game),
    scenarios,
    drawsPerYear,
  };
}
