// Recomendación externa (sitio-v6): tarjeta de sellos digital de Stampello (stampello.se),
// una empresa aparte del producto (`copy.sitio.partner.stampello`, ver el comentario en
// `es-CL.marketing.ts`). Se usa completa en `/ventajas` y en una versión más chica en la
// portada, antes de las Preguntas — mismo componente, `compact` solo reduce padding/tamaños
// de texto, nunca cambia el contenido. `target="_blank"` + `rel="noopener"` (regla del
// encargo): enlaza a un sitio fuera de nuestro control.
import { ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { strokeArrow } from "@/components/ui/icons";
import { copy } from "@/i18n/marketing";

const PARTNER = copy.sitio.partner.stampello;

export function PartnerStampello({ compact }: { compact?: boolean }) {
  return (
    <Card
      tone="surface"
      radius="hero"
      padding={compact ? "lg" : "xl"}
      className="flex flex-col items-start gap-5 bg-sky lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex w-fit items-center rounded-full bg-ink px-3 py-1.25 text-12 font-bold tracking-caps text-on-dark uppercase">
            {PARTNER.etiqueta}
          </span>
          <span className="font-display text-18 font-bold tracking-display text-ink">
            Stampello
          </span>
        </div>
        <h2
          className={cn(
            "font-display font-bold tracking-display text-ink",
            compact ? "text-22" : "text-26",
          )}
        >
          {PARTNER.titulo}
        </h2>
        <p className={cn("max-w-xl text-ink", compact ? "text-14" : "text-15")}>
          {PARTNER.texto}
        </p>
      </div>
      <Button asChild variant="primary" size="xl" className="w-fit shrink-0">
        <a href={PARTNER.url} target="_blank" rel="noopener">
          {PARTNER.cta}
          <ArrowUpRight
            aria-hidden="true"
            className="size-4"
            strokeWidth={strokeArrow}
          />
        </a>
      </Button>
    </Card>
  );
}
