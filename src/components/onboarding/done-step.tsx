"use client";

// Paso 4 de 4: Tu link. Pantalla final — el negocio ya existe en la base de datos cuando
// esto se muestra (`onboarding-wizard.tsx` llama al server action antes de renderizar este
// paso). "Copiar link" usa la Clipboard API (requiere https o localhost, ambos cubiertos).
import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { onboarding } from "@/i18n";

export type DoneStepProps = {
  slug: string;
  businessName: string;
  hasServices: boolean;
};

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000").replace(
    /\/$/,
    "",
  );
}

export function DoneStep({ slug, businessName, hasServices }: DoneStepProps) {
  const [copiado, setCopiado] = useState(false);
  const url = `${appUrl()}/${slug}`;
  const mensaje = onboarding.listo.mensajeCompartir({
    negocio: businessName,
    url,
  });

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <p className="text-13 font-semibold text-muted">
          {onboarding.paso({ n: 4, total: 4 })}
        </p>
        <h1 className="text-22 font-bold tracking-title text-ink">
          {onboarding.listo.titulo}
        </h1>
        <p className="text-15 font-semibold text-ink">{url}</p>
      </div>

      {!hasServices ? (
        <p className="text-13 text-ink">{onboarding.avisoSinServicios}</p>
      ) : null}

      <Button type="button" variant="secondary" size="xl" onClick={copyLink}>
        {copiado ? onboarding.listo.copiado : onboarding.listo.ctaCopiar}
      </Button>

      <Button asChild variant="secondary" size="xl">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`}
          target="_blank"
          rel="noreferrer"
        >
          {onboarding.listo.ctaCompartirWhatsapp}
        </a>
      </Button>

      <Button asChild variant="secondary" size="xl">
        <a href={`/${slug}`} target="_blank" rel="noreferrer">
          {onboarding.listo.ctaVerPagina}
        </a>
      </Button>

      <Button asChild size="xl">
        <Link href="/app/agenda">{onboarding.listo.ctaIrAgenda}</Link>
      </Button>
    </div>
  );
}
