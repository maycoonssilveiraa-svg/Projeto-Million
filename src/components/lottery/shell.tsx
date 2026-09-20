import { Link, useRouterState } from "@tanstack/react-router";

import { GAMES, type GameId } from "../../lib/lottery";
import { cn } from "../../lib/utils";
import { useGame } from "./game-context";
import { ThemeToggle } from "./theme-toggle";

const NAV = [
  { to: "/", label: "Resultados" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/frequencia", label: "Frequência" },
  { to: "/padroes", label: "Padrões" },
  { to: "/estrutura", label: "Estrutura" },
  { to: "/pares", label: "Pares" },
  { to: "/tendencias", label: "Tendências" },
  { to: "/aleatoriedade", label: "Aleatoriedade" },
  { to: "/heatmap", label: "Heatmap" },
  { to: "/backtest", label: "Backtest" },
  { to: "/poder", label: "Poder" },
  { to: "/simulador", label: "Simulador" },
  { to: "/conferidor", label: "Conferidor" },
  { to: "/historico", label: "Histórico" },
  { to: "/metodo", label: "Método" },
] as const;

export function Shell({ children }: { children: React.ReactNode }) {
  const { pathname } = useRouterState({ select: (s) => s.location });
  const { gameId, setGameId } = useGame();

  return (
    <div className="relative isolate flex min-h-screen flex-col">
      <header className="glass sticky top-0 z-40 border-b border-hairline">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-3.5">
          <Link to="/" className="group flex items-baseline gap-2.5">
            <span className="font-display text-lg leading-none">
              Projeto
              <span className="text-primary"> Million</span>
            </span>
            <span className="hidden text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground sm:inline">
              análise estatística
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex rounded-full border border-border bg-surface p-0.5">
              {(Object.keys(GAMES) as GameId[]).map((id) => (
                <button
                  key={id}
                  onClick={() => setGameId(id)}
                  className={cn(
                    "rounded-full px-3.5 py-1 text-xs font-medium transition-colors",
                    gameId === id
                      ? "bg-primary text-primary-foreground shadow-subtle"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {GAMES[id].name}
                </button>
              ))}
            </div>
            <ThemeToggle />
          </div>
        </div>

        <nav className="mx-auto max-w-7xl px-5">
          <div className="flex gap-0.5 overflow-x-auto pb-px [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {NAV.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "relative whitespace-nowrap px-3 py-2.5 text-[13px] transition-colors",
                    active
                      ? "font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                  {active ? (
                    <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
                  ) : null}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-5 py-10">{children}</main>

      <footer className="relative z-10 border-t border-hairline">
        <div className="mx-auto max-w-7xl px-5 py-8 text-xs leading-relaxed text-muted-foreground">
          <p className="max-w-2xl">
            Dados oficiais da Caixa. Sorteios são eventos independentes: nenhuma análise desta
            plataforma altera a probabilidade de acerto, e a página{" "}
            <Link
              to="/backtest"
              className="text-foreground underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
            >
              Backtest
            </Link>{" "}
            existe justamente para medir isso.
          </p>
        </div>
      </footer>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  children,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-8">
      {eyebrow ? (
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-primary">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="font-display text-[clamp(1.75rem,1.1rem+2vw,2.6rem)] leading-[1.1]">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      ) : null}
      {children}
    </header>
  );
}

export function Panel({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("card-premium p-6", className)}>
      {title ? (
        <div className="mb-4">
          <h2 className="font-display text-xl leading-tight">{title}</h2>
          {description ? (
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string | undefined;
  tone?: "default" | "good" | "warn" | "bad" | undefined;
}) {
  return (
    <div className="card-premium group relative overflow-hidden p-5">
      <span
        className={cn(
          "absolute inset-x-0 top-0 h-px",
          tone === "good" && "bg-positive/60",
          tone === "warn" && "bg-warning/60",
          tone === "bad" && "bg-destructive/60",
          tone === "default" && "bg-primary/40",
        )}
      />
      <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-2 font-mono text-[1.6rem] font-medium leading-none tracking-tight tabular-nums",
          tone === "good" && "text-positive",
          tone === "warn" && "text-warning",
          tone === "bad" && "text-destructive",
        )}
      >
        {value}
      </div>
      {hint ? <div className="mt-2 text-xs leading-snug text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

export function Loading({ label = "Calculando..." }: { label?: string }) {
  return (
    <div className="flex h-72 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
      <span className="size-5 animate-spin rounded-full border-2 border-border border-t-primary" />
      {label}
    </div>
  );
}
