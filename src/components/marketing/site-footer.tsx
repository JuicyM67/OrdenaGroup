// Footer delad av alla sidor på sitio-webben. Ny sidfot (WP-71, SidaP3.dc.html): mörk,
// kolumner (produkt, branscher, företaget, kontakt + konto), en kort "Om"-text,
// Stampello som partnerkort och en trygghetsrad. Kontaktuppgifter kommer från
// `brand.legal`; fält som fortfarande är platshållare ("[…]") renderas inte.
// Sociala ikoner visas inte: `brand.ts` har inga länkar till sociala medier än.
import { Check } from "lucide-react";
import Link from "next/link";

import { BrandLogo } from "@/components/marketing/brand-logo";
import { brand } from "@/config/brand";
import { marketplaceEnabled } from "@/config/marketplace";
import {
  cuentaHref,
  FUNCION_IDS,
  href,
  hrefFuncion,
  hrefLegal,
  hrefMarketplace,
  hrefRubro,
  hrefRubros,
  RUBRO_IDS,
} from "@/config/routes";
import { descubre, paraClientes } from "@/i18n";
import { copy } from "@/i18n/marketing";
import { paginas } from "@/i18n/paginas";

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
            <div className="flex flex-col gap-1.5">
              <b className="text-14 text-on-dark">
                {t.omTitulo({ nombre: brand.name })}
              </b>
              <p className="text-14 leading-relaxed text-on-dark-muted">
                {t.omTexto}
              </p>
            </div>
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
            {FUNCION_IDS.map((id) => (
              <Link key={id} href={hrefFuncion(id)} className={linkClass}>
                {paginas.funciones[id]?.nombre}
              </Link>
            ))}
            <Link href={href("precios")} className={linkClass}>
              {copy.sitio.footer.links.precios}
            </Link>
            <Link href={href("ventajas")} className={linkClass}>
              {copy.sitio.nav.porQue}
            </Link>
            <Link href={`/${brand.demoSlug}`} className={linkClass}>
              {t.ejemplo}
            </Link>
          </Column>

          <Column title={t.rubros}>
            {RUBRO_IDS.map((id) => (
              <Link key={id} href={hrefRubro(id)} className={linkClass}>
                {paginas.rubros[id].nombre}
              </Link>
            ))}
            <Link href={hrefRubros()} className={`${linkClass} font-bold`}>
              {paginas.nav.menuRubros.todas}
            </Link>
          </Column>

          <Column title={t.empresa}>
            {marketplaceEnabled() ? (
              <Link href={hrefMarketplace("descubre")} className={linkClass}>
                {descubre.nav.descubreMenu}
              </Link>
            ) : null}
            <Link href={href("preguntas")} className={linkClass}>
              {copy.sitio.footer.links.preguntas}
            </Link>
            <Link href={href("contacto")} className={linkClass}>
              {copy.sitio.footer.links.contacto}
            </Link>
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
            <b className="mt-3 text-14 text-on-dark">{t.cuenta}</b>
            {marketplaceEnabled() ? (
              <>
                <Link href={href("paraClientes")} className={linkClass}>
                  {paraClientes.nav.label}
                </Link>
                <Link href={cuentaHref("cuentaIngresar")} className={linkClass}>
                  {paraClientes.nav.soyCliente}
                </Link>
                <Link href="/login" className={linkClass}>
                  {paraClientes.nav.tengoNegocio}
                </Link>
              </>
            ) : (
              <Link href="/login" className={linkClass}>
                {copy.sitio.nav.entrar}
              </Link>
            )}
            <Link
              href="/login"
              className="self-start rounded-control bg-lime px-3.5 py-2 text-14 font-bold text-ink transition-opacity duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
            >
              {t.crearCuenta}
            </Link>
          </Column>
        </div>

        <div className="flex flex-col justify-between gap-4 border-t border-dark-2 pt-6 text-13 text-blocked sm:flex-row sm:items-center">
          <span>{t.pie({ anio, nombre: brand.name })}</span>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {copy.home.confianza.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-1.5 text-on-dark-muted"
              >
                <Check
                  className="size-3.5 text-lime"
                  strokeWidth={2.6}
                  aria-hidden="true"
                />
                {c.texto}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
