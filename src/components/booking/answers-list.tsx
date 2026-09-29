// AnswersList — svaren på bokningsfrågorna (WP-40, D-031), samma rubrik och
// "etikett: värde"-rader i agendans bokningsdetalj, Hoy-kortet och
// kundkortet (plan steg 8, `formulario.visualizacion.*`). Ingen egen
// referens (härledd, som datasteget/bekräftelsen i WP-13/16): formen är en
// enkel textlista, samma mönster oavsett ljus/mörk yta (`tone`).
import { cn } from "@/components/ui/cn";
import { formulario } from "@/i18n";

import { formatAnswerValue, type FormattableAnswer } from "./answer-format";

export type DisplayAnswer = FormattableAnswer & {
  readonly questionId: string | null;
  readonly label: string;
};

export function AnswersList({
  answers,
  tone = "light",
  className,
}: {
  answers: readonly DisplayAnswer[];
  /** `dark` = på en mörk yta (Hoy-kortet, `Card tone="dark"`). */
  tone?: "light" | "dark";
  className?: string;
}) {
  if (answers.length === 0) return null;
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div
        className={cn(
          "text-11 font-bold tracking-caps uppercase",
          tone === "dark" ? "text-on-dark-muted" : "text-muted",
        )}
      >
        {formulario.visualizacion.titulo}
      </div>
      <ul className="flex flex-col gap-0.5">
        {answers.map((a, i) => (
          <li
            key={a.questionId ?? i}
            className={cn(
              "text-13",
              tone === "dark" ? "text-on-dark-soft" : "text-ink",
            )}
          >
            {formulario.visualizacion.par({
              etiqueta: a.label,
              valor: formatAnswerValue(a),
            })}
          </li>
        ))}
      </ul>
    </div>
  );
}
