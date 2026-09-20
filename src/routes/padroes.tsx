import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { axisProps, gridProps, legendProps, tooltipProps } from "../components/lottery/chart-theme";

import { useGame } from "../components/lottery/game-context";
import { Loading, PageHeader, StatCard } from "../components/lottery/shell";
import { Verdict, verdictFromP } from "../components/lottery/verdict";
import { useAnalysis } from "../hooks/use-lottery";
import type { GoodnessOfFit } from "../lib/lottery";

export const Route = createFileRoute("/padroes")({
  head: () => ({ meta: [{ title: "Padrões — Projeto Million" }] }),
  component: Padroes,
});

function FitBlock({ fit, explanation }: { fit: GoodnessOfFit; explanation: string }) {
  const data = fit.bins.map((b) => ({
    label: b.label,
    Observado: b.observed,
    Esperado: Number(b.expected.toFixed(1)),
  }));

  return (
    <section className="card-premium p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl leading-tight">{fit.label}</h2>
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          χ² = {fit.chi2.toFixed(2)} · df = {fit.df} · p = {fit.p.toFixed(4)}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{explanation}</p>

      <div className="mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip {...tooltipProps} />
            <Legend {...legendProps} />
            <Bar dataKey="Observado" fill="var(--color-primary)" radius={2} />
            <Bar dataKey="Esperado" fill="var(--color-chart-2)" radius={2} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <Verdict className="mt-4" kind={verdictFromP(fit.p)}>
        {fit.rejects
          ? "O observado se afasta da distribuição teórica mais do que o acaso explicaria."
          : "O observado é indistinguível da distribuição exata sob sorteio uniforme."}
      </Verdict>
    </section>
  );
}

function Padroes() {
  const { gameId, game } = useGame();
  const { patterns, isLoading } = useAnalysis(gameId);

  if (isLoading || !patterns) return <Loading />;

  const rangeData = patterns.ranges.map((r) => ({
    label: r.label,
    Observado: r.observed,
    Esperado: Number(r.expected.toFixed(1)),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Aderência"
        title="Padrões estruturais"
        subtitle="Cada padrão é comparado com a sua distribuição EXATA sob sorteio uniforme, calculada por combinatória — não por simulação nem por intuição. Sem esse valor de referência, qualquer contagem parece notável."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Concursos" value={patterns.drawCount.toLocaleString("pt-BR")} />
        <StatCard
          label="Testes que rejeitam"
          value={`${patterns.rejectedCount} / 4`}
          tone={patterns.rejectedCount > 0 ? "warn" : "good"}
        />
        <StatCard
          label="Soma média"
          value={patterns.sums.mean.toFixed(1)}
          hint={`Teórica: ${patterns.sums.theoreticalMean}`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <FitBlock
          fit={patterns.consecutive}
          explanation={`Quantos pares de dezenas vizinhas (como 24 e 25) saem juntos. Num sorteio de ${game.picks} dezenas entre ${game.pool}, a ausência de consecutivos é o caso mais provável — não uma coincidência.`}
        />
        <FitBlock
          fit={patterns.parity}
          explanation="Quantidade de dezenas ímpares por concurso, contra a hipergeométrica exata."
        />
        <FitBlock
          fit={patterns.repeats}
          explanation="Dezenas repetidas em relação ao concurso imediatamente anterior. A crença comum é que repetir é raro; a distribuição exata diz o contrário."
        />
        <FitBlock
          fit={patterns.sums.fit}
          explanation={`Soma das dezenas sorteadas. A faixa central teórica (${patterns.sums.theoreticalBand.low}–${patterns.sums.theoreticalBand.high}) concentra 80% dos resultados, mas apostar nela não muda a probabilidade de acerto: só concentra as apostas onde há mais combinações.`}
        />
      </div>

      <section className="card-premium p-6">
        <h2 className="font-display text-xl leading-tight">Distribuição por faixa</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Quantas dezenas saem em cada faixa do volante, contra o esperado proporcional ao tamanho
          da faixa.
        </p>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rangeData} margin={{ top: 4, right: 8, bottom: 4, left: -8 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip {...tooltipProps} />
              <Legend {...legendProps} />
              <Bar dataKey="Observado" fill="var(--color-primary)" radius={2} />
              <Bar dataKey="Esperado" fill="var(--color-chart-2)" radius={2} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
