import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Ball } from "../components/lottery/ball";
import { useGame } from "../components/lottery/game-context";
import { Loading, PageHeader, StatCard } from "../components/lottery/shell";
import { Verdict } from "../components/lottery/verdict";
import { useAnalysis } from "../hooks/use-lottery";
import { choose, makeRng, STRATEGY_LABELS, type StrategyId } from "../lib/lottery";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/simulador")({
  head: () => ({ meta: [{ title: "Simulador — Projeto Million" }] }),
  component: Simulador,
});

interface Game {
  numbers: number[];
  sum: number;
  odds: number;
  consecutive: number;
}

function Simulador() {
  const { gameId, game } = useGame();
  const { frequency, patterns, isLoading } = useAnalysis(gameId);
  const [strategy, setStrategy] = useState<StrategyId>("aleatoria");
  const [size, setSize] = useState(game.minBet);
  const [quantity, setQuantity] = useState(5);
  const [games, setGames] = useState<Game[]>([]);

  if (isLoading || !frequency || !patterns) return <Loading />;

  const betSize = Math.min(Math.max(size, game.minBet), game.maxBet);
  const combinations = choose(betSize, game.picks);
  const odds = choose(game.pool, game.picks) / combinations;

  const generate = () => {
    const rng = makeRng(Date.now() % 2 ** 31);
    const byCount = [...frequency.stats].sort((a, b) => b.count - a.count);
    const byGap = [...frequency.stats].sort((a, b) => b.gap - a.gap);

    const out: Game[] = [];
    for (let i = 0; i < quantity; i++) {
      let pool: number[];
      switch (strategy) {
        case "quentes":
          pool = byCount.slice(0, Math.max(betSize, game.picks + 8)).map((s) => s.number);
          break;
        case "frias":
          pool = byCount.slice(-Math.max(betSize, game.picks + 8)).map((s) => s.number);
          break;
        case "atrasadas":
          pool = byGap.slice(0, Math.max(betSize, game.picks + 8)).map((s) => s.number);
          break;
        default:
          pool = frequency.stats.map((s) => s.number);
      }

      const set = new Set<number>();
      let guard = 0;
      while (set.size < betSize && guard++ < 5000) {
        const candidate = pool[Math.floor(rng() * pool.length)];
        if (candidate !== undefined) set.add(candidate);
      }
      // Completa com o volante inteiro se o subconjunto for pequeno demais.
      while (set.size < betSize) set.add(1 + Math.floor(rng() * game.pool));

      const numbers = [...set].sort((a, b) => a - b);
      let consecutive = 0;
      for (let k = 1; k < numbers.length; k++) {
        if (numbers[k] === numbers[k - 1]! + 1) consecutive++;
      }
      out.push({
        numbers,
        sum: numbers.reduce((a, b) => a + b, 0),
        odds: numbers.filter((n) => n % 2 === 1).length,
        consecutive,
      });
    }
    setGames(out);
  };

  const price = combinations * game.basePrice;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ferramenta"
        title="Simulador de jogos"
        subtitle="Gera combinações segundo a estratégia escolhida. As estratégias existem para permitir comparação — o Backtest mostra que nenhuma delas altera a probabilidade de acerto."
      />

      <section className="card-premium p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Estratégia
            </span>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as StrategyId)}
              className="mt-1.5 w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm transition-colors focus:border-primary/50"
            >
              {(Object.keys(STRATEGY_LABELS) as StrategyId[])
                .filter((s) => s !== "pares-frequentes" && s !== "equilibrada")
                .map((s) => (
                  <option key={s} value={s}>
                    {STRATEGY_LABELS[s]}
                  </option>
                ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Dezenas por jogo ({game.minBet}–{game.maxBet})
            </span>
            <input
              type="number"
              min={game.minBet}
              max={game.maxBet}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="mt-1.5 w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm transition-colors focus:border-primary/50"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Quantidade de jogos
            </span>
            <input
              type="number"
              min={1}
              max={50}
              value={quantity}
              onChange={(e) => setQuantity(Math.min(50, Math.max(1, Number(e.target.value))))}
              className="mt-1.5 w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm transition-colors focus:border-primary/50"
            />
          </label>
        </div>

        <button
          onClick={generate}
          className="mt-5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-raised transition-colors hover:bg-primary/90"
        >
          Gerar {quantity} {quantity === 1 ? "jogo" : "jogos"}
        </button>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Chance por jogo"
          value={`1 em ${Math.round(odds).toLocaleString("pt-BR")}`}
          hint={`aposta de ${betSize} dezenas`}
        />
        <StatCard
          label="Combinações cobertas"
          value={Math.round(combinations).toLocaleString("pt-BR")}
        />
        <StatCard
          label="Custo por jogo"
          value={price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          hint={`${quantity} jogos: ${(price * quantity).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`}
        />
      </div>

      <Verdict kind="descritivo">
        Aumentar de {game.minBet} para {betSize} dezenas multiplica o custo por{" "}
        {combinations.toFixed(0)}× e a chance por exatamente o mesmo fator. A relação entre preço e
        probabilidade é linear: não existe desconto por volume em termos de valor esperado.
      </Verdict>

      {games.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl leading-tight">Jogos gerados</h2>
          {games.map((g, i) => (
            <div key={i} className="flex flex-wrap items-center gap-3 card-premium p-5">
              <span className="w-6 text-xs text-muted-foreground">{i + 1}</span>
              <div className="flex flex-wrap gap-1.5">
                {g.numbers.map((n) => (
                  <Ball key={n} n={n} size="sm" />
                ))}
              </div>
              <div className="ml-auto flex gap-4 text-xs text-muted-foreground">
                <span
                  className={cn(
                    "tabular-nums",
                    g.sum >= patterns.sums.theoreticalBand.low &&
                      g.sum <= patterns.sums.theoreticalBand.high &&
                      "text-chart-2",
                  )}
                >
                  soma {g.sum}
                </span>
                <span className="tabular-nums">{g.odds} ímpares</span>
                <span className="tabular-nums">{g.consecutive} consecutivos</span>
              </div>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
