import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Bar,
  BarChart,
  ReferenceArea,
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

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Projeto Million" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { gameId, game } = useGame();
  const { set, frequency, patterns, pairs, trends, isLoading } = useAnalysis(gameId);

  const sumSeries = useMemo(() => {
    if (!set) return [];
    // Amostra para manter o gráfico leve em milhares de concursos.
    const step = Math.max(1, Math.floor(set.draws.length / 400));
    return set.draws
      .filter((_, i) => i % step === 0)
      .map((d) => ({
        concurso: d.contest,
        soma: d.numbers.reduce((a, b) => a + b, 0),
      }));
  }, [set]);

  if (isLoading || !set || !frequency || !patterns || !pairs || !trends) return <Loading />;

  const tests = [
    {
      label: "Uniformidade das dezenas",
      stat: `χ² = ${frequency.uniformity.chi2.toFixed(1)}`,
      p: frequency.uniformity.p,
      to: "/frequencia" as const,
    },
    {
      label: "Pares consecutivos",
      stat: `χ² = ${patterns.consecutive.chi2.toFixed(1)}`,
      p: patterns.consecutive.p,
      to: "/padroes" as const,
    },
    {
      label: "Paridade",
      stat: `χ² = ${patterns.parity.chi2.toFixed(1)}`,
      p: patterns.parity.p,
      to: "/padroes" as const,
    },
    {
      label: "Repetições",
      stat: `χ² = ${patterns.repeats.chi2.toFixed(1)}`,
      p: patterns.repeats.p,
      to: "/padroes" as const,
    },
    {
      label: "Distribuição das somas",
      stat: `χ² = ${patterns.sums.fit.chi2.toFixed(1)}`,
      p: patterns.sums.fit.p,
      to: "/padroes" as const,
    },
  ];

  const freqData = frequency.stats.map((s) => ({ n: s.number, saiu: s.count }));
  const expected = frequency.stats[0]?.expected ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Visão geral"
        title={`Dashboard — ${game.name}`}
        subtitle={`Visão consolidada de ${set.draws.length.toLocaleString("pt-BR")} concursos, com o veredito de cada teste formal à vista.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Concursos" value={set.draws.length.toLocaleString("pt-BR")} />
        <StatCard
          label="Testes formais"
          value={(game.pool + pairs.totalPairs + 5).toLocaleString("pt-BR")}
          hint="dezenas + pares + padrões"
        />
        <StatCard
          label="Rejeitam o acaso"
          value={`${patterns.rejectedCount + (frequency.uniformity.rejectsUniform ? 1 : 0)} / 5`}
          tone={patterns.rejectedCount > 0 ? "warn" : "good"}
        />
        <StatCard
          label="Atualizado em"
          value={new Date(set.updatedAt).toLocaleDateString("pt-BR")}
        />
      </div>

      <section className="card-premium p-6">
        <h2 className="font-display text-xl leading-tight">Painel de testes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cinco testes independentes contra a hipótese de sorteio uniforme.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="py-2 text-left font-medium">Teste</th>
                <th className="px-3 py-2 text-right font-medium">Estatística</th>
                <th className="px-3 py-2 text-right font-medium">p</th>
                <th className="px-3 py-2 text-right font-medium">Veredito</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t.label} className="border-t border-hairline">
                  <td className="py-2">
                    <Link to={t.to} className="hover:underline">
                      {t.label}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {t.stat}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2 text-right tabular-nums",
                      t.p < 0.05 && "font-medium text-chart-4",
                    )}
                  >
                    {t.p.toFixed(4)}
                  </td>
                  <td className="px-3 py-2 text-right text-xs">
                    {t.p < 0.05 ? (
                      <span className="text-chart-4">desvio</span>
                    ) : (
                      <span className="text-muted-foreground">compatível</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Verdict className="mt-4" kind={patterns.rejectedCount > 1 ? "limitrofe" : "ruido"}>
          Rodando 5 testes a 5%, a chance de pelo menos um acusar desvio num sorteio perfeitamente
          honesto já é de {((1 - 0.95 ** 5) * 100).toFixed(0)}%. Um p abaixo de 0,05 isolado não é
          evidência de fraude.
        </Verdict>
      </section>

      <section className="card-premium p-6">
        <h2 className="font-display text-xl leading-tight">Frequência por dezena</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={freqData} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="n" {...axisProps} interval={game.pool > 30 ? 4 : 0} />
              <YAxis {...axisProps} domain={[0, "dataMax"]} />
              <Tooltip
                {...tooltipProps}
                labelFormatter={(l) => `Dezena ${l}`}
                formatter={(v: number) => [v, "vezes"]}
              />
              <ReferenceArea
                y1={expected - 2 * Math.sqrt(expected)}
                y2={expected + 2 * Math.sqrt(expected)}
                fill="var(--color-chart-2)"
                fillOpacity={0.12}
              />
              <Bar dataKey="saiu" radius={2}>
                {frequency.stats.map((s) => (
                  <Cell
                    key={s.number}
                    fill={s.significant ? "var(--color-destructive)" : "var(--color-primary)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          A faixa sombreada é o intervalo de ±2 desvios-padrão em torno do valor esperado (
          {expected.toFixed(0)} aparições). Barras dentro dela são rigorosamente normais.
        </p>
      </section>

      <section className="card-premium p-6">
        <h2 className="font-display text-xl leading-tight">Soma das dezenas ao longo do tempo</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sumSeries} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="concurso" {...axisProps} minTickGap={40} />
              <YAxis {...axisProps} />
              <Tooltip {...tooltipProps} labelFormatter={(l) => `Concurso ${l}`} />
              <ReferenceArea
                y1={patterns.sums.theoreticalBand.low}
                y2={patterns.sums.theoreticalBand.high}
                fill="var(--color-chart-2)"
                fillOpacity={0.12}
              />
              <Area
                type="monotone"
                dataKey="soma"
                stroke="var(--color-primary)"
                fill="var(--color-primary)"
                fillOpacity={0.15}
                strokeWidth={1}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Faixa sombreada: onde a teoria coloca 80% dos sorteios (
          {patterns.sums.theoreticalBand.low}–{patterns.sums.theoreticalBand.high}). Observado:
          média {patterns.sums.mean.toFixed(1)} contra {patterns.sums.theoreticalMean} teórica.
        </p>
      </section>
    </div>
  );
}
