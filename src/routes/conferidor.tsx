import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { Ball } from "../components/lottery/ball";
import { useGame } from "../components/lottery/game-context";
import { Loading, PageHeader, StatCard } from "../components/lottery/shell";
import { Verdict } from "../components/lottery/verdict";
import { useDraws } from "../hooks/use-lottery";

export const Route = createFileRoute("/conferidor")({
  head: () => ({ meta: [{ title: "Conferidor — Projeto Million" }] }),
  component: Conferidor,
});

function Conferidor() {
  const { gameId, game } = useGame();
  const { data: set, isLoading } = useDraws(gameId);
  const [input, setInput] = useState("");

  const picked = useMemo(() => {
    const nums = input
      .split(/[\s,;.-]+/)
      .map((t) => Number(t.trim()))
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= game.pool);
    return [...new Set(nums)].sort((a, b) => a - b);
  }, [input, game.pool]);

  const result = useMemo(() => {
    const latest = set?.draws.at(-1);
    if (!set || !latest || picked.length < game.picks) return undefined;
    const chosen = new Set(picked);
    const hits = new Array(game.picks + 1).fill(0);
    let best = { contest: 0, date: "", hits: -1, numbers: [] as number[] };

    for (const draw of set.draws) {
      const h = draw.numbers.filter((n) => chosen.has(n)).length;
      hits[h]++;
      if (h > best.hits)
        best = { contest: draw.contest, date: draw.date, hits: h, numbers: draw.numbers };
    }

    const prizes = game.tiers.reduce((acc, t) => acc + hits[t], 0);
    return { hits, best, prizes, last: latest };
  }, [set, picked, game]);

  if (isLoading || !set) return <Loading />;

  const lastDraw = set.draws.at(-1);
  if (!lastDraw) return <Loading label="Sem concursos carregados." />;

  const lastHits = picked.filter((n) => lastDraw.numbers.includes(n));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ferramenta"
        title="Conferidor"
        subtitle={`Confere o seu jogo contra o último concurso e contra todos os ${set.draws.length.toLocaleString("pt-BR")} concursos já realizados.`}
      />

      <section className="card-premium p-6">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Suas dezenas (separadas por espaço ou vírgula)
          </span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={2}
            placeholder={Array.from({ length: game.picks }, (_, i) =>
              String((i + 1) * 3).padStart(2, "0"),
            ).join(" ")}
            className="mt-2 w-full rounded-lg border border-input bg-surface px-3 py-2.5 font-mono text-sm transition-colors focus:border-primary/50"
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {picked.map((n) => (
            <Ball key={n} n={n} size="sm" tone={lastDraw.numbers.includes(n) ? "hit" : "muted"} />
          ))}
          {picked.length > 0 ? (
            <span className="ml-2 text-xs text-muted-foreground">
              {picked.length} dezena(s) válida(s)
              {picked.length < game.picks ? ` — mínimo ${game.picks}` : ""}
            </span>
          ) : null}
        </div>
      </section>

      {picked.length >= game.picks && result ? (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <StatCard
              label={`Concurso ${lastDraw.contest}`}
              value={`${lastHits.length} acertos`}
              tone={lastHits.length >= (game.tiers.at(-1) ?? game.picks) ? "good" : "default"}
              hint={lastDraw.date}
            />
            <StatCard
              label="Melhor resultado histórico"
              value={`${result.best.hits} acertos`}
              hint={`Concurso ${result.best.contest} · ${result.best.date}`}
            />
            <StatCard
              label="Faixas premiadas acumuladas"
              value={result.prizes}
              hint="se tivesse jogado em todos os concursos"
            />
            <StatCard
              label="Concursos conferidos"
              value={set.draws.length.toLocaleString("pt-BR")}
            />
          </div>

          <section className="card-premium p-6">
            <h2 className="font-display text-xl leading-tight">
              Se este jogo tivesse sido feito em todos os concursos
            </h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <tr>
                    <th className="py-2 text-left font-medium">Acertos</th>
                    <th className="px-3 py-2 text-right font-medium">Vezes</th>
                    <th className="px-3 py-2 text-right font-medium">Premiado</th>
                  </tr>
                </thead>
                <tbody>
                  {result.hits.map((count, h) => (
                    <tr key={h} className="border-t border-hairline">
                      <td className="py-1.5 tabular-nums">{h}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{count}</td>
                      <td className="px-3 py-1.5 text-right text-xs">
                        {game.tiers.includes(h) ? (
                          <span className="text-chart-2">sim</span>
                        ) : (
                          <span className="text-muted-foreground">não</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Verdict className="mt-4" kind="descritivo">
              Custo de jogar este bilhete em todos os {set.draws.length.toLocaleString("pt-BR")}{" "}
              concursos:{" "}
              {(set.draws.length * game.basePrice).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
              , para {result.prizes} faixa(s) premiada(s).
            </Verdict>
          </section>

          <section className="card-premium p-6">
            <h2 className="font-display text-xl leading-tight">
              Melhor concurso: {result.best.contest} ({result.best.date})
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {result.best.numbers.map((n) => (
                <Ball key={n} n={n} tone={picked.includes(n) ? "hit" : "muted"} />
              ))}
            </div>
          </section>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Informe pelo menos {game.picks} dezenas para conferir.
        </p>
      )}
    </div>
  );
}
