// Los cuatro planes en su estilo "bento" (WP-hemsida, mappad från `.visual-diff/ref/
// sida-v1-bento.html`, sektionen "Precios simples"): Gratis vit, Emprende lavender, Equipo
// mörk med lutad "Más elegido"-bricka, Local peach. Compartido por la landing (/) y /precios
// (sitio-v3) — antes vivía duplicado en cada page.tsx, ahora un solo lugar para el tema de
// color por plan. Precios via `formatPrecioPlan` (`@/config/pricing`), nunca un número a
// mano (`copy.PLANES` ni siquiera trae `precioClp`, ver `src/i18n/marketing.ts`).
import { Check } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { formatPrecioPlan, type PlanId } from "@/config/pricing";
import { copy } from "@/i18n/marketing";

const PLAN_STYLE: Record<
  PlanId,
  {
    tone: "surface" | "dark" | "peach";
    card: string;
    cta: "secondary" | "accent";
  }
> = {
  gratis: { tone: "surface", card: "", cta: "secondary" },
  emprende: { tone: "surface", card: "bg-lavender", cta: "secondary" },
  equipo: { tone: "dark", card: "", cta: "accent" },
  local: { tone: "peach", card: "", cta: "secondary" },
};

export function PlanCards({ ctaHref }: { ctaHref: string }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {copy.PLANES.map((plan) => {
        const style = PLAN_STYLE[plan.id];
        return (
          <Card
            key={plan.id}
            tone={style.tone}
            radius="tile"
            padding="lg"
            className={cn("relative flex flex-col gap-4", style.card)}
          >
            {plan.id === "equipo" ? (
              <span className="absolute -top-3 right-6 rotate-3 rounded-full bg-lime px-3 py-1 text-12 font-bold text-ink">
                {copy.sitio.precios.masElegido}
              </span>
            ) : null}
            <div className="flex flex-col gap-2">
              <h3
                className={cn(
                  "text-18 font-bold",
                  style.tone === "dark" ? "text-on-dark" : "text-ink",
                )}
              >
                {plan.nombre}
              </h3>
              <p
                className={cn(
                  "font-display text-32 font-semibold tracking-display",
                  style.tone === "dark" ? "text-lime" : "text-ink",
                )}
              >
                {formatPrecioPlan(plan.id)}
              </p>
            </div>
            <ul className="flex flex-1 flex-col gap-2">
              {plan.puntos.map((punto) => (
                <li
                  key={punto}
                  className={cn(
                    "flex items-start gap-2 text-14",
                    style.tone === "dark" ? "text-on-dark" : "text-ink",
                  )}
                >
                  <Check
                    aria-hidden="true"
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      style.tone === "dark" ? "text-on-dark-muted" : "text-muted",
                    )}
                    strokeWidth={2.4}
                  />
                  {punto}
                </li>
              ))}
            </ul>
            <Button asChild variant={style.cta} size="lg">
              <Link href={ctaHref}>{plan.cta}</Link>
            </Button>
          </Card>
        );
      })}
    </div>
  );
}
