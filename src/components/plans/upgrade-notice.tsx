// WP-73 (D-048): uppgraderingsrutan i glas för en låst funktion ("Blixttider
// ingår i Team" + krok + "Se planer"). Ingen "use client" — renderas på
// servern och skickas som färdigt innehåll till skärmarna (`planNotice`).
import { Lock } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { strokeCard } from "@/components/ui/icons";
import { minPlanFor, type Feature } from "@/config/plans";
import { brand } from "@/config/brand";
import { appHref, href } from "@/config/routes";
import { planes } from "@/i18n";

export function UpgradeNotice({
  feature,
  linkHref = appHref("appAjustesPlan"),
  manualBilling = false,
}: {
  feature: Feature;
  /** Standard: Inställningar → Plan. Personal (utan Plan-fliken) → prissidan. */
  linkHref?: string;
  /** WP-80 (D-061): "Facturación manual" — ingen uppgraderingskrok, bara
   * "Contáctanos" (planen styrs av plattformsadmin). */
  manualBilling?: boolean;
}) {
  const plan = planes.nombres[minPlanFor(feature)];
  return (
    <div
      role="note"
      className="flex flex-col gap-3 rounded-tile p-6 glass-light sm:flex-row sm:items-center sm:gap-5"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-on-dark">
        <Lock aria-hidden="true" className="size-5" strokeWidth={strokeCard} />
      </span>
      <div className="flex flex-1 flex-col gap-1">
        <p className="text-16 font-bold text-ink">
          {planes.bloqueo.titulo({ funcion: planes.funciones[feature], plan })}
        </p>
        <p className="text-14 leading-body text-muted">
          {manualBilling
            ? planes.ajustes.administrado({ marca: brand.name })
            : planes.bloqueo.ganchos[feature]}
        </p>
      </div>
      <Button
        asChild
        variant="primary"
        size="md"
        className="self-start sm:self-center"
      >
        {manualBilling ? (
          <Link href={href("contacto")}>{planes.ajustes.contacto}</Link>
        ) : (
          <Link href={linkHref}>{planes.bloqueo.verPlanes}</Link>
        )}
      </Button>
    </div>
  );
}
