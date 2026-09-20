import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { axisProps, gridProps, legendProps, tooltipProps } from "../components/lottery/chart-theme";
import { useGame } from "../components/lottery/game-context";
import { Loading, PageHeader, Panel, StatCard } from "../components/lottery/shell";
import { Verdict, verdictFromP } from "../components/lottery/verdict";
import { useHeavyAnalysis } from "../hooks/use-heavy-analysis";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/estrutura")({
  head: () => ({ meta: [{ title: "Estrutura — Projeto Million" }] }),
  component: Estrutura,
});

function Estrutura() {
  const { gameId, game } = useGame();
  const { data, loading, error } = useHeavyAnalysis("structure", gameId);

  if (error) return <div className="text-sm text-destructive">Erro: {error}</div>;
  if (loading || !data) return <Loading label="Calculando distribuições exatas..." />;

  const orderData = data.orderStats.map((o) => ({
    posicao: o.label,
    Observada: Number(o.observedMean.toFixed(2)),
    Exata: Number(o.expectedMean.toFixed(2)),
  }));

  const spacingData = data.spacings.fit.bins.map((b) => ({
    label: b.label,
    Observado: b.observed,
    Esperado: Number(b.expected.toFixed(1)),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Estrutura interna"
        title="A forma do sorteio"
        subtitle="As outras páginas olham cada dezena isolada. Aqui a unidade de análise é o conjunto: onde as dezenas caem no volante, que distância guardam entre si, e quanto do volante elas cobrem. Toda referência é exata, derivada por combinatória."
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Concursos" value={data.drawCount.toLocaleString("pt-BR")} />
        <StatCard
          label="Testes que rejeitam"
          value={`${data.rejectedCount} / ${data.totalTests}`}
          tone={data.rejectedCount > data.totalTests * 0.05 ? "warn" : "good"}
        />
        <StatCard
          label="Espaçamento médio"
          value={data.spacings.observedMean.toFixed(2)}
          hint={`Exato: ${data.spacings.expectedMean.toFixed(2)}`}
        />
        <StatCard
          label="Amplitude média"
          value={data.range.observedMean.toFixed(1)}
          hint={`Exata: ${data.range.expectedMean.toFixed(1)}`}
        />
      </div>

      <Panel
        title="Estatísticas de ordem"
        description={`Onde cai a menor dezena de cada sorteio, a segunda menor, e assim por diante. Cada posição tem distribuição exata conhecida (hipergeométrica negativa), com média j·(N+1)/(k+1).`}
      >
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={orderData} margin={{ top: 4, right: 8, bottom: 4, left: -12 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="posicao" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip {...tooltipProps} />
              <Legend {...legendProps} />
              <Bar dataKey="Observada" fill="var(--color-primary)" radius={3} />
              <Bar dataKey="Exata" fill="var(--color-chart-2)" radius={3} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="py-2 text-left font-medium">Posição</th>
                <th className="px-3 py-2 text-right font-medium">Média observada</th>
                <th className="px-3 py-2 text-right font-medium">Média exata</th>
                <th className="px-3 py-2 text-right font-medium">χ²</th>
                <th className="px-3 py-2 text-right font-medium">p</th>
                <th className="px-3 py-2 text-right font-medium">Veredito</th>
              </tr>
            </thead>
            <tbody>
              {data.orderStats.map((o) => (
                <tr key={o.j} className="border-t border-hairline">
                  <td className="py-2 font-medium">{o.label}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">
                    {o.observedMean.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-muted-foreground">
                    {o.expectedMean.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-muted-foreground">
                    {o.fit.chi2.toFixed(1)}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2 text-right font-mono text-xs tabular-nums",
                      o.fit.rejects && "text-warning",
                    )}
                  >
                    {o.fit.p.toFixed(4)}
                  </td>
                  <td className="px-3 py-2 text-right text-xs">
                    {o.fit.rejects ? (
                      <span className="text-warning">desvio</span>
                    ) : (
                      <span className="text-muted-foreground">compatível</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Verdict className="mt-5" kind={data.rejectedCount > 1 ? "limitrofe" : "ruido"}>
          Com {game.picks} posições testadas a 5%, o acaso sozinho produziria{" "}
          {(game.picks * 0.05).toFixed(1)} rejeição. Observado:{" "}
          {data.orderStats.filter((o) => o.fit.rejects).length}. O p que vale está na seção abaixo.
        </Verdict>
      </Panel>

      <Panel
        title="Correção look-elsewhere"
        description="Um qui-quadrado pode ficar significativo por causa de uma única célula extrema entre dezenas delas. Benjamini-Hochberg corrige pelo número de testes, mas não por isso. Esta simulação repete o procedimento inteiro — inclusive a escolha do máximo — sob sorteio uniforme perfeito."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Menor p observado"
            value={data.lookElsewhere.observedMinP.toFixed(4)}
            hint="entre todas as posições, sem correção"
            tone={data.lookElsewhere.observedMinP < 0.05 ? "warn" : "default"}
          />
          <StatCard
            label="p corrigido"
            value={data.lookElsewhere.correctedP.toFixed(3)}
            hint={`± ${data.lookElsewhere.mcError.toFixed(3)} · ${data.lookElsewhere.sims.toLocaleString("pt-BR")} simulações`}
            tone={data.lookElsewhere.correctedP < 0.05 ? "warn" : "good"}
          />
          <StatCard
            label="p da célula extrema"
            value={data.lookElsewhere.cellCorrectedP.toFixed(3)}
            hint={`± ${data.lookElsewhere.cellMcError.toFixed(3)}`}
            tone={data.lookElsewhere.cellCorrectedP < 0.05 ? "warn" : "good"}
          />
        </div>

        <div className="mt-5 rounded-xl border border-border bg-surface p-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Célula mais extrema do histórico
          </p>
          <p className="mt-2 text-sm">
            Valor{" "}
            <span className="font-mono font-medium">{data.lookElsewhere.extremeCell.label}</span> na{" "}
            <span className="font-medium">{data.lookElsewhere.extremeCell.position}ª posição</span>:{" "}
            <span className="font-mono">{data.lookElsewhere.extremeCell.observed}</span> sorteios
            contra{" "}
            <span className="font-mono">{data.lookElsewhere.extremeCell.expected.toFixed(1)}</span>{" "}
            esperados — resíduo{" "}
            <span
              className={cn(
                "font-mono font-medium",
                Math.abs(data.lookElsewhere.extremeCell.residual) > 3 && "text-warning",
              )}
            >
              {data.lookElsewhere.extremeCell.residual >= 0 ? "+" : ""}
              {data.lookElsewhere.extremeCell.residual.toFixed(2)}
            </span>
            .
          </p>
        </div>

        <Verdict
          className="mt-5"
          kind={
            data.lookElsewhere.cellCorrectedP < 0.01
              ? "sinal"
              : data.lookElsewhere.cellCorrectedP < 0.05
                ? "limitrofe"
                : "ruido"
          }
        >
          Sob sorteio uniforme perfeito, o acaso produz uma célula tão extrema quanto esta em{" "}
          <strong>{(data.lookElsewhere.cellCorrectedP * 100).toFixed(1)}%</strong> dos históricos
          simulados. O p nominal de {data.lookElsewhere.observedMinP.toFixed(4)} parece forte porque
          foi escolhido entre {game.picks} posições e dezenas de valores dentro de cada uma.
        </Verdict>

        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Uma ressalva que a simulação não cobre: a posição de uma dezena no resultado ordenado não
          é propriedade física de bola nenhuma — é um rótulo atribuído depois do sorteio. Um desvio
          que aparecesse só nesse rótulo, sem tocar na frequência total da dezena, não corresponde a
          mecanismo algum numa urna.
        </p>
      </Panel>

      <Panel
        title="Espaçamento entre dezenas"
        description="Distância entre dezenas consecutivas dentro do mesmo sorteio. Sob sorteio uniforme, todos os espaçamentos têm a mesma distribuição exata: P(D = d) = C(N−d, k−1) / C(N, k)."
      >
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={spacingData} margin={{ top: 4, right: 8, bottom: 4, left: -8 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip {...tooltipProps} />
              <Legend {...legendProps} />
              <Bar dataKey="Observado" fill="var(--color-primary)" radius={3} />
              <Bar dataKey="Esperado" fill="var(--color-chart-2)" radius={3} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <Verdict className="mt-4" kind={verdictFromP(data.spacings.fit.p)}>
          χ² = {data.spacings.fit.chi2.toFixed(1)}, p = {data.spacings.fit.p.toFixed(4)}. O maior
          vão dentro de um sorteio é, em média, {data.spacings.maxGapMean.toFixed(1)} dezenas — o
          que faz sorteios parecerem "concentrados" mesmo sendo uniformes.
        </Verdict>
      </Panel>

      <Panel
        title="Amplitude"
        description="Distância entre a maior e a menor dezena sorteada. Mede quanto do volante o sorteio cobre."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Observada"
            value={data.range.observedMean.toFixed(2)}
            hint="média de todos os concursos"
          />
          <StatCard
            label="Exata"
            value={data.range.expectedMean.toFixed(2)}
            hint="(N+1)(k−1)/(k+1)"
          />
          <StatCard
            label="p do teste"
            value={data.range.fit.p.toFixed(4)}
            tone={data.range.fit.rejects ? "warn" : "good"}
          />
        </div>
        <Verdict className="mt-4" kind={verdictFromP(data.range.fit.p)}>
          Sorteios raramente cobrem o volante inteiro: a amplitude média é{" "}
          {((data.range.observedMean / game.pool) * 100).toFixed(0)}% das {game.pool} dezenas. Isso
          é geometria da combinatória, não tendência do sorteio.
        </Verdict>
      </Panel>
    </div>
  );
}
