import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { axisProps, gridProps, tooltipProps } from "../components/lottery/chart-theme";
import { useGame } from "../components/lottery/game-context";
import { Loading, PageHeader, Panel, StatCard } from "../components/lottery/shell";
import { Verdict } from "../components/lottery/verdict";
import { useHeavyAnalysis } from "../hooks/use-heavy-analysis";

export const Route = createFileRoute("/poder")({
  head: () => ({ meta: [{ title: "Poder — Projeto Million" }] }),
  component: Poder,
});

function Poder() {
  const { gameId, game } = useGame();
  const { data, loading, error } = useHeavyAnalysis("power", gameId);

  if (error) return <div className="text-sm text-destructive">Erro: {error}</div>;
  if (loading || !data) return <Loading label="Calculando o poder dos testes..." />;

  const scenarioData = data.scenarios.map((s) => ({
    label: s.label,
    Concursos: s.draws,
    anos: s.years,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Poder estatístico"
        title="O que estes testes conseguiriam detectar"
        subtitle="Todo resultado nulo da plataforma depende desta página. 'Não encontramos viés' só é informativo se o teste encontraria o viés caso ele existisse — do contrário, é indistinguível de um teste cego."
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Concursos disponíveis" value={data.drawCount.toLocaleString("pt-BR")} />
        <StatCard
          label="Menor viés detectável"
          value={`${data.mde.relativePercent.toFixed(1)}%`}
          hint="por dezena, alfa corrigido, poder 80%"
          tone="warn"
        />
        <StatCard
          label="Sem correção"
          value={`${data.mdeUncorrected.relativePercent.toFixed(1)}%`}
          hint="o preço de testar todas as dezenas"
        />
        <StatCard
          label="Teste global detecta"
          value={`${data.global.singleNumberBiasPercent.toFixed(0)}%`}
          hint="viés de uma dezena isolada"
        />
      </div>

      <Verdict kind="descritivo">
        Com {data.drawCount.toLocaleString("pt-BR")} concursos, uma dezena precisaria sair pelo
        menos {(data.mde.detectableRate * 100).toFixed(2)}% das vezes — contra{" "}
        {(data.mde.baseRate * 100).toFixed(2)}% do esperado — para ser detectada com 80% de
        probabilidade. Em números absolutos: {data.mde.extraAppearances.toFixed(0)} aparições a mais
        que as demais. Vieses menores que isso existem sem que esta plataforma consiga vê-los.
      </Verdict>

      <Panel
        title="Quanto histórico cada viés exigiria"
        description="Concursos necessários para detectar vieses de diferentes magnitudes, com 80% de poder e alfa corrigido pelo número de dezenas."
      >
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={scenarioData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis {...axisProps} scale="log" domain={["auto", "auto"]} />
              <Tooltip
                {...tooltipProps}
                formatter={(v: number) => [v.toLocaleString("pt-BR"), "concursos"]}
              />
              <Bar dataKey="Concursos" fill="var(--color-primary)" radius={3} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="py-2 text-left font-medium">Viés a detectar</th>
                <th className="px-3 py-2 text-right font-medium">Concursos</th>
                <th className="px-3 py-2 text-right font-medium">Tempo</th>
                <th className="px-3 py-2 text-right font-medium">Situação</th>
              </tr>
            </thead>
            <tbody>
              {data.scenarios.map((s) => (
                <tr key={s.label} className="border-t border-hairline">
                  <td className="py-2 font-medium">{s.label}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">
                    {s.draws.toLocaleString("pt-BR")}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-muted-foreground">
                    {s.years < 1
                      ? `${(s.years * 12).toFixed(0)} meses`
                      : `${Math.round(s.years).toLocaleString("pt-BR")} anos`}
                  </td>
                  <td className="px-3 py-2 text-right text-xs">
                    {s.draws <= data.drawCount ? (
                      <span className="text-positive">ao alcance</span>
                    ) : (
                      <span className="text-muted-foreground">
                        faltam {(s.draws - data.drawCount).toLocaleString("pt-BR")}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Considerando {data.drawCount.toLocaleString("pt-BR")} concursos acumulados e{" "}
          {data.drawsPerYear} sorteios por ano.
        </p>
      </Panel>

      <Panel title="Como isto muda a leitura das outras páginas">
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            A página de{" "}
            <Link
              to="/frequencia"
              className="text-foreground underline decoration-primary/40 underline-offset-4"
            >
              frequência
            </Link>{" "}
            não encontra dezenas viciadas. Com este poder, a conclusão correta não é "o sorteio é
            perfeito", e sim: "não há viés maior que {data.mde.relativePercent.toFixed(1)}%".
          </p>
          <p>
            O{" "}
            <Link
              to="/backtest"
              className="text-foreground underline decoration-primary/40 underline-offset-4"
            >
              backtest
            </Link>{" "}
            não encontra estratégia vencedora. Isso descarta vantagens grandes, não vantagens de
            fração de ponto percentual — que, de todo modo, seriam irrelevantes diante das chances
            do jogo.
          </p>
          <p>
            Um viés de {data.global.singleNumberBiasPercent.toFixed(0)}% numa única dezena seria
            grosseiro — visível a olho nu numa urna física. Os vieses plausíveis num sorteio
            mecânico auditado são muito menores, e por isso a ausência de detecção era o resultado
            esperado desde o início.
          </p>
        </div>
      </Panel>
    </div>
  );
}
