// Påminnelse på Start i appen (WP-85, D-070): "Ditt företag syns inte i Descubre än.
// Det saknas en logga och en adress." + länk till det som saknas. Visas bara när
// företaget vill synas (`marketplace_listed`) men profilen inte är komplett. Ren
// visning, samma form som `PlanBillingBanner`.
import { Sprout } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { descubreAjustes } from "@/i18n";

import type { DescubreSettings } from "./types";

const t = descubreAjustes.recordatorio;

function joinList(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${t.y} ${items[items.length - 1]}`;
}

export function DescubreReminder({
  missing,
  href,
}: {
  missing: DescubreSettings["missing"];
  href: string;
}) {
  if (missing.length === 0) return null;
  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-tile bg-lavender px-4 py-3.5 text-14 leading-relaxed text-ink sm:flex-row sm:items-center lg:px-5"
    >
      <Sprout
        aria-hidden="true"
        className="hidden size-5.5 shrink-0 sm:block"
        strokeWidth={2}
      />
      <p className="flex-1">
        {t.texto({ faltan: joinList(missing.map((m) => t.faltan[m])) })}
      </p>
      <Button
        asChild
        variant="primary"
        size="sm"
        className="self-start sm:self-auto"
      >
        <Link href={href} prefetch={false}>
          {t.cta}
        </Link>
      </Button>
    </div>
  );
}
