import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { axisProps, gridProps, legendProps, tooltipProps } from "../components/lottery/chart-theme";

import { useGame } from "../components/lottery/game-context";
import { Loading, PageHeader, StatCard } from "../components/lottery/shell";
import { Verdict } from "../components/lottery/verdict";
import { useAnalysis } from "../hooks/use-lottery";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/frequencia")({
  head: () => ({ meta: [{ title: "Frequência — Projeto Million" }] }),
  component: Frequencia,
});

type SortKey = "number" | "count" | "z" | "q" | "gap";

function Frequencia() {
  const { gameId, game } = useGame();
  const [window, setWindow] = useState<number | undefined>(undefined);
  const [sort, setSort] = useState<SortKey>("number");
  const { frequency, set, isLoading } = useAnalysis(gameId, window);

  if (isLoading || !frequency || !set) return <Loading />;

  const sorted = [...frequency.stats].sort((a, b) => {
    if (sort === "number") return a.number - b.number;
    if (sort === "count") return b.count - a.count;
    if (sort === "z") return Math.abs(b.z) - Math.abs(a.z);
    if (sort === "gap") return b.gap - a.gap;
    return a.q - b.q;
  });

  const chartData = frequency.stats.map((s) => ({ n: s.number, z: s.z, count: s.count }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Análise por dezena"
        title="Frequência por dezena"
        subtitle="Cada dezena é testada contra a hipótese de sorteio uniforme. A coluna que importa é o q: o p-valor já corrigido para o fato de que estamos testando todas as dezenas de uma vez."
      />

      <div className="flex flex-wrap gap-2">
        {[
          { label: "Todo o histórico", value: undefined },
          { label: "Últimos 500", value: 500 },
          { label: "Últimos 200", value: 200 },
          { label: "Últimos 100", value: 100 },
        ].map((opt) => (
          <button
            key={opt.label}
            onClick={() => setWindow(opt.value)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              window === opt.value
                ? "border-primary/60 bg-primary text-primary-foreground shadow-subtle"
                : "border-border bg-surface text-muted-foreground hover:border-primary/30 hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Concursos" value={frequency.drawCount.toLocaleString("pt-BR")} />
        <StatCard
          label="Qui-quadrado"
          value={frequency.uniformity.chi2.toFixed(1)}
          hint={`Crítico a 5%: ${frequency.uniformity.critical5pct.toFixed(1)}`}
        />
        <StatCard
          label="p-valor global"
          value={frequency.uniformity.p.toFixed(4)}
          tone={frequency.uniformity.p < 0.05 ? "warn" : "good"}
        />
        <StatCard
          label="Significativas (FDR 5%)"
          value={`${frequency.significantCount} / ${game.pool}`}
          tone={frequency.significantCount > 0 ? "warn" : "good"}
        />
      </div>

      <Verdict kind={frequency.significantCount === 0 ? "ruido" : "limitrofe"}>
        {frequency.significantCount === 0 ? (
          <>
            Sem correção, {frequency.stats.filter((s) => s.p < 0.05).length} dezenas pareceriam
            "significativas" — e o acaso sozinho produziria cerca de {(game.pool * 0.05).toFixed(1)}
            . Depois da correção de Benjamini-Hochberg, nenhuma sobrevive.
          </>
        ) : (
          <>
            {frequency.significantCount} dezena(s) sobrevivem à correção. Isso não indica viés do
            sorteio: veja no Backtest se essa informação tem algum valor preditivo — ela não tem.
          </>
        )}
      </Verdict>

      <div className="card-premium p-5">
        <div className="mb-3 text-sm font-medium">
          Desvio de cada dezena, em unidades de desvio-padrão
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
              <XAxis dataKey="n" {...axisProps} interval={game.pool > 30 ? 4 : 0} />
              <YAxis {...axisProps} domain={[-4, 4]} />
              <Tooltip
                formatter={(v: number, name) =>
                  name === "z" ? [v.toFixed(2), "z-score"] : [v, name]
                }
                labelFormatter={(l) => `Dezena ${l}`}
                {...tooltipProps}
              />
              <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.3} />
              <ReferenceLine
                y={1.96}
                stroke="currentColor"
                strokeDasharray="4 4"
                strokeOpacity={0.4}
                label={{
                  value: "±1,96 (5% sem correção)",
                  fontSize: 10,
                  position: "insideTopRight",
                }}
              />
              <ReferenceLine
                y={-1.96}
                stroke="currentColor"
                strokeDasharray="4 4"
                strokeOpacity={0.4}
              />
              <Bar dataKey="z" radius={2}>
                {chartData.map((d) => (
                  <Cell
                    key={d.n}
                    fill={Math.abs(d.z) > 1.96 ? "var(--color-chart-4)" : "var(--color-primary)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Barras fora das linhas tracejadas seriam "significativas" num teste isolado. Com{" "}
          {game.pool} testes simultâneos, algumas delas são esperadas mesmo num sorteio
          perfeitamente honesto.
        </p>
      </div>

      <div className="card-premium overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              {(
                [
                  ["number", "Dezena"],
                  ["count", "Saiu"],
                  ["z", "z"],
                  ["q", "q (FDR)"],
                  ["gap", "Atraso"],
                ] as [SortKey, string][]
              ).map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => setSort(key)}
                  className={cn(
                    "cursor-pointer px-3 py-2 text-left font-medium hover:text-foreground",
                    sort === key && "text-foreground",
                  )}
                >
                  {label}
                </th>
              ))}
              <th className="px-3 py-2 text-left font-medium">IC 95% da taxa</th>
              <th className="px-3 py-2 text-left font-medium">Atraso médio</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
              <tr key={s.number} className="border-t border-hairline">
                <td className="px-3 py-1.5 font-semibold tabular-nums">
                  {String(s.number).padStart(2, "0")}
                </td>
                <td className="px-3 py-1.5 tabular-nums">
                  {s.count}
                  <span className="ml-1 text-xs text-muted-foreground">
                    (esp. {s.expected.toFixed(0)})
                  </span>
                </td>
                <td
                  className={cn(
                    "px-3 py-1.5 tabular-nums",
                    Math.abs(s.z) > 1.96 && "font-medium text-chart-4",
                  )}
                >
                  {s.z >= 0 ? "+" : ""}
                  {s.z.toFixed(2)}
                </td>
                <td
                  className={cn(
                    "px-3 py-1.5 tabular-nums",
                    s.significant && "font-semibold text-destructive",
                  )}
                >
                  {s.q.toFixed(3)}
                </td>
                <td className="px-3 py-1.5 tabular-nums">
                  {s.gap}
                  <span className="ml-1 text-xs text-muted-foreground">
                    (esp. {s.expectedGap.toFixed(1)})
                  </span>
                </td>
                <td className="px-3 py-1.5 text-xs tabular-nums text-muted-foreground">
                  {(s.ci.low * 100).toFixed(1)}% – {(s.ci.high * 100).toFixed(1)}%
                </td>
                <td className="px-3 py-1.5 text-xs tabular-nums text-muted-foreground">
                  {s.meanGap.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
