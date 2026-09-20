import { createFileRoute } from "@tanstack/react-router";

import { Ball } from "../components/lottery/ball";
import { useGame } from "../components/lottery/game-context";
import { Loading, PageHeader, StatCard } from "../components/lottery/shell";
import { Verdict } from "../components/lottery/verdict";
import { useAnalysis } from "../hooks/use-lottery";
import type { PairStat } from "../lib/lottery";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/pares")({
  head: () => ({ meta: [{ title: "Pares — Projeto Million" }] }),
  component: Pares,
});

function PairTable({ title, rows }: { title: string; rows: PairStat[] }) {
  return (
    <div className="card-premium overflow-hidden">
      <div className="border-b border-border bg-muted/50 px-4 py-2 text-sm font-medium">
        {title}
      </div>
      <table className="w-full text-sm">
        <thead className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Par</th>
            <th className="px-3 py-2 text-right font-medium">Saiu</th>
            <th className="px-3 py-2 text-right font-medium">Esperado</th>
            <th className="px-3 py-2 text-right font-medium">z</th>
            <th className="px-3 py-2 text-right font-medium">z condicionado</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={`${p.a}-${p.b}`} className="border-t border-hairline">
              <td className="px-4 py-1.5">
                <span className="flex items-center gap-1">
                  <Ball n={p.a} size="sm" tone="muted" />
                  <Ball n={p.b} size="sm" tone="muted" />
                </span>
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums">{p.count}</td>
              <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                {p.expected.toFixed(1)}
              </td>
              <td
                className={cn(
                  "px-3 py-1.5 text-right tabular-nums",
                  Math.abs(p.z) > 1.96 && "text-chart-4",
                )}
              >
                {p.z >= 0 ? "+" : ""}
                {p.z.toFixed(2)}
              </td>
              <td
                className={cn(
                  "px-3 py-1.5 text-right tabular-nums",
                  p.anomalousBeyondMarginals
                    ? "font-semibold text-destructive"
                    : "text-muted-foreground",
                )}
              >
                {p.zCond >= 0 ? "+" : ""}
                {p.zCond.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Pares() {
  const { gameId } = useGame();
  const { pairs, isLoading } = useAnalysis(gameId);

  if (isLoading || !pairs) return <Loading />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Associação"
        title="Co-ocorrência de pares"
        subtitle="O par que mais sai não é uma descoberta: com milhares de pares testados, algum tinha que liderar. Esta página mostra a régua que torna o número interpretável."
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Pares testados" value={pairs.totalPairs.toLocaleString("pt-BR")} />
        <StatCard
          label="Falsos positivos esperados"
          value={Math.round(pairs.falsePositivesExpected)}
          hint="a 5%, sem correção"
          tone="warn"
        />
        <StatCard
          label="Significativos (FDR)"
          value={pairs.significantCount}
          tone={pairs.significantCount > 0 ? "warn" : "good"}
        />
        <StatCard
          label="Sobrevivem às marginais"
          value={pairs.significantBeyondMarginals}
          tone={pairs.significantBeyondMarginals > 0 ? "bad" : "good"}
        />
      </div>

      <Verdict kind={pairs.significantBeyondMarginals > 0 ? "limitrofe" : "ruido"}>
        O maior |z| observado é {pairs.maxAbsZ.toFixed(2)}; em{" "}
        {pairs.totalPairs.toLocaleString("pt-BR")} testes independentes, o máximo esperado por puro
        acaso já seria {pairs.expectedMaxZ.toFixed(2)}.{" "}
        {pairs.significantBeyondMarginals === 0
          ? "Nenhum par indica dependência entre dezenas depois de descontar a frequência individual de cada uma."
          : "Alguns pares seguem anômalos mesmo controlando as frequências individuais — vale investigar antes de concluir qualquer coisa."}
      </Verdict>

      <div className="card-premium p-6 text-sm">
        <h2 className="font-semibold">Por que duas colunas de z</h2>
        <p className="mt-2 text-muted-foreground">
          A coluna <strong>z</strong> compara o par com o esperado sob sorteio perfeito. Se uma das
          duas dezenas saiu muito acima da média, todos os pares que a contêm herdam esse desvio e
          parecem anômalos sem que haja qualquer relação entre as dezenas.
        </p>
        <p className="mt-2 text-muted-foreground">
          A coluna <strong>z condicionado</strong> usa as frequências realmente observadas das duas
          dezenas como referência. Só o que sobra aí é evidência de que as dezenas saem juntas mais
          do que deveriam.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <PairTable title="Pares mais frequentes" rows={pairs.top} />
        <PairTable title="Pares menos frequentes" rows={pairs.bottom} />
      </div>
    </div>
  );
}
