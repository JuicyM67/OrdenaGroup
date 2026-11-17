// Carteles para imprimir (WP-95, D-079; editorn WP-96, D-080): bokningsskylten och
// mini-skylten "Crea tu cuenta" efter en sparad design (layout, palett, typsnitt, vikt,
// egna texter, logga). Inga hooks: renderas både i editorns förhandsvisning (klient) och på
// utskriftssidan (server). Alla mått i `cqw` och alla färger/typsnitt via variabler i
// src/styles/carteles.css, så samma layout skalar exakt mellan A3, A4, A5 och A6. QR-koden
// är alltid mörk på vit/ljus panel. Ingen *.dc.html-referens finns.
import { Check } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";
import { brand } from "@/config/brand";
import { carteles, cuenta } from "@/i18n";
import type { CartelBusiness, CartelKind } from "@/lib/share/carteles";
import {
  SIGN_FONTS_SINGLE_WEIGHT,
  type SignDesign,
  type SignFont,
  type SignLayout,
  type SignPalette,
  type SignWeight,
} from "@/lib/share/carteles-design";
import { QR_QUIET_ZONE, qrModules, qrPath } from "@/lib/share/qr";

import { CARTEL_FONT_VARIABLES } from "./fonts";

const t = carteles.hoja;

const PALETTE_CLASS: Record<SignPalette, string> = {
  claro: "cartel-paleta-claro",
  oscuro: "cartel-paleta-oscuro",
  lima: "cartel-paleta-lima",
  nude: "cartel-paleta-nude",
  rosa: "cartel-paleta-rosa",
  salvia: "cartel-paleta-salvia",
  marfil: "cartel-paleta-marfil",
  "negro-oro": "cartel-paleta-negro-oro",
  lavanda: "cartel-paleta-lavanda",
  cielo: "cartel-paleta-cielo",
};

const FONT_CLASS: Record<SignFont, string> = {
  moderna: "cartel-fuente-moderna",
  fina: "cartel-fuente-fina",
  elegante: "cartel-fuente-elegante",
  clasica: "cartel-fuente-clasica",
  manuscrita: "cartel-fuente-manuscrita",
  redonda: "cartel-fuente-redonda",
};

const WEIGHT_CLASS: Record<SignWeight, string> = {
  fino: "cartel-grosor-fino",
  normal: "cartel-grosor-normal",
  marcado: "cartel-grosor-marcado",
};

/** Klasserna för palett, typsnitt och vikt (också för editorns typsnittschips). */
export function cartelThemeClass(design: {
  paleta: SignPalette;
  fuente: SignFont;
  grosor: SignWeight;
}): string {
  const grosor = SIGN_FONTS_SINGLE_WEIGHT.has(design.fuente)
    ? "normal"
    : design.grosor;
  return cn(
    CARTEL_FONT_VARIABLES,
    PALETTE_CLASS[design.paleta],
    FONT_CLASS[design.fuente],
    WEIGHT_CLASS[grosor],
  );
}

export type CartelProps = {
  kind: CartelKind;
  design: SignDesign;
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
    <div className={cn("shrink-0 self-center cartel-panel", className)}>
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

/** Fliken i nedre högra hörnet: varumärket och "Crea tu cuenta hoy". Alltid med. */
export function CartelEsquina() {
  return (
    <p className="absolute right-0 bottom-0 cartel-esquina cartel-invertido font-sans font-semibold">
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

function Logo({
  business,
  large = false,
  onAccent = false,
}: {
  business: CartelBusiness;
  large?: boolean;
  /** På accentbandet (layout foto) får initialerna text- och fondfärgen i stället. */
  onAccent?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-display font-semibold",
        large ? "cartel-logo-lg" : "cartel-logo",
        business.logoUrl
          ? "bg-surface"
          : onAccent
            ? "cartel-invertido"
            : "cartel-acento",
      )}
    >
      {business.logoUrl ? (
        <Image
          src={business.logoUrl}
          alt=""
          fill
          sizes="240px"
          unoptimized
          className="object-cover"
        />
      ) : (
        initials(business.name)
      )}
    </span>
  );
}

type Slots = {
  centered: boolean;
  compact: boolean;
};

function Heading({
  title,
  small,
  centered,
}: {
  title: string;
  small: boolean;
  centered: boolean;
}) {
  return (
    <p
      className={cn(
        small ? "cartel-titulo-sm" : "cartel-titulo",
        "break-words",
        centered && "text-center",
      )}
    >
      {title}
    </p>
  );
}

/** Företagets namn (och logga) överst; i layouten foto ligger de i bandet. */
function BusinessHeader({
  business,
  showLogo,
  centered,
}: {
  business: CartelBusiness;
  showLogo: boolean;
  centered: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 cartel-gap-sm",
        centered ? "flex-col items-center text-center" : "items-center",
      )}
    >
      {showLogo ? <Logo business={business} /> : null}
      <p className="min-w-0 cartel-negocio font-bold break-words">
        {business.name}
      </p>
    </div>
  );
}

