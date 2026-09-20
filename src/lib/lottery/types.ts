export type GameId = "megasena" | "lotofacil";

export interface Draw {
  /** Número do concurso. */
  contest: number;
  /** Data no formato dd/mm/aaaa, como vem da Caixa. */
  date: string;
  /** Dezenas sorteadas, em ordem crescente. */
  numbers: number[];
  accumulated: boolean;
  winners: number;
  prize: number;
}

export interface GameConfig {
  id: GameId;
  name: string;
  /** Total de dezenas disponíveis (60 na Mega-Sena, 25 na Lotofácil). */
  pool: number;
  /** Dezenas sorteadas por concurso. */
  picks: number;
  /** Menor aposta permitida. */
  minBet: number;
  /** Maior aposta permitida. */
  maxBet: number;
  /** Preço da aposta mínima, em reais. */
  basePrice: number;
  /** Faixas de premiação, por número de acertos, da maior para a menor. */
  tiers: number[];
}

export const GAMES: Record<GameId, GameConfig> = {
  megasena: {
    id: "megasena",
    name: "Mega-Sena",
    pool: 60,
    picks: 6,
    minBet: 6,
    maxBet: 20,
    basePrice: 6,
    tiers: [6, 5, 4],
  },
  lotofacil: {
    id: "lotofacil",
    name: "Lotofácil",
    pool: 25,
    picks: 15,
    minBet: 15,
    maxBet: 20,
    basePrice: 3.5,
    tiers: [15, 14, 13, 12, 11],
  },
};

/** Formato compacto gravado em public/data por scripts/fetch-draws.mjs. */
interface RawFile {
  game: GameId;
  updatedAt: string;
  count: number;
  draws: { c: number; d: string; n: number[]; a: boolean; w: number; p: number }[];
}

export interface DrawSet {
  game: GameConfig;
  updatedAt: string;
  draws: Draw[];
}

export function parseRawFile(raw: RawFile): DrawSet {
  return {
    game: GAMES[raw.game],
    updatedAt: raw.updatedAt,
    draws: raw.draws.map((d) => ({
      contest: d.c,
      date: d.d,
      numbers: d.n,
      accumulated: d.a,
      winners: d.w,
      prize: d.p,
    })),
  };
}

/** dd/mm/aaaa → Date. A API não usa ISO. */
export function parseDate(br: string): Date {
  const [day = 1, month = 1, year = 1970] = br.split("/").map(Number);
  return new Date(year, month - 1, day);
}
