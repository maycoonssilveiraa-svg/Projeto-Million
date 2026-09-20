import { cn } from "../../lib/utils";

/**
 * Rótulo epistemológico. Toda análise da plataforma carrega um destes, para
 * que "padrão encontrado" nunca seja confundido com "padrão real".
 */
export type VerdictKind = "ruido" | "sinal" | "limitrofe" | "descritivo";

const STYLES: Record<VerdictKind, { label: string; accent: string; text: string }> = {
  ruido: {
    label: "Compatível com o acaso",
    accent: "bg-positive",
    text: "text-positive",
  },
  limitrofe: {
    label: "Limítrofe",
    accent: "bg-warning",
    text: "text-warning",
  },
  sinal: {
    label: "Desvio significativo",
    accent: "bg-destructive",
    text: "text-destructive",
  },
  descritivo: {
    label: "Apenas descritivo",
    accent: "bg-muted-foreground",
    text: "text-muted-foreground",
  },
};

export function Verdict({
  kind,
  children,
  className,
}: {
  kind: VerdictKind;
  children?: React.ReactNode;
  className?: string;
}) {
  const style = STYLES[kind];
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-surface py-4 pl-5 pr-5 text-sm leading-relaxed",
        className,
      )}
    >
      {/* Barra de acento: o veredito é legível antes mesmo de ler o texto. */}
      <span className={cn("absolute inset-y-0 left-0 w-[3px]", style.accent)} />
      <span className={cn("font-semibold", style.text)}>{style.label}.</span>{" "}
      <span className="text-muted-foreground">{children}</span>
    </div>
  );
}

/** Classifica um p-valor no rótulo correspondente. */
export function verdictFromP(p: number): VerdictKind {
  if (p < 0.01) return "sinal";
  if (p < 0.05) return "limitrofe";
  return "ruido";
}
