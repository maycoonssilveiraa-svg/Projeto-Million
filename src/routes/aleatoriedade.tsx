import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { axisProps, gridProps, tooltipProps } from "../components/lottery/chart-theme";
import { useGame } from "../components/lottery/game-context";
import { Loading, PageHeader, Panel, StatCard } from "../components/lottery/shell";
import { Verdict, verdictFromP } from "../components/lottery/verdict";
import { useHeavyAnalysis } from "../hooks/use-heavy-analysis";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/aleatoriedade")({
  head: () => ({ meta: [{ title: "Aleatoriedade — Projeto Million" }] }),
  component: Aleatoriedade,
});

function Aleatoriedade() {
  const { gameId, game } = useGame();
  const { data, loading, error } = useHeavyAnalysis("randomness", gameId);

  if (error) return <div className="text-sm text-destructive">Erro: {error}</div>;
  if (loading || !data) {
    return <Loading label="Rodando a bateria de aleatoriedade..." />;
  }

  const lagData = data.lags.map((l) => ({
    lag: l.lag,
    z: Number(l.z.toFixed(2)),
    significativo: l.significant,
  }));

  const gapData = data.gaps.fit.bins.slice(0, 20).map((b) => ({
    label: b.label,
    Observado: b.observed,
    Geométrica: Number(b.expected.toFixed(1)),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dependência serial"
        title="A série tem memória?"
        subtitle="Frequência responde se uma dezena sai demais. Esta página faz a pergunta mais funda: a sequência de concursos carrega estrutura temporal — memória, ciclo, tendência a repetir ou a evitar? É a bateria clássica de validação de geradores aleatórios, aplicada à loteria."
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Concursos" value={data.drawCount.toLocaleString("pt-BR")} />
        <StatCard
          label="Testes aplicados"
          value={data.totalTests.toLocaleString("pt-BR")}
          hint="lags, intervalos, sequências e ciclos"
        />
        <StatCard
          label="Rejeitam o acaso"
          value={data.rejectedCount}
          tone={data.rejectedCount > 0 ? "warn" : "good"}
        />
        <StatCard
          label="Entropia"
          value={`${((data.entropy / data.maxEntropy) * 100).toFixed(3)}%`}
          hint={`${data.entropy.toFixed(4)} de ${data.maxEntropy.toFixed(4)} bits`}
          tone="good"
        />
      </div>

      <Panel
        title="Memória entre concursos"
        description="Quantas dezenas um concurso tem em comum com o de N concursos atrás. Sob independência, a sobreposição segue a hipergeométrica exata em TODOS os lags. Desvio aqui seria o achado mais forte possível: memória no sorteio."
      >
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={lagData} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="lag" {...axisProps} />
              <YAxis {...axisProps} domain={[-4, 4]} />
              <Tooltip
                {...tooltipProps}
                formatter={(v: number) => [v.toFixed(2), "z"]}
                labelFormatter={(l) => `Lag ${l}`}
              />
              <ReferenceLine y={0} stroke="var(--color-border)" />
              <ReferenceLine
                y={1.96}
                stroke="var(--color-warning)"
                strokeDasharray="4 4"
                strokeOpacity={0.6}
              />
              <ReferenceLine
                y={-1.96}
                stroke="var(--color-warning)"
                strokeDasharray="4 4"
                strokeOpacity={0.6}
              />
              <Bar dataKey="z" radius={3}>
                {lagData.map((d) => (
                  <Cell
                    key={d.lag}
                    fill={d.significativo ? "var(--color-destructive)" : "var(--color-primary)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <Verdict className="mt-4" kind={data.lags.some((l) => l.significant) ? "sinal" : "ruido"}>
          {data.lags.filter((l) => l.significant).length} de {data.lags.length} lags significativos
          após correção. No lag 1, a sobreposição média é {data.lags[0]?.observedMean.toFixed(3)}{" "}
          dezenas contra {data.lags[0]?.expectedMean.toFixed(3)} esperadas.
        </Verdict>
      </Panel>

      <Panel
        title="O teste das dezenas atrasadas"
        description="Se uma dezena 'atrasada' tivesse mais chance de sair, os intervalos longos entre aparições seriam mais raros do que a geométrica prevê, e o atraso preveria a próxima aparição. Este é o teste que decide a questão — não a tabela de atrasos que todo site publica."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Intervalo médio"
            value={data.gaps.observedMean.toFixed(2)}
            hint={`Geométrica: ${data.gaps.expectedMean.toFixed(2)}`}
          />
          <StatCard
            label="Aderência à geométrica"
            value={`p = ${data.gaps.fit.p.toFixed(4)}`}
            tone={data.gaps.fit.rejects ? "warn" : "good"}
          />
          <StatCard
            label="Correlação atraso × sair"
            value={data.gaps.delayCorrelation.toFixed(5)}
            hint={`p = ${data.gaps.delayP.toFixed(4)}`}
            tone={data.gaps.delayP < 0.05 ? "warn" : "good"}
          />
        </div>

        <div className="mt-5 h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gapData} margin={{ top: 4, right: 8, bottom: 4, left: -8 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip {...tooltipProps} />
              <Bar dataKey="Observado" fill="var(--color-primary)" radius={3} />
              <Bar dataKey="Geométrica" fill="var(--color-chart-2)" radius={3} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <Verdict className="mt-4" kind={verdictFromP(Math.min(data.gaps.fit.p, data.gaps.delayP))}>
          A correlação entre o atraso acumulado de uma dezena e ela sair no concurso seguinte é{" "}
          {data.gaps.delayCorrelation.toFixed(5)} — praticamente zero.
          {data.gaps.delayP < 0.05
            ? " O p é baixo por causa do tamanho da amostra, não da magnitude: um efeito dessa ordem não tem consequência prática."
            : " Atraso não carrega informação sobre o próximo sorteio."}
        </Verdict>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel
          title="Sequências (Wald-Wolfowitz)"
          description="Detecta agrupamento ('saiu três vezes seguidas') e alternância excessiva na série de aparições de cada dezena."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              label="Significativas"
              value={data.runs.significantCount}
              tone={data.runs.significantCount > 0 ? "warn" : "good"}
            />
            <StatCard
              label="Esperado por acaso"
              value={data.runs.expectedByChance.toFixed(1)}
              hint="a 5%, sem correção"
            />
          </div>
          <div className="mt-4 max-h-56 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="py-2 text-left font-medium">Dezena</th>
                  <th className="px-2 py-2 text-right font-medium">Sequências</th>
                  <th className="px-2 py-2 text-right font-medium">z</th>
                  <th className="px-2 py-2 text-right font-medium">q</th>
                </tr>
              </thead>
              <tbody>
                {[...data.runs.results]
                  .sort((a, b) => Math.abs(b.z) - Math.abs(a.z))
                  .slice(0, 12)
                  .map((r) => (
                    <tr key={r.number} className="border-t border-hairline">
                      <td className="py-1.5 font-medium tabular-nums">
                        {String(r.number).padStart(2, "0")}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-xs tabular-nums">
                        {r.runs}
                        <span className="ml-1 text-muted-foreground">
                          ({r.expectedRuns.toFixed(0)})
                        </span>
                      </td>
                      <td
                        className={cn(
                          "px-2 py-1.5 text-right font-mono text-xs tabular-nums",
                          Math.abs(r.z) > 1.96 && "text-warning",
                        )}
                      >
                        {r.z >= 0 ? "+" : ""}
                        {r.z.toFixed(2)}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-xs tabular-nums text-muted-foreground">
                        {r.q.toFixed(3)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          title="Periodicidade oculta (teste g de Fisher)"
          description="Procura ciclos na série de aparições de cada dezena — 'sai a cada 7 concursos'. O p-valor é exato, não assintótico, porque o pico do periodograma é um máximo entre centenas de frequências e sempre parece grande."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              label="Dezenas com ciclo"
              value={data.periodicity.significantCount}
              tone={data.periodicity.significantCount > 0 ? "warn" : "good"}
            />
            <StatCard
              label="Frequências testadas"
              value={Math.floor((data.drawCount - 1) / 2).toLocaleString("pt-BR")}
              hint="por dezena"
            />
          </div>
          <div className="mt-4 max-h-56 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="py-2 text-left font-medium">Dezena</th>
                  <th className="px-2 py-2 text-right font-medium">Período</th>
                  <th className="px-2 py-2 text-right font-medium">g</th>
                  <th className="px-2 py-2 text-right font-medium">q</th>
                </tr>
              </thead>
              <tbody>
                {[...data.periodicity.results]
                  .sort((a, b) => a.p - b.p)
                  .slice(0, 12)
                  .map((r) => (
                    <tr key={r.number} className="border-t border-hairline">
                      <td className="py-1.5 font-medium tabular-nums">
                        {String(r.number).padStart(2, "0")}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-xs tabular-nums">
                        {r.period.toFixed(1)}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-xs tabular-nums">
                        {r.g.toFixed(4)}
                      </td>
                      <td
                        className={cn(
                          "px-2 py-1.5 text-right font-mono text-xs tabular-nums",
                          r.significant ? "text-destructive" : "text-muted-foreground",
                        )}
                      >
                        {r.q.toFixed(3)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <Verdict
            className="mt-4"
            kind={data.periodicity.significantCount > 0 ? "limitrofe" : "ruido"}
          >
            {data.periodicity.significantCount === 0
              ? "Nenhuma dezena apresenta ciclo detectável. Os 'períodos' da tabela são apenas o pico mais alto de um espectro plano."
              : `${data.periodicity.significantCount} dezena(s) com ciclo após correção.`}
          </Verdict>
        </Panel>
      </div>

      <Panel title="Entropia">
        <p className="text-sm text-muted-foreground">
          A distribuição de dezenas carrega {data.entropy.toFixed(4)} bits de entropia, contra o
          máximo teórico de {data.maxEntropy.toFixed(4)} bits de uma fonte perfeitamente uniforme —{" "}
          {((data.entropy / data.maxEntropy) * 100).toFixed(3)}% do ideal. O déficit corresponde às
          flutuações amostrais de {data.drawCount.toLocaleString("pt-BR")} concursos, não a viés.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Para contexto: há{" "}
          <span className="font-mono">
            {Math.round(data.totalCombinations).toLocaleString("pt-BR")}
          </span>{" "}
          combinações possíveis de {game.picks} dezenas entre {game.pool}.
        </p>
      </Panel>
    </div>
  );
}
