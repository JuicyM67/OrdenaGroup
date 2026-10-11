// WP-78 (D-059): banner i appens sidhuvud (bara ägaren, SE) medan
// abonnemanget är `past_due`: "Vi kunde inte dra betalningen. Uppdatera kortet
// före {datum} så behåller du {plan}." + länk till Inställningar → Plan (där
// "Uppdatera kort" öppnar Stripe Customer Portal). Ren visning, ingen state.
import { TriangleAlert } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { suscripcion } from "@/i18n";

export function PlanBillingBanner({
  plan,
  date,
  href,
}: {
  /** Planens namn ("Team"). */
  plan: string;
  /** Grace-slutet, formaterat ("25 oktober"). */
  date: string;
  href: string;
}) {
  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-tile bg-peach-50 px-4 py-3.5 text-14 leading-relaxed text-on-peach-soft sm:flex-row sm:items-center lg:px-5"
    >
      <TriangleAlert
        aria-hidden="true"
        className="hidden size-5.5 shrink-0 text-deposit-fg sm:block"
        strokeWidth={2}
      />
      <p className="flex-1">
        {suscripcion.banner.texto({ fecha: date, plan })}
      </p>
      <Button
        asChild
        variant="primary"
        size="sm"
        className="self-start sm:self-auto"
      >
        <Link href={href} prefetch={false}>
          {suscripcion.banner.cta}
        </Link>
      </Button>
    </div>
  );
}
