import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
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
import { useAnalysis, useDraws } from "../hooks/use-lottery";
import { movingAverage } from "../lib/lottery";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/tendencias")({
  head: () => ({ meta: [{ title: "Tendências — Projeto Million" }] }),
  component: Tendencias,
});

function Tendencias() {
  const { gameId, game } = useGame();
  const { trends, isLoading } = useAnalysis(gameId);
  const { data: set } = useDraws(gameId);
  const [selected, setSelected] = useState(1);

  const series = useMemo(() => {
    if (!set) return [];
    const ma = movingAverage(set.draws, selected, 50);
    const offset = set.draws.length - ma.length;
    return ma.map((v, i) => ({
      concurso: set.draws[offset + i]?.contest ?? 0,
      frequencia: Number(v.toFixed(2)),
    }));
  }, [set, selected]);

  if (isLoading || !trends || !set) return <Loading />;

  const expectedRate = (game.picks / game.pool) * 100;
  const rising = trends.stats.filter((s) => s.direction === "subindo");
  const falling = trends.stats.filter((s) => s.direction === "descendo");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Séries temporais"
        title="Tendências"
        subtitle={`Regressão linear da ocorrência de cada dezena nos últimos ${trends.window} concursos. Esta é a análise que costuma ser vendida como "preditiva" — acompanhada, aqui, do número de achados que o acaso produziria sozinho.`}
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Janela" value={`${trends.window} concursos`} />
        <StatCard label="Em alta" value={rising.length} />
        <StatCard label="Em baixa" value={falling.length} />
        <StatCard
          label="Esperado por acaso"
          value={trends.expectedByChance.toFixed(1)}
          hint="a 5%, sem correção"
          tone="warn"
        />
      </div>

      <Verdict kind={trends.naiveSignificant > trends.expectedByChance * 2 ? "limitrofe" : "ruido"}>
        {trends.naiveSignificant} dezenas mostram tendência "significativa" a 5% sem correção. Num
        sorteio perfeitamente honesto, o número esperado seria {trends.expectedByChance.toFixed(1)}.{" "}
        {trends.naiveSignificant <= trends.expectedByChance * 2
          ? "O observado está dentro do que o acaso explica."
          : "O excesso merece investigação, mas veja o Backtest antes de agir sobre ele."}
      </Verdict>

      <section className="card-premium p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl leading-tight">
            Média móvel de 50 concursos — dezena {String(selected).padStart(2, "0")}
          </h2>
          <select
            value={selected}
            onChange={(e) => setSelected(Number(e.target.value))}
            className="rounded-lg border border-input bg-surface px-3 py-1.5 text-sm transition-colors focus:border-primary/50"
          >
            {Array.from({ length: game.pool }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                Dezena {String(n).padStart(2, "0")}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="concurso" {...axisProps} minTickGap={40} />
              <YAxis {...axisProps} unit="%" />
              <Tooltip
                {...tooltipProps}
                formatter={(v: number) => [`${v}%`, "frequência"]}
                labelFormatter={(l) => `Concurso ${l}`}
              />
              <ReferenceLine
                y={expectedRate}
                stroke="var(--color-chart-2)"
                strokeDasharray="4 4"
                label={{
                  value: `esperado ${expectedRate.toFixed(1)}%`,
                  fontSize: 10,
                  position: "insideTopRight",
                }}
              />
              <Line
                type="monotone"
                dataKey="frequencia"
                stroke="var(--color-primary)"
                dot={false}
                strokeWidth={1.5}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          A oscilação em torno da linha tracejada é o comportamento normal de uma média móvel curta
          sobre eventos independentes. Picos e vales não antecipam nada.
        </p>
      </section>

      <div className="card-premium overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Dezena</th>
              <th className="px-3 py-2 text-right font-medium">1ª metade</th>
              <th className="px-3 py-2 text-right font-medium">2ª metade</th>
              <th className="px-3 py-2 text-right font-medium">t</th>
              <th className="px-3 py-2 text-right font-medium">p</th>
              <th className="px-3 py-2 text-right font-medium">Direção</th>
            </tr>
          </thead>
          <tbody>
            {[...trends.stats]
              .sort((a, b) => Math.abs(b.t) - Math.abs(a.t))
              .map((s) => (
                <tr
                  key={s.number}
                  className="cursor-pointer border-t border-hairline transition-colors hover:bg-surface-muted"
                  onClick={() => setSelected(s.number)}
                >
                  <td className="px-4 py-1.5 font-semibold tabular-nums">
                    {String(s.number).padStart(2, "0")}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{s.firstHalf.toFixed(1)}%</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {s.secondHalf.toFixed(1)}%
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{s.t.toFixed(2)}</td>
                  <td
                    className={cn(
                      "px-3 py-1.5 text-right tabular-nums",
                      s.p < 0.05 && "text-chart-4",
                    )}
                  >
                    {s.p.toFixed(3)}
                  </td>
                  <td className="px-3 py-1.5 text-right text-xs">
                    <span
                      className={cn(
                        s.direction === "subindo" && "text-chart-2",
                        s.direction === "descendo" && "text-destructive",
                        s.direction === "estável" && "text-muted-foreground",
                      )}
                    >
                      {s.direction}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
