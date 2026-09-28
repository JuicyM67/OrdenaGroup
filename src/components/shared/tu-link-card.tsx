"use client";

// Tarjeta "Tu link de reservas" (`inicio.tuLink`, sin referencia *.dc.html), reutilizada en
// /app/inicio y /app/ajustes (sección "Tu negocio"). Mismo patrón de Clipboard API + wa.me
// que `src/components/onboarding/done-step.tsx` (paso 4 del wizard), pero como componente
// aparte porque acá vive fuera de un flujo de pasos y se repite en dos pantallas.
import { Copy, Share2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { strokeCard } from "@/components/ui/icons";
import { TextLink } from "@/components/ui/text-link";
import { cn } from "@/components/ui/cn";
import { inicio } from "@/i18n";

export type TuLinkCardProps = {
  /** Slug del negocio, sin barra inicial (p. ej. "barberia-norte"). */
  slug: string;
  /** Nombre del negocio, para el mensaje de WhatsApp prellenado. */
  businessName: string;
  className?: string;
};

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000").replace(
    /\/$/,
    "",
  );
}

export function TuLinkCard({ slug, businessName, className }: TuLinkCardProps) {
  const [copied, setCopied] = useState(false);
  const url = `${appUrl()}/${slug}`;
  const mensaje = inicio.tuLink.mensajeWhatsapp({
    negocio: businessName,
    url,
  });

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card
      as="section"
      aria-label={inicio.tuLink.titulo}
      radius="tile"
      padding="lg"
      className={cn("flex flex-col gap-3", className)}
    >
      <h3 className="text-18 font-bold text-ink">{inicio.tuLink.titulo}</h3>
      <p className="truncate text-14 font-semibold text-ink" title={url}>
        {url}
      </p>
      <p className="text-13 text-muted">{inicio.tuLink.ayuda}</p>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => void copyLink()}
        >
          <Copy
            aria-hidden="true"
            className="size-4"
            strokeWidth={strokeCard}
          />
          {copied ? inicio.tuLink.copiado : inicio.tuLink.copiar}
        </Button>

        <Button asChild variant="secondary" size="sm">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`}
            target="_blank"
            rel="noreferrer"
          >
            <Share2
              aria-hidden="true"
              className="size-4"
              strokeWidth={strokeCard}
            />
            {inicio.tuLink.compartirWhatsapp}
          </a>
        </Button>
      </div>

      <TextLink href={`/${slug}`} target="_blank" rel="noreferrer">
        {inicio.tuLink.abrir}
      </TextLink>
    </Card>
  );
}
