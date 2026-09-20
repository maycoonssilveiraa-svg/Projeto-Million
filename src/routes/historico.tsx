import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { Ball } from "../components/lottery/ball";
import { useGame } from "../components/lottery/game-context";
import { Loading, PageHeader } from "../components/lottery/shell";
import { useDraws } from "../hooks/use-lottery";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/historico")({
  head: () => ({ meta: [{ title: "Histórico — Projeto Million" }] }),
  component: Historico,
});

const PER_PAGE = 25;

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function Historico() {
  const { gameId } = useGame();
  const { data: set, isLoading } = useDraws(gameId);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!set) return [];
    const reversed = [...set.draws].reverse();
    const q = query.trim();
    if (!q) return reversed;

    const asNumbers = q
      .split(/[\s,;]+/)
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0);

    return reversed.filter((d) => {
      if (String(d.contest).includes(q) || d.date.includes(q)) return true;
      return asNumbers.length > 0 && asNumbers.every((n) => d.numbers.includes(n));
    });
  }, [set, query]);

  if (isLoading || !set) return <Loading />;

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, pages - 1);
  const rows = filtered.slice(current * PER_PAGE, current * PER_PAGE + PER_PAGE);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Dados"
        title="Histórico completo"
        subtitle={`${set.draws.length.toLocaleString("pt-BR")} concursos. Busque por número do concurso, data, ou por dezenas para encontrar os sorteios que as contêm.`}
      />

      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(0);
        }}
        placeholder="Ex.: 3059, 17/09/2026, ou 05 27"
        className="w-full max-w-md rounded-lg border border-input bg-surface px-3.5 py-2.5 text-sm transition-colors focus:border-primary/50"
      />

      <p className="text-sm text-muted-foreground">
        {filtered.length.toLocaleString("pt-BR")} resultado(s)
      </p>

      <div className="card-premium overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Concurso</th>
              <th className="px-3 py-2 text-left font-medium">Data</th>
              <th className="px-3 py-2 text-left font-medium">Dezenas</th>
              <th className="px-3 py-2 text-right font-medium">Soma</th>
              <th className="px-3 py-2 text-right font-medium">Ganhadores</th>
              <th className="px-3 py-2 text-right font-medium">Prêmio</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.contest} className="border-t border-hairline">
                <td className="px-4 py-2 font-medium tabular-nums">{d.contest}</td>
                <td className="px-3 py-2 tabular-nums text-muted-foreground">{d.date}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {d.numbers.map((n) => (
                      <Ball key={n} n={n} size="sm" />
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {d.numbers.reduce((a, b) => a + b, 0)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {d.winners > 0 ? d.winners : <span className="text-muted-foreground">acum.</span>}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {d.prize > 0 ? brl(d.prize) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={current === 0}
          className={cn(
            "rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-medium transition-colors",
            current === 0 ? "opacity-40" : "hover:border-primary/30 hover:text-foreground",
          )}
        >
          Anterior
        </button>
        <span className="text-sm text-muted-foreground">
          Página {current + 1} de {pages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
          disabled={current >= pages - 1}
          className={cn(
            "rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-medium transition-colors",
            current >= pages - 1 ? "opacity-40" : "hover:border-primary/30 hover:text-foreground",
          )}
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
