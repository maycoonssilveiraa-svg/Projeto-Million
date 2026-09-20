import { createFileRoute, Link } from "@tanstack/react-router";

import { Ball } from "../components/lottery/ball";
import { useGame } from "../components/lottery/game-context";
import { Loading, PageHeader, StatCard } from "../components/lottery/shell";
import { Verdict } from "../components/lottery/verdict";
import { useAnalysis } from "../hooks/use-lottery";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "Resultados — Projeto Million" }],
  }),
  component: Index,
});

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function Index() {
  const { gameId, game } = useGame();
  const { set, frequency, patterns, pairs, isLoading, error } = useAnalysis(gameId);

  if (error) {
    return <div className="text-sm text-destructive">Erro ao carregar dados: {String(error)}</div>;
  }
  if (isLoading || !set || !frequency || !patterns || !pairs) return <Loading />;

  const last = set.draws.at(-1);
  const first = set.draws.at(0);
  if (!last || !first) return <Loading label="Sem concursos carregados." />;

  const stats = new Map(frequency.stats.map((s) => [s.number, s]));

  // Total de testes formais rodados na plataforma para este jogo.
  const totalTests = game.pool + 4 + pairs.totalPairs;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`${game.name} · concurso ${last.contest}`}
        title="O resultado, e o que ele não significa"
        subtitle={`${set.draws.length.toLocaleString("pt-BR")} concursos analisados, de ${first.date} a ${last.date}. Cada número desta plataforma vem acompanhado do teste que o valida.`}
      />

      <section className="card-premium relative overflow-hidden p-7">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full opacity-50 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--color-primary) 35%, transparent), transparent 70%)",
          }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Dezenas sorteadas
            </p>
            <p className="mt-1 font-display text-lg leading-none text-muted-foreground">
              {last.date}
            </p>
          </div>
          {last.winners > 0 ? (
            <div className="text-right">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Prêmio principal
              </p>
              <p className="mt-1 font-mono text-2xl font-medium leading-none tracking-tight text-primary">
                {brl(last.prize)}
              </p>
            </div>
          ) : (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Acumulou
            </span>
          )}
        </div>

        <div className="relative mt-6 flex flex-wrap items-center gap-3">
          {last.numbers.map((n) => {
            const s = stats.get(n);
            if (!s) return <Ball key={n} n={n} size="lg" />;
            return (
              <Ball
                key={n}
                n={n}
                size="lg"
                tone={s.significant ? "hot" : "default"}
                title={`Saiu ${s.count}x · z = ${s.z.toFixed(2)} · q = ${s.q.toFixed(3)}`}
              />
            );
          })}
        </div>

        <div className="relative mt-7 grid gap-4 border-t border-hairline pt-6 sm:grid-cols-3">
          <StatCard label="Data" value={last.date} />
          <StatCard
            label={last.winners > 0 ? "Ganhadores" : "Situação"}
            value={last.winners > 0 ? last.winners : "Acumulou"}
            hint={last.winners > 0 ? `${brl(last.prize)} por ganhador` : undefined}
          />
          <StatCard
            label="Soma das dezenas"
            value={last.numbers.reduce((a, b) => a + b, 0)}
            hint={`Faixa central teórica: ${patterns.sums.theoreticalBand.low}–${patterns.sums.theoreticalBand.high}`}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-display text-2xl leading-tight">O que os dados dizem</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card-premium p-6">
            <div className="text-sm font-medium">Distribuição das dezenas</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Qui-quadrado {frequency.uniformity.chi2.toFixed(1)} com {frequency.uniformity.df}{" "}
              graus de liberdade, p = {frequency.uniformity.p.toFixed(4)}.
            </p>
            <Verdict
              className="mt-3"
              kind={
                frequency.uniformity.p < 0.01
                  ? "sinal"
                  : frequency.uniformity.p < 0.05
                    ? "limitrofe"
                    : "ruido"
              }
            >
              {frequency.significantCount === 0
                ? "Nenhuma dezena sobrevive à correção de múltiplas comparações."
                : `${frequency.significantCount} de ${game.pool} dezenas sobrevivem à correção de FDR.`}
            </Verdict>
          </div>

          <div className="card-premium p-6">
            <div className="text-sm font-medium">Padrões estruturais</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Consecutivos, paridade, repetições e soma, cada um contra a sua distribuição exata.
            </p>
            <Verdict className="mt-3" kind={patterns.rejectedCount > 0 ? "limitrofe" : "ruido"}>
              {patterns.rejectedCount} de 4 testes rejeitam a hipótese de sorteio uniforme.
            </Verdict>
          </div>

          <div className="card-premium p-6">
            <div className="text-sm font-medium">Pares de dezenas</div>
            <p className="mt-1 text-sm text-muted-foreground">
              {pairs.totalPairs.toLocaleString("pt-BR")} pares testados. Sem correção, o acaso
              sozinho produziria {Math.round(pairs.falsePositivesExpected)} "achados".
            </p>
            <Verdict
              className="mt-3"
              kind={pairs.significantBeyondMarginals > 0 ? "limitrofe" : "ruido"}
            >
              {pairs.significantBeyondMarginals} pares seguem anômalos depois de descontar a
              frequência individual das dezenas.
            </Verdict>
          </div>

          <div className="card-premium p-6">
            <div className="text-sm font-medium">Vale apostar por análise?</div>
            <p className="mt-1 text-sm text-muted-foreground">
              A resposta não está na frequência, e sim no backtest: estratégias montadas só com o
              passado, conferidas contra o concurso seguinte.
            </p>
            <Link
              to="/backtest"
              className="mt-4 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-raised transition-colors hover:bg-primary/90"
            >
              Ver o teste
            </Link>
          </div>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        {totalTests.toLocaleString("pt-BR")} testes de hipótese são executados nesta página e nas
        seguintes. A{" "}
        <Link to="/metodo" className="underline underline-offset-2">
          página de método
        </Link>{" "}
        explica por que esse número exige correção antes de qualquer conclusão.
      </p>
    </div>
  );
}
