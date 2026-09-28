// /contacto (offentlig, WP-hemsida). Kanaler från `sitio.contacto`. `brand.supportWhatsapp`
// och `brand.domain` är `null` för båda marknaderna i dag (`src/config/brand.ts`) — utan ett
// riktigt nummer/domän visas knapparna som riktiga men inaktiverade `<button disabled>`
// i stället för en påhittad länk. Se PR-rapporten (öppen fråga för ops).
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { brand } from "@/config/brand";
import { copy } from "@/i18n/marketing";

export const metadata: Metadata = {
  title: copy.sitio.contacto.meta.titulo({ nombre: brand.name }),
  description: copy.sitio.contacto.meta.descripcion({ nombre: brand.name }),
};

const whatsappHref = brand.supportWhatsapp
  ? `https://wa.me/${brand.supportWhatsapp.replace(/\D/g, "")}`
  : null;
const emailHref = brand.domain ? `mailto:hola@${brand.domain}` : null;

export default function ContactoPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <SiteHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-8 sm:py-18">
          <h1 className="font-display text-30 font-bold tracking-display text-ink sm:text-40">
            {copy.sitio.contacto.hero.titulo}
          </h1>
          <p className="mt-4 text-16 leading-relaxed text-muted">
            {copy.sitio.contacto.hero.texto}
          </p>
        </section>

        <div className="mx-auto grid max-w-4xl gap-5 px-4 pb-14 sm:grid-cols-2 sm:px-8">
          <Card radius="tile" padding="lg" className="flex flex-col gap-3">
            <h2 className="text-19 leading-snug font-bold text-ink">
              {copy.sitio.contacto.whatsapp.titulo}
            </h2>
            <p className="text-14 text-muted">
              {copy.sitio.contacto.whatsapp.texto}
            </p>
            <Button
              asChild={!!whatsappHref}
              variant="secondary"
              size="lg"
              disabled={!whatsappHref}
              className="w-fit"
            >
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {copy.sitio.contacto.whatsapp.boton}
                </a>
              ) : (
                copy.sitio.contacto.whatsapp.boton
              )}
            </Button>
          </Card>

          <Card radius="tile" padding="lg" className="flex flex-col gap-3">
            <h2 className="text-19 leading-snug font-bold text-ink">
              {copy.sitio.contacto.correo.titulo}
            </h2>
            <p className="text-14 text-muted">
              {copy.sitio.contacto.correo.texto}
            </p>
            <Button
              asChild={!!emailHref}
              variant="secondary"
              size="lg"
              disabled={!emailHref}
              className="w-fit"
            >
              {emailHref ? (
                <a href={emailHref}>{copy.sitio.contacto.correo.boton}</a>
              ) : (
                copy.sitio.contacto.correo.boton
              )}
            </Button>
          </Card>
        </div>

        <div className="mx-auto max-w-4xl px-4 pb-14 sm:px-8">
          <Card
            tone="lilac"
            radius="tile"
            padding="lg"
            className="flex flex-col gap-2"
          >
            <h2 className="text-19 leading-snug font-bold text-ink">
              {copy.sitio.contacto.onboarding.titulo}
            </h2>
            <p className="text-14 text-on-lilac-soft">
              {copy.sitio.contacto.onboarding.texto}
            </p>
          </Card>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
