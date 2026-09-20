import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { useGame } from "../components/lottery/game-context";
import { Loading, PageHeader, StatCard } from "../components/lottery/shell";
import { Verdict } from "../components/lottery/verdict";
import { useAnalysis } from "../hooks/use-lottery";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/heatmap")({
  head: () => ({ meta: [{ title: "Heatmap — Projeto Million" }] }),
  component: Heatmap,
});

type Metric = "frequencia" | "atraso" | "z";

const METRICS: { id: Metric; label: string; hint: string }[] = [
  { id: "frequencia", label: "Frequência", hint: "vezes que a dezena saiu" },
  { id: "atraso", label: "Atraso", hint: "concursos desde a última aparição" },
  { id: "z", label: "Desvio (z)", hint: "distância da média, em desvios-padrão" },
];

function Heatmap() {
  const { gameId, game } = useGame();
  const { frequency, isLoading } = useAnalysis(gameId);
  const [metric, setMetric] = useState<Metric>("frequencia");

  if (isLoading || !frequency) return <Loading />;

  const values = frequency.stats.map((s) =>
    metric === "frequencia" ? s.count : metric === "atraso" ? s.gap : s.z,
  );
  const min = Math.min(...values);
  const max = Math.max(...values);

  // Escala de cor: frio (chart-2) → quente (destructive), via opacidade.
  const intensity = (v: number) => (max === min ? 0.5 : (v - min) / (max - min));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Visualização"
        title="Mapa de calor"
        subtitle="Visualização direta da frequência, do atraso e do desvio de cada dezena. É uma leitura descritiva do passado: a intensidade da cor não indica probabilidade futura."
      />

      <div className="flex flex-wrap gap-2">
        {METRICS.map((m) => (
          <button
            key={m.id}
            onClick={() => setMetric(m.id)}
            title={m.hint}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              metric === m.id
                ? "border-primary/60 bg-primary text-primary-foreground shadow-subtle"
                : "border-border bg-surface text-muted-foreground hover:border-primary/30 hover:text-foreground",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Mínimo" value={min.toFixed(metric === "z" ? 2 : 0)} />
        <StatCard label="Máximo" value={max.toFixed(metric === "z" ? 2 : 0)} />
        <StatCard
          label="Amplitude"
          value={(max - min).toFixed(metric === "z" ? 2 : 0)}
          hint={METRICS.find((m) => m.id === metric)?.hint ?? ""}
        />
      </div>

      <div className="card-premium p-6">
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${game.pool > 30 ? 10 : 5}, minmax(0, 1fr))` }}
        >
          {frequency.stats.map((s) => {
            const v = metric === "frequencia" ? s.count : metric === "atraso" ? s.gap : s.z;
            const t = intensity(v);
            return (
              <div
                key={s.number}
                title={`Dezena ${s.number}\nSaiu ${s.count}x\nAtraso ${s.gap}\nz = ${s.z.toFixed(2)}\nq = ${s.q.toFixed(3)}`}
                className="flex aspect-square flex-col items-center justify-center rounded-md border border-border text-center"
                style={{
                  backgroundColor: `color-mix(in oklch, var(--destructive) ${(t * 85).toFixed(0)}%, var(--card))`,
                }}
              >
                <span className="text-sm font-bold tabular-nums">
                  {String(s.number).padStart(2, "0")}
                </span>
                <span className="text-[10px] tabular-nums opacity-70">
                  {metric === "z" ? v.toFixed(1) : v}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{min.toFixed(metric === "z" ? 2 : 0)}</span>
          <div
            className="h-2 flex-1 rounded-full"
            style={{
              background:
                "linear-gradient(to right, var(--card), color-mix(in oklch, var(--destructive) 85%, var(--card)))",
            }}
          />
          <span>{max.toFixed(metric === "z" ? 2 : 0)}</span>
        </div>
      </div>

      <Verdict kind="descritivo">
        A diferença entre a dezena mais quente e a mais fria é de{" "}
        {(max - min).toFixed(metric === "z" ? 2 : 0)}{" "}
        {metric === "frequencia"
          ? "aparições"
          : metric === "atraso"
            ? "concursos"
            : "desvios-padrão"}
        {metric === "frequencia"
          ? ` em ${frequency.drawCount.toLocaleString("pt-BR")} concursos — variação compatível com flutuação aleatória.`
          : "."}
      </Verdict>
    </div>
  );
}
