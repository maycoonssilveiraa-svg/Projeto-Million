/**
 * Estilos compartilhados dos gráficos. Recharts não lê classes do Tailwind nos
 * eixos, então as cores vêm das mesmas variáveis do tema via `var()` — o que
 * mantém claro e escuro coerentes sem duplicar paleta.
 */
export const axisProps = {
  tick: { fontSize: 10, fill: "var(--color-muted-foreground)" },
  tickLine: false,
  axisLine: { stroke: "var(--color-hairline)" },
} as const;

export const gridProps = {
  stroke: "var(--color-hairline)",
  strokeDasharray: "3 3",
  vertical: false,
} as const;

export const tooltipProps = {
  contentStyle: {
    fontSize: 12,
    borderRadius: 12,
    border: "1px solid var(--color-border)",
    background: "var(--color-popover)",
    color: "var(--color-popover-foreground)",
    boxShadow: "var(--elevation-2)",
  },
  labelStyle: { color: "var(--color-muted-foreground)", marginBottom: 2 },
  cursor: { fill: "var(--color-hairline)" },
} as const;

export const legendProps = {
  wrapperStyle: { fontSize: 12, color: "var(--color-muted-foreground)" },
} as const;
