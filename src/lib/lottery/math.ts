// Primitivas estatísticas. Sem dependências externas: tudo aqui é verificável
// contra tabelas conhecidas (ver scripts/verify-math.mjs).

/** Log-gama por Lanczos. Base para qui-quadrado e binomial. */
export function logGamma(x: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  x -= 1;
  let a = c[0]!;
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i]! / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Gama incompleta regularizada inferior P(s, x), por série e fração continuada. */
export function lowerGamma(s: number, x: number): number {
  if (x < 0 || s <= 0) return NaN;
  if (x === 0) return 0;
  if (x < s + 1) {
    // Série de potências.
    let sum = 1 / s;
    let term = sum;
    for (let n = 1; n < 1000; n++) {
      term *= x / (s + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-15) break;
    }
    return sum * Math.exp(-x + s * Math.log(x) - logGamma(s));
  }
  // Fração continuada para Q(s,x), depois P = 1 - Q.
  const tiny = 1e-300;
  let b = x + 1 - s;
  let c = 1 / tiny;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 1000; i++) {
    const an = -i * (i - s);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return 1 - Math.exp(-x + s * Math.log(x) - logGamma(s)) * h;
}

/** P(X > chi2) para a distribuição qui-quadrado com df graus de liberdade. */
export function chiSquarePValue(chi2: number, df: number): number {
  if (chi2 <= 0) return 1;
  return 1 - lowerGamma(df / 2, chi2 / 2);
}

/**
 * Função erro (Numerical Recipes, erfc por Chebyshev). Erro fracionário
 * máximo de ~1.2e-7 — mais que suficiente para p-valores, mas não espere
 * igualdade exata em 15 casas.
 */
export function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.5 * ax);
  const y =
    t *
    Math.exp(
      -ax * ax -
        1.26551223 +
        t *
          (1.00002368 +
            t *
              (0.37409196 +
                t *
                  (0.09678418 +
                    t *
                      (-0.18628806 +
                        t *
                          (0.27886807 +
                            t *
                              (-1.13520398 +
                                t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))),
    );
  return sign * (1 - y);
}

/** CDF da normal padrão. */
export function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

/** p bicaudal para um z-score. */
export function twoTailedP(z: number): number {
  return 2 * (1 - normalCdf(Math.abs(z)));
}

/** Coeficiente binomial em log, seguro para n grande. */
export function logChoose(n: number, k: number): number {
  if (k < 0 || k > n) return -Infinity;
  return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
}

export function choose(n: number, k: number): number {
  return Math.exp(logChoose(n, k));
}

/**
 * Intervalo de confiança de Wilson para uma proporção. Melhor que o intervalo
 * normal quando p é pequeno, que é exatamente o caso de dezenas de loteria.
 */
export function wilsonInterval(successes: number, trials: number, z = 1.96) {
  if (trials === 0) return { low: 0, high: 1 };
  const p = successes / trials;
  const d = 1 + (z * z) / trials;
  const center = (p + (z * z) / (2 * trials)) / d;
  const half = (z * Math.sqrt((p * (1 - p)) / trials + (z * z) / (4 * trials * trials))) / d;
  return { low: Math.max(0, center - half), high: Math.min(1, center + half) };
}

/**
 * Correção de Benjamini-Hochberg. Controla a taxa de falsas descobertas quando
 * testamos 60 dezenas ou 1770 pares de uma vez — sem isso, "achados" a 5% são
 * garantidos por puro acaso.
 */
export function benjaminiHochberg(pValues: number[], fdr = 0.05) {
  const indexed = pValues.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
  const m = pValues.length;
  let maxK = -1;
  for (let k = 0; k < m; k++) {
    if (indexed[k]!.p <= ((k + 1) / m) * fdr) maxK = k;
  }
  const rejected: boolean[] = new Array(m).fill(false);
  for (let k = 0; k <= maxK; k++) rejected[indexed[k]!.i] = true;

  // q-valores (p ajustado), monotonizados de trás para frente.
  const q: number[] = new Array(m).fill(1);
  let running = 1;
  for (let k = m - 1; k >= 0; k--) {
    running = Math.min(running, (indexed[k]!.p * m) / (k + 1));
    q[indexed[k]!.i] = Math.min(1, running);
  }
  return { rejected, qValues: q, threshold: maxK >= 0 ? indexed[maxK]!.p : 0 };
}

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export function stdDev(xs: number[], sample = true): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const ss = xs.reduce((a, b) => a + (b - m) ** 2, 0);
  return Math.sqrt(ss / (xs.length - (sample ? 1 : 0)));
}

export function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
}

/** Gerador determinístico (mulberry32) para simulações reproduzíveis. */
export function makeRng(seed: number) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
