// Carteles para imprimir (WP-95, D-079): bokningsskylten och mini-skylten "Crea tu cuenta".
// Inga hooks: renderas både i förhandsvisningen (Ajustes → QR, klient) och på
// utskriftssidan (server). Alla mått i `cqw` (src/styles/carteles.css), så samma layout
// skalar exakt mellan A3, A4, A5 och A6. Ingen *.dc.html-referens finns; formspråket är
// appens (Bricolage-rubriker, lime-accent, rundade kort) och bara tokens används.
import { Check } from "lucide-react";
import Image from "next/image";

import { cn } from "@/components/ui/cn";
import { brand } from "@/config/brand";
import { carteles, cuenta } from "@/i18n";
import type {
  CartelBusiness,
  CartelKind,
  CartelStyle,
} from "@/lib/share/carteles";
import { QR_QUIET_ZONE, qrModules, qrPath } from "@/lib/share/qr";

const t = carteles.hoja;

type Tone = {
  hoja: string;
  suave: string;
  qr: string;
  logo: string;
  check: string;
  esquina: string;
};

/** QR-koden är alltid mörk på vitt (läses säkrast); stilen styr arket runt den. */
const TONES: Record<CartelStyle, Tone> = {
  claro: {
    hoja: "bg-surface text-ink",
    suave: "text-muted",
    qr: "bg-canvas",
    logo: "bg-lime text-ink",
    check: "bg-lime text-ink",
    esquina: "bg-ink text-on-dark",
  },
  oscuro: {
    hoja: "bg-dark text-on-dark",
    suave: "text-on-dark-soft",
    qr: "bg-surface",
    logo: "bg-lime text-ink",
    check: "bg-lime text-ink",
    esquina: "bg-lime text-ink",
  },
  lima: {
    hoja: "bg-lime text-ink",
    suave: "text-on-lime-soft",
    qr: "bg-surface",
    logo: "bg-ink text-lime",
    check: "bg-ink text-lime",
    esquina: "bg-ink text-on-dark",
  },
};

export type CartelProps = {
  kind: CartelKind;
  /** Stilen (inte `style`: React-attributet är förbjudet här, D-021). */
  estilo: CartelStyle;
  business: CartelBusiness;
  /** Länken i QR-koden (`cartelLink`). */
  link: string;
  /** Bokningsadressen i klartext (`cartelDisplayUrl`), bara bokningsskylten. */
  displayUrl: string;
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => /^[\p{L}\p{N}]/u.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

function QrCode({ link, className }: { link: string; className: string }) {
  const modules = qrModules(link);
  const side = modules.length + 2 * QR_QUIET_ZONE;
  return (
    <div className={cn("shrink-0 self-center", className)}>
      <svg
        role="img"
        aria-label={t.qrAlt}
        viewBox={`0 0 ${side} ${side}`}
        shapeRendering="crispEdges"
        className="block h-auto w-full"
      >
        <rect width={side} height={side} className="fill-surface" />
        <path d={qrPath(modules)} className="fill-ink" />
      </svg>
    </div>
  );
}

/** Fliken i nedre högra hörnet: varumärket och "Crea tu cuenta hoy". */
export function CartelEsquina({ tone }: { tone: string }) {
  return (
    <p
      className={cn(
        "absolute right-0 bottom-0 cartel-esquina font-semibold",
        tone,
      )}
    >
      <b className="font-bold">{brand.name}</b>
      {" · "}
      {t.esquina}
      {brand.domain ? (
        <>
          {" · "}
          <span translate="no">{brand.domain}</span>
        </>
      ) : null}
    </p>
  );
}

function Logo({ business, tone }: { business: CartelBusiness; tone: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative flex cartel-logo shrink-0 items-center justify-center overflow-hidden rounded-full font-display font-semibold",
        business.logoUrl ? "bg-surface" : tone,
      )}
    >
      {business.logoUrl ? (
        <Image
          src={business.logoUrl}
          alt=""
          fill
          sizes="160px"
          unoptimized
          className="object-cover"
        />
      ) : (
        initials(business.name)
      )}
    </span>
  );
}

function CartelReservas({
  tone,
  business,
  link,
  displayUrl,
}: {
  tone: Tone;
  business: CartelBusiness;
  link: string;
  displayUrl: string;
}) {
  return (
    <div className="flex h-full flex-col cartel-gap cartel-pad">
      <div className="flex min-w-0 items-center cartel-gap-sm">
        <Logo business={business} tone={tone.logo} />
        <p className="min-w-0 cartel-negocio font-bold break-words">
          {business.name}
        </p>
      </div>
      <div className="flex flex-1 flex-col justify-center cartel-gap">
        <div className="flex flex-col cartel-gap-sm">
          <p className="font-display cartel-titulo font-semibold">
            {t.reservasTitulo}
          </p>
          <p className={cn("cartel-texto", tone.suave)}>{t.reservasTexto}</p>
        </div>
        <QrCode link={link} className={cn("cartel-qr", tone.qr)} />
        <p className="text-center cartel-url">
          <span className={tone.suave}>{t.oEntra} </span>
          <b className="font-bold break-all" translate="no">
            {displayUrl}
          </b>
        </p>
      </div>
    </div>
  );
}

const BENEFICIOS = [
  cuenta.ingresar.beneficios.gestionar,
  cuenta.ingresar.beneficios.historial,
  cuenta.ingresar.beneficios.favoritos,
  cuenta.ingresar.beneficios.resenas,
] as const;

function CartelCuenta({
  tone,
  business,
  link,
}: {
  tone: Tone;
  business: CartelBusiness;
  link: string;
}) {
  return (
    <div className="flex h-full flex-col justify-center cartel-gap cartel-pad">
      <div className="flex flex-col cartel-gap-sm">
        <p className={cn("cartel-eyebrow font-semibold", tone.suave)}>
          {t.cuentaEyebrow({ negocio: business.name })}
        </p>
        <p className="font-display cartel-titulo-sm font-semibold">
          {t.cuentaTitulo}
        </p>
      </div>
      <ul className="flex flex-col cartel-lista font-semibold">
        {BENEFICIOS.map((b) => (
          <li key={b} className="flex items-center cartel-gap-sm">
            <span
              aria-hidden="true"
              className={cn(
                "flex cartel-check shrink-0 items-center justify-center rounded-full",
                tone.check,
              )}
            >
              <Check className="cartel-check-icono" strokeWidth={3} />
            </span>
            {b}
          </li>
        ))}
      </ul>
      <QrCode link={link} className={cn("cartel-qr-sm", tone.qr)} />
      <p className={cn("text-center cartel-texto", tone.suave)}>
        {t.cuentaTexto}
      </p>
    </div>
  );
}

/** Ett ark (eller en A6-ruta). Fyller sin förälder: pappret eller förhandsvisningens ruta. */
export function Cartel({
  kind,
  estilo,
  business,
  link,
  displayUrl,
}: CartelProps) {
  const tone = TONES[estilo];
  return (
    <div className={cn("cartel-hoja h-full w-full", tone.hoja)}>
      {kind === "reservas" ? (
        <CartelReservas
          tone={tone}
          business={business}
          link={link}
          displayUrl={displayUrl}
        />
      ) : (
        <CartelCuenta tone={tone} business={business} link={link} />
      )}
      <CartelEsquina tone={tone.esquina} />
    </div>
  );
}
