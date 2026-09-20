import { cn } from "../../lib/utils";

type Tone = "default" | "hot" | "cold" | "hit" | "miss" | "muted";

const TONES: Record<Tone, string> = {
  default:
    "bg-gradient-to-b from-primary to-[color-mix(in_oklab,var(--color-primary)_78%,black)] text-primary-foreground shadow-subtle",
  hot: "bg-gradient-to-b from-destructive to-[color-mix(in_oklab,var(--color-destructive)_76%,black)] text-white shadow-subtle",
  cold: "bg-gradient-to-b from-chart-2 to-[color-mix(in_oklab,var(--color-chart-2)_76%,black)] text-white shadow-subtle",
  hit: "bg-gradient-to-b from-positive to-[color-mix(in_oklab,var(--color-positive)_76%,black)] text-white shadow-raised ring-2 ring-positive/25",
  miss: "bg-surface-muted text-muted-foreground",
  muted: "bg-surface-muted text-muted-foreground",
};

export function Ball({
  n,
  tone = "default",
  size = "md",
  title,
}: {
  n: number;
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        // O brilho interno superior é o que dá volume à ficha sem usar imagem.
        "relative inline-grid shrink-0 place-items-center rounded-full font-semibold tabular-nums",
        "before:absolute before:inset-x-[18%] before:top-[8%] before:h-[30%] before:rounded-full before:bg-white/20 before:content-['']",
        TONES[tone],
        size === "sm" && "size-8 text-[11px]",
        size === "md" && "size-11 text-sm",
        size === "lg" && "size-16 text-lg",
      )}
    >
      {String(n).padStart(2, "0")}
    </span>
  );
}
