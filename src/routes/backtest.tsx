import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ErrorBar,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { axisProps, gridProps, legendProps, tooltipProps } from "../components/lottery/chart-theme";

import { useGame } from "../components/lottery/game-context";
import { Loading, PageHeader, Panel, StatCard } from "../components/lottery/shell";
import { Verdict } from "../components/lottery/verdict";
import { useBacktest } from "../hooks/use-lottery";
import { useHeavyAnalysis } from "../hooks/use-heavy-analysis";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/backtest")({
  head: () => ({ meta: [{ title: "Backtest — Projeto Million" }] }),
  component: Backtest,
});

function Backtest() {
  const { gameId, game } = useGame();
  const report = useBacktest(gameId);
  const hardened = useHeavyAnalysis("hardened", gameId);

  if (!report) return <Loading label="Rodando o backtest em milhares de concursos..." />;

  const chartData = report.results.map((r) => ({
    label: r.label,
    delta: Number(r.deltaVsRandom.toFixed(4)),
    erro: [
      Number((r.deltaVsRandom - r.deltaCi.low).toFixed(4)),
      Number((r.deltaCi.high - r.deltaVsRandom).toFixed(4)),
    ],
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Validação"
        title="Backtest de estratégias"
        subtitle="Este é o único teste que decide a questão. Cada estratégia monta o jogo usando exclusivamente os concursos anteriores e é conferida contra o concurso seguinte — repetidamente, ao longo de todo o histórico."
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Concursos testados" value={report.trials.toLocaleString("pt-BR")} />
        <StatCard
          label="Aquecimento"
          value={report.warmup}
          hint="concursos usados só como histórico"
        />
        <StatCard
          label="Acerto médio teórico"
          value={report.theoreticalMean.toFixed(3)}
          hint={`${game.picks}² / ${game.pool}`}
        />
        <StatCard
          label="Estratégias que superam"
          value={report.results.filter((r) => r.beatsRandom).length}
          tone={report.anyBeatsRandom ? "warn" : "good"}
        />
      </div>

      <Verdict kind={report.anyBeatsRandom ? "sinal" : "ruido"}>
        {report.anyBeatsRandom
          ? "Alguma estratégia superou a aleatória com significância estatística. Antes de acreditar, verifique o número de estratégias testadas: com muitas, uma vencedora é esperada."
          : `Nenhuma estratégia supera a aposta aleatória. Todos os intervalos de confiança de 95% contêm o zero — ou seja, a diferença observada é indistinguível de ruído, em ${report.trials.toLocaleString("pt-BR")} concursos.`}
      </Verdict>

      <section className="card-premium p-6">
        <h2 className="font-display text-xl leading-tight">
          Diferença de acertos contra a aposta aleatória
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Barras de erro são intervalos de confiança de 95%. Uma barra que cruza a linha do zero
          significa: sem efeito detectável.
        </p>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 40, left: -8 }}>
              <CartesianGrid {...gridProps} />
              <XAxis
                dataKey="label"
                {...axisProps}
                angle={-20}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis {...axisProps} />
              <Tooltip {...tooltipProps} formatter={(v: number) => [v.toFixed(4), "Δ acertos"]} />
              <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.5} />
              <Bar dataKey="delta" fill="var(--color-primary)" radius={2}>
                <ErrorBar
                  dataKey="erro"
                  width={4}
                  strokeWidth={1.5}
                  stroke="var(--color-chart-4)"
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="card-premium overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Estratégia</th>
              <th className="px-3 py-2 text-right font-medium">Acertos médios</th>
              <th className="px-3 py-2 text-right font-medium">Δ vs aleatória</th>
              <th className="px-3 py-2 text-right font-medium">IC 95% da diferença</th>
              <th className="px-3 py-2 text-right font-medium">Veredito</th>
            </tr>
          </thead>
          <tbody>
            {report.results.map((r) => (
              <tr key={r.strategy} className="border-t border-hairline">
                <td className="px-4 py-2 font-medium">{r.label}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {r.meanHits.toFixed(4)}
                  <span className="ml-1 text-xs text-muted-foreground">
                    ± {(1.96 * r.se).toFixed(4)}
                  </span>
                </td>
                <td
                  className={cn(
                    "px-3 py-2 text-right tabular-nums",
                    r.beatsRandom && "font-semibold text-chart-2",
                  )}
                >
                  {r.deltaVsRandom >= 0 ? "+" : ""}
                  {r.deltaVsRandom.toFixed(4)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                  [{r.deltaCi.low.toFixed(4)}, {r.deltaCi.high.toFixed(4)}]
                </td>
                <td className="px-3 py-2 text-right text-xs">
                  {r.strategy === "aleatoria" ? (
                    <span className="text-muted-foreground">referência</span>
                  ) : r.beatsRandom ? (
                    <span className="font-medium text-chart-2">supera</span>
                  ) : (
                    <span className="text-muted-foreground">indistinguível</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="card-premium p-6">
        <h2 className="font-display text-xl leading-tight">Faixas premiadas atingidas</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Em {report.trials.toLocaleString("pt-BR")} apostas simuladas por estratégia.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="py-2 text-left font-medium">Estratégia</th>
                {game.tiers.map((t) => (
                  <th key={t} className="px-3 py-2 text-right font-medium">
                    {t} acertos
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.results.map((r) => (
                <tr key={r.strategy} className="border-t border-hairline">
                  <td className="py-1.5">{r.label}</td>
                  {r.tierHits.map((t) => (
                    <td key={t.tier} className="px-3 py-1.5 text-right tabular-nums">
                      {t.count}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Panel
        title="Backtest endurecido"
        description="O teste acima tem três fraquezas: depende de uma única semente aleatória, compara seis estratégias sem corrigir o alfa, e não mostra o que acontece quando a melhor estratégia é ESCOLHIDA olhando os dados. Esta seção corrige as três."
      >
        {hardened.loading || !hardened.data ? (
          <Loading label="Rodando réplicas com sementes independentes..." />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                label="Réplicas"
                value={hardened.data.seeds}
                hint="sementes independentes"
              />
              <StatCard
                label="Sobrevivem à correção"
                value={hardened.data.survivorsAfterCorrection}
                tone={hardened.data.survivorsAfterCorrection > 0 ? "warn" : "good"}
              />
              <StatCard
                label="Vantagem que evaporou"
                value={`${hardened.data.snooping.shrinkagePercent.toFixed(0)}%`}
                hint="da campeã, fora da amostra de seleção"
                tone={hardened.data.snooping.shrinkage > 0 ? "warn" : "default"}
              />
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <tr>
                    <th className="py-2 text-left font-medium">Estratégia</th>
                    <th className="px-3 py-2 text-right font-medium">Δ vs aleatória</th>
                    <th className="px-3 py-2 text-right font-medium">IC 95%</th>
                    <th className="px-3 py-2 text-right font-medium">q (supera?)</th>
                    <th className="px-3 py-2 text-right font-medium">z vs teoria</th>
                    <th className="px-3 py-2 text-right font-medium">Semente</th>
                  </tr>
                </thead>
                <tbody>
                  {hardened.data.stability.map((s) => (
                    <tr key={s.strategy} className="border-t border-hairline">
                      <td className="py-2 font-medium">{s.label}</td>
                      <td
                        className={cn(
                          "px-3 py-2 text-right font-mono text-xs tabular-nums",
                          s.significant && "text-positive",
                        )}
                      >
                        {s.delta >= 0 ? "+" : ""}
                        {s.delta.toFixed(4)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-muted-foreground">
                        [{s.ci.low.toFixed(4)}, {s.ci.high.toFixed(4)}]
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">
                        {s.q.toFixed(3)}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2 text-right font-mono text-xs tabular-nums",
                          Math.abs(s.zVsTheory) > 1.96 && "text-warning",
                        )}
                      >
                        {s.zVsTheory >= 0 ? "+" : ""}
                        {s.zVsTheory.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-muted-foreground">
                        ±{s.sdAcrossSeeds.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              A coluna <strong>Semente</strong> mostra quanto o resultado varia só por trocar o
              desempate aleatório da estratégia — não é erro-padrão do efeito, já que todas as
              réplicas veem os mesmos concursos. O erro-padrão real, entre concursos, está no
              intervalo de confiança.
            </p>

            <h3 className="mt-7 font-display text-lg leading-tight">
              Data snooping: escolher a campeã olhando os dados
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Em cada corte, a melhor estratégia é selecionada usando só a parte esquerda do
              histórico, e depois medida na parte direita, que ela nunca viu. Uma divisão única
              seria ruidosa demais, então o procedimento se repete em{" "}
              {hardened.data.snooping.splits.length} pontos.
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <tr>
                    <th className="py-2 text-left font-medium">Corte</th>
                    <th className="px-3 py-2 text-left font-medium">Campeã selecionada</th>
                    <th className="px-3 py-2 text-right font-medium">Δ onde foi escolhida</th>
                    <th className="px-3 py-2 text-right font-medium">Δ fora da amostra</th>
                  </tr>
                </thead>
                <tbody>
                  {hardened.data.snooping.splits.map((sp) => (
                    <tr key={sp.splitAt} className="border-t border-hairline">
                      <td className="py-2 font-mono text-xs tabular-nums">{sp.splitAt}</td>
                      <td className="px-3 py-2">{sp.winnerLabel}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-positive">
                        {sp.inSampleDelta >= 0 ? "+" : ""}
                        {sp.inSampleDelta.toFixed(4)}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2 text-right font-mono text-xs tabular-nums",
                          sp.outOfSampleDelta < 0 ? "text-destructive" : "text-muted-foreground",
                        )}
                      >
                        {sp.outOfSampleDelta >= 0 ? "+" : ""}
                        {sp.outOfSampleDelta.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border font-medium">
                    <td className="py-2" colSpan={2}>
                      Média
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">
                      {hardened.data.snooping.meanInSample >= 0 ? "+" : ""}
                      {hardened.data.snooping.meanInSample.toFixed(4)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">
                      {hardened.data.snooping.meanOutOfSample >= 0 ? "+" : ""}
                      {hardened.data.snooping.meanOutOfSample.toFixed(4)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <Verdict
              className="mt-4"
              kind={hardened.data.snooping.shrinkage > 0 ? "descritivo" : "ruido"}
            >
              {hardened.data.snooping.shrinkage > 0 ? (
                <>
                  A campeã tinha vantagem média de {hardened.data.snooping.meanInSample.toFixed(4)}{" "}
                  acertos onde foi escolhida, e {hardened.data.snooping.meanOutOfSample.toFixed(4)}{" "}
                  fora dela: {hardened.data.snooping.shrinkagePercent.toFixed(0)}% da vantagem era
                  artefato da própria seleção.
                </>
              ) : (
                <>
                  Neste jogo a campeã não perdeu vantagem fora da amostra — o que também é
                  informativo: com efeitos indistinguíveis de zero, a seleção escolhe ruído, e ruído
                  tanto encolhe quanto cresce.
                </>
              )}
            </Verdict>
          </>
        )}
      </Panel>

      <div className="card-premium p-6 text-sm">
        <h2 className="font-semibold">Como ler este resultado</h2>
        <p className="mt-2 text-muted-foreground">
          As páginas de frequência, padrões e tendências descrevem o passado com precisão. O
          backtest verifica se essa descrição carrega alguma informação sobre o futuro. As duas
          coisas são independentes, e é comum que a primeira seja rica e a segunda, vazia.
        </p>
        <p className="mt-2 text-muted-foreground">
          Um resultado nulo aqui não é falha da análise: é a medida correta de um sorteio honesto.
          Se alguma estratégia superasse a aleatória de forma consistente, isso seria evidência de
          viés no sorteio, não de método de aposta.
        </p>
      </div>
    </div>
  );
}