function ReservasBody({
  design,
  link,
  displayUrl,
  slots,
}: {
  design: SignDesign;
  link: string;
  displayUrl: string;
  slots: Slots;
}) {
  const { centered, compact } = slots;
  return (
    <div
      className={cn(
        "flex flex-1 flex-col justify-center",
        compact ? "cartel-gap-sm" : "cartel-gap",
      )}
    >
      <div
        className={cn(
          "flex flex-col cartel-gap-sm",
          centered && "items-center text-center",
        )}
      >
        <Heading
          title={design.titulo ?? t.reservasTitulo}
          small={compact}
          centered={centered}
        />
        {centered && !compact ? (
          <span aria-hidden="true" className="cartel-divisor" />
        ) : null}
        <p className="cartel-texto cartel-suave">
          {design.subtitulo ?? t.reservasTexto}
        </p>
      </div>
      <QrCode link={link} className={compact ? "cartel-qr-sm" : "cartel-qr"} />
      <p className="text-center cartel-url">
        <span className="cartel-suave">{t.oEntra} </span>
        <b className="font-bold break-all" translate="no">
          {displayUrl}
        </b>
      </p>
    </div>
  );
}

const BENEFICIOS = [
  cuenta.ingresar.beneficios.gestionar,
  cuenta.ingresar.beneficios.historial,
  cuenta.ingresar.beneficios.favoritos,
  cuenta.ingresar.beneficios.resenas,
] as const;

function CuentaBody({
  design,
  business,
  link,
  slots,
  showEyebrow,
}: {
  design: SignDesign;
  business: CartelBusiness;
  link: string;
  slots: Slots;
  showEyebrow: boolean;
}) {
  const { centered, compact } = slots;
  return (
    <div
      className={cn(
        "flex flex-1 flex-col justify-center",
        compact ? "cartel-gap-sm" : "cartel-gap",
      )}
    >
      <div
        className={cn(
          "flex flex-col cartel-gap-sm",
          centered && "items-center text-center",
        )}
      >
        {showEyebrow ? (
          <p className="cartel-eyebrow font-semibold cartel-suave">
            {t.cuentaEyebrow({ negocio: business.name })}
          </p>
        ) : null}
        <Heading
          title={design.titulo ?? t.cuentaTitulo}
          small
          centered={centered}
        />
      </div>
      <ul
        className={cn(
          "flex flex-col cartel-lista font-semibold",
          centered && "self-center",
        )}
      >
        {BENEFICIOS.map((b) => (
          <li key={b} className="flex items-center cartel-gap-sm">
            <span
              aria-hidden="true"
              className="flex cartel-check shrink-0 items-center justify-center rounded-full cartel-acento"
            >
              <Check className="cartel-check-icono" strokeWidth={3} />
            </span>
            {b}
          </li>
        ))}
      </ul>
      <QrCode
        link={link}
        className={compact ? "cartel-qr-xs" : "cartel-qr-sm"}
      />
      <p className="text-center cartel-texto cartel-suave">
        {design.subtitulo ?? t.cuentaTexto}
      </p>
    </div>
  );
}

function Frame({
  layout,
  band,
  children,
}: {
  layout: SignLayout;
  band: ReactNode;
  children: ReactNode;
}) {
  if (layout === "foto") {
    return (
      <div className="flex h-full flex-col">
        <div className="flex cartel-banda shrink-0 flex-col items-center justify-center cartel-gap-sm cartel-acento cartel-pad-x text-center">
          {band}
        </div>
        <div className="flex min-h-0 flex-1 flex-col cartel-pad cartel-pb-esquina">
          {children}
        </div>
      </div>
    );
  }
  if (layout === "marco") {
    return (
      <>
        <span aria-hidden="true" className="cartel-marco" />
        <div className="flex h-full flex-col cartel-gap cartel-pad-marco">
          {children}
        </div>
      </>
    );
  }
  return (
    <div className="flex h-full flex-col cartel-gap cartel-pad">{children}</div>
  );
}

/** Ett ark (eller en A6-ruta). Fyller sin förälder: pappret eller förhandsvisningens ruta. */
export function Cartel({
  kind,
  design,
  business,
  link,
  displayUrl,
}: CartelProps) {
  const { layout } = design;
  const centered = layout !== "clasico";
  const slots: Slots = { centered, compact: layout === "foto" };
  const showLogo = design.mostrarLogo;

  const band = (
    <>
      {showLogo ? <Logo business={business} large onAccent /> : null}
      <p className="cartel-negocio font-bold break-words">{business.name}</p>
    </>
  );

  return (
    <div className={cn("cartel-hoja h-full w-full", cartelThemeClass(design))}>
      <Frame layout={layout} band={band}>
        {layout !== "foto" && kind === "reservas" ? (
          <BusinessHeader
            business={business}
            showLogo={showLogo}
            centered={centered}
          />
        ) : null}
        {kind === "reservas" ? (
          <ReservasBody
            design={design}
            link={link}
            displayUrl={displayUrl}
            slots={slots}
          />
        ) : (
          <CuentaBody
            design={design}
            business={business}
            link={link}
            slots={slots}
            showEyebrow={layout !== "foto"}
          />
        )}
      </Frame>
      <CartelEsquina />
    </div>
  );
}
