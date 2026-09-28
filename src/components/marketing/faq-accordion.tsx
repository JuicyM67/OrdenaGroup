// FAQ-lista delad av landningen, /precios, /preguntas och /para/[industria] (WP-hemsida).
// Samma markup som landningens tidigare inline `<details>`-lista: platt vitt kort
// (`radius="card"`), rader avdelade med `border-t border-line`, pil som roterar 180°
// när frågan är öppen (native <details>/<summary>, ingen JS-tillstånd).
import { ChevronDown } from "lucide-react";

import { Card } from "@/components/ui/card";

export type FaqItem = {
  readonly pregunta: string;
  readonly respuesta: string;
};

export function FaqAccordion({
  items,
  className,
}: {
  items: readonly FaqItem[];
  className?: string;
}) {
  return (
    <Card radius="card" padding="none" className={className}>
      {items.map((item) => (
        <details
          key={item.pregunta}
          className="group border-t border-line px-6 py-5 first:border-t-0"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-16 font-bold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
            {item.pregunta}
            <ChevronDown
              aria-hidden="true"
              className="size-5 shrink-0 text-muted transition-transform duration-150 ease-out group-open:rotate-180"
              strokeWidth={2}
            />
          </summary>
          <p className="mt-3 text-14 text-muted">{item.respuesta}</p>
        </details>
      ))}
    </Card>
  );
}
