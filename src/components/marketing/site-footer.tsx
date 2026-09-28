// Footer delad av alla sidor på sitio-webben (WP-hemsida): logga + beskrivning, tre
// kolumner (Producto, Para quién, Empresa) och "Hecho en Santiago". Samma yta som
// landningens tidigare bespoke footer (`border-t border-line`), nu återanvänd på fler
// sidor. Kolumnen "Empresa" (Términos/Privacidad) utelämnas tills vidare: `sitio.footer`
// har texten men de sidorna finns inte än (utanför WP-hemsidas scope) — se PR-rapporten.
import Link from "next/link";

import { LogoMark } from "@/components/ui/logo-mark";
import { TextLink } from "@/components/ui/text-link";
import { brand } from "@/config/brand";
import { copy } from "@/i18n/marketing";

const INDUSTRIAS = copy.SITIO_PARA_INDUSTRIAS.map((industria) => ({
  id: industria.id,
  nombre: industria.nombre,
  href: `/para/${industria.id}`,
}));

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 sm:px-8 sm:py-12">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="flex max-w-70 items-start gap-2.5">
            <LogoMark label={brand.name} size={40} decorative />
            <div>
              <p className="text-14 font-bold text-ink">{brand.name}</p>
              <p className="mt-1 text-13 text-muted">
                {copy.sitio.footer.descripcion({ nombre: brand.name })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-2">
            <div className="flex flex-col gap-3">
              <span className="text-12 font-bold tracking-caps text-muted uppercase">
                {copy.sitio.footer.columnas.producto}
              </span>
              <TextLink href="/funcionalidades">
                {copy.sitio.footer.links.funcionalidades}
              </TextLink>
              <TextLink href="/precios">
                {copy.sitio.footer.links.precios}
              </TextLink>
              <TextLink href="/preguntas">
                {copy.sitio.footer.links.preguntas}
              </TextLink>
              <TextLink href="/contacto">
                {copy.sitio.footer.links.contacto}
              </TextLink>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-12 font-bold tracking-caps text-muted uppercase">
                {copy.sitio.footer.columnas.paraQuien}
              </span>
              {INDUSTRIAS.map((industria) => (
                <TextLink key={industria.id} href={industria.href}>
                  {industria.nombre}
                </TextLink>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/login"
            className="text-13 font-semibold text-ink underline transition-colors duration-150 ease-out hover:text-pending-fg"
          >
            {copy.sitio.nav.entrar}
          </Link>
          <p className="text-13 text-muted">
            {copy.sitio.footer.hechoEnSantiago}
          </p>
        </div>
      </div>
    </footer>
  );
}
