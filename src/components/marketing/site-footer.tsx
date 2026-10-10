// Footer delad av alla sidor på sitio-webben. Ny sidfot (WP-71, SidaP3.dc.html): mörk,
// kolumner (produkt, branscher, företaget, kontakt) och Stampello som partnerkort.
// Kontaktuppgifter kommer från `brand.legal`; fält som fortfarande är platshållare
// ("[…]") renderas inte.
import Link from "next/link";

import { BrandLogo } from "@/components/marketing/brand-logo";
import { brand } from "@/config/brand";
import {
  href,
  hrefIndustria,
  hrefLegal,
  type IndustriaId,
} from "@/config/routes";
import { copy } from "@/i18n/marketing";

const t = copy.home.footer;

const linkClass =
  "text-14 text-on-dark-muted transition-colors duration-150 ease-out hover:text-lime focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime";

const real = (v: string): boolean => v.trim() !== "" && !v.startsWith("[");

function Column({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 lg:col-span-2">
      <b className="text-14 text-on-dark">{title}</b>
      {children}
    </div>
  );
}

export function SiteFooter() {
  const anio = new Date().getFullYear();
  const { legal } = brand;
  const partner = copy.sitio.partner.stampello;

  return (
    <footer data-surface="dark" className="bg-night text-on-dark">
      <div className="mx-auto flex max-w-360 flex-col gap-12 px-6 pt-16 pb-10 sm:px-8 lg:px-22 lg:pt-20">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-4">
            <BrandLogo size="sm" />
            <p className="text-15 leading-relaxed text-on-dark-muted">
              {brand.tagline}
            </p>
            <a
              href={partner.url}
              target="_blank"
              rel="noopener"
              className="mt-2 flex flex-col gap-1 rounded-icon px-4 py-3.5 text-14 glass-dark transition-opacity duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
            >
              <span className="text-11 font-bold tracking-label text-lime">
                {t.partnerEtiqueta}
              </span>
              <span>
                <b>Stampello</b> – {t.partnerTexto}
              </span>
            </a>
          </div>

          <Column title={t.producto}>
            <Link href={href("funcionalidades")} className={linkClass}>
              {copy.sitio.footer.links.funcionalidades}
            </Link>
            <Link href={href("precios")} className={linkClass}>
              {copy.sitio.footer.links.precios}
            </Link>
            <Link
              href={href("inicio", "migracion-facil")}
              className={linkClass}
            >
              {t.flytt}
            </Link>
            <Link href={href("horasFlash")} className={linkClass}>
              {t.flash}
            </Link>
            <Link href={`/${brand.demoSlug}`} className={linkClass}>
              {t.ejemplo}
            </Link>
          </Column>

          <Column title={t.rubros}>
            {copy.SITIO_PARA_INDUSTRIAS.map((i) => (
              <Link
                key={i.id}
                href={hrefIndustria(i.id as IndustriaId)}
                className={linkClass}
              >
                {i.nombre}
              </Link>
            ))}
          </Column>

          <Column title={t.empresa}>
            <Link href={hrefLegal("terminos")} className={linkClass}>
              {copy.sitio.footer2.legal.terminos}
            </Link>
            <Link href={hrefLegal("privacidad")} className={linkClass}>
              {copy.sitio.footer2.legal.privacidad}
            </Link>
            <Link href={hrefLegal("encargo")} className={linkClass}>
              {copy.sitio.footer2.legal.encargo}
            </Link>
          </Column>

          <Column title={t.contacto}>
            {real(legal.contactEmail) ? (
              <a
                href={`mailto:${legal.contactEmail}`}
                aria-label={copy.sitio.footer2.contacto.correoAria}
                className={`${linkClass} break-all`}
              >
                {legal.contactEmail}
              </a>
            ) : null}
            {real(legal.taxId) ? (
              <span className="text-14 text-on-dark-muted">{legal.taxId}</span>
            ) : null}
            <span className="text-14 text-on-dark-muted">
              {real(legal.address)
                ? legal.address
                : copy.sitio.footer2.contacto.ciudad}
            </span>
          </Column>
        </div>

        <div className="flex flex-col justify-between gap-2 border-t border-dark-2 pt-6 text-13 text-blocked sm:flex-row">
          <span>{t.pie({ anio, nombre: brand.name })}</span>
          <span>{copy.home.confianza.map((c) => c.texto).join(" · ")}</span>
        </div>
      </div>
    </footer>
  );
}
