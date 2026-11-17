"use client";

// Fliken "QR" i Ajustes (WP-95, D-079; editorn WP-96, D-080): en enkel editor för två
// skyltar, bokningsskylten och mini-skylten "Crea tu cuenta". Man väljer plantilla,
// typsnitt (och grosor), färgpalett, bakgrund (mönster eller egna foton, WP-96b), egna
// texter, logga av/på och storlek; förhandsvisningen
// är samma komponent som utskriften (`Cartel`, mått i cqw). Designen sparas på företaget
// ("Guardar diseño"). "Descargar PDF" sparar först och öppnar sedan utskriftssidan. Bara
// kurerade värden (whitelists), inga fria färger. Ingen *.dc.html-referens; formspråket är
// Ajustes vita kort, som "Comparte tu link".
import { Download, Save } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useId, useState, useTransition, type ReactNode } from "react";

import {
  Cartel,
  CartelPattern,
  cartelThemeClass,
} from "@/components/carteles/cartel";
import { CARTEL_FONT_VARIABLES } from "@/components/carteles/fonts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { strokeCard } from "@/components/ui/icons";
import { Pill } from "@/components/ui/pill";
import { Switch } from "@/components/ui/switch";
import { TextField } from "@/components/ui/text-field";
import { appHref } from "@/config/routes";
import { carteles } from "@/i18n";
import {
  CARTEL_KINDS,
  CARTEL_SIZES_FOR,
  cartelDisplayUrl,
  cartelLink,
  cartelPrintQuery,
  type CartelBusiness,
  type CartelKind,
} from "@/lib/share/carteles";
import {
  SIGN_FONTS,
  SIGN_FONTS_SINGLE_WEIGHT,
  SIGN_LAYOUTS,
  SIGN_PALETTES,
  SIGN_PATTERNS,
  SIGN_SUBTITLE_MAX,
  SIGN_TITLE_MAX,
  SIGN_WEIGHTS,
  defaultSignDesign,
  SIGN_COVER_PHOTO,
  sameSignDesign,
  type SignBackground,
  type SignDesign,
  type SignDesigns,
} from "@/lib/share/carteles-design";

const t = carteles;
const e = carteles.editor;

export type SaveSignDesignResult =
  { ok: true; design: SignDesign } | { ok: false; code: string };

const DEFAULT_TEXT: Record<CartelKind, { titulo: string; subtitulo: string }> =
  {
    reservas: {
      titulo: t.hoja.reservasTitulo,
      subtitulo: t.hoja.reservasTexto,
    },
    cuenta: { titulo: t.hoja.cuentaTitulo, subtitulo: t.hoja.cuentaTexto },
  };

const KIND_TITLE: Record<CartelKind, string> = {
  reservas: t.reservas.titulo,
  cuenta: t.cuenta.titulo,
};

function sameBackground(a: SignBackground, b: SignBackground): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Mönsterruta: nedre vänstra hörnet av en tre gånger större skylt, där bågar och blad
 * syns och toningen är som starkast. */
function BackgroundSwatch({
  design,
  fondo,
}: {
  design: SignDesign;
  fondo: SignBackground;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative block size-12 overflow-hidden rounded-chip",
        cartelThemeClass(design),
      )}
    >
      <span className="absolute bottom-0 left-0 block w-36">
        <span className="cartel-hoja block cartel-aspecto w-full">
          {fondo.tipo === "patron" ? (
            <CartelPattern pattern={fondo.patron} />
          ) : null}
        </span>
      </span>
    </span>
  );
}

const LINK_BUTTON =
  "text-13 font-semibold text-ink underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-40";

function Group({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2.5">
      <span id={id} className="text-13 font-semibold text-muted">
        {label}
      </span>
      <div role="group" aria-labelledby={id} className="flex flex-wrap gap-2">
        {children}
      </div>
    </div>
  );
}

/** Ett val som ser ut som en ruta (plantilla, typsnitt, färg). */
function Choice({
  selected,
  label,
  onClick,
  className,
  children,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "transition-shadow duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        selected ? "ring-2 ring-ink" : "ring-1 ring-border hover:ring-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}

function TextInput({
  label,
  value,
  placeholder,
  max,
  onChange,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  max: number;
  onChange: (v: string | null) => void;
}) {
  const n = Array.from(value ?? "").length;
  return (
    <div className="flex flex-col gap-1.5">
      <TextField
        label={label}
        value={value ?? ""}
        placeholder={placeholder}
        maxLength={max}
        hint={e.contador({ n, max })}
        onChange={(ev) => {
          const v = ev.target.value;
          onChange(v.length === 0 ? null : v);
        }}
      />
      {value !== null ? (
        <button
          type="button"
          onClick={() => {
            onChange(null);
          }}
          className={cn("self-start", LINK_BUTTON)}
        >
          {e.usarSugerido}
        </button>
      ) : null}
    </div>
  );
}

export type CartelesSectionProps = {
  slug: string;
  business: CartelBusiness;
  /** `siteOrigin()` (NEXT_PUBLIC_APP_URL): QR-kodernas adress. */
  origin: string;
  /** Sparade designer (tolerant lästa). */
  designs: SignDesigns;
  onSave: (
    kind: CartelKind,
    design: SignDesign,
  ) => Promise<SaveSignDesignResult>;
};

export function CartelesSection({
  slug,
  business,
  origin,
  designs: initial,
  onSave,
}: CartelesSectionProps) {
  const [kind, setKind] = useState<CartelKind>("reservas");
  const [saved, setSaved] = useState<SignDesigns>(initial);
  const [draft, setDraft] = useState<SignDesigns>(initial);
  const [status, setStatus] = useState<"idle" | "saved" | "error" | "denied">(
    "idle",
  );
  const [pending, startTransition] = useTransition();
  const kindsId = useId();

  const design = draft[kind];
  const dirty = !sameSignDesign(design, saved[kind]);
  const link = cartelLink(kind, origin, slug);
  const displayUrl = cartelDisplayUrl(origin, slug);
  const printHref = `${appHref("appAjustesQrImprimir")}?${cartelPrintQuery(kind)}`;

  function update(patch: Partial<SignDesign>) {
    setDraft((d) => ({ ...d, [kind]: { ...d[kind], ...patch } }));
    setStatus("idle");
  }

  async function save(): Promise<boolean> {
    const r = await onSave(kind, design);
    if (r.ok) {
      setSaved((s) => ({ ...s, [kind]: r.design }));
      setDraft((d) => ({ ...d, [kind]: r.design }));
      setStatus("saved");
      return true;
    }
    setStatus(
      r.code === "forbidden" || r.code === "unauthorized" ? "denied" : "error",
    );
    return false;
  }

  function onSaveClick() {
    startTransition(async () => {
      await save();
    });
  }

  function onDownload() {
    if (!dirty) {
      window.open(printHref, "_blank", "noopener");
      return;
    }
    // Fönstret öppnas direkt vid klicket (annars stoppar popup-blockeraren det) och får
    // adressen när designen sparats.
    const win = window.open("", "_blank");
    startTransition(async () => {
      const ok = await save();
      if (ok && win) win.location.href = printHref;
      else win?.close();
    });
  }

  const statusText =
    status === "saved"
      ? e.guardado
      : status === "error"
        ? e.error
        : status === "denied"
          ? e.sinPermiso
          : dirty
            ? e.sinGuardar
            : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="font-display text-20 font-bold lg:text-22">
          {t.titulo}
        </h2>
        <p className="max-w-160 text-14 leading-body text-muted">{t.intro}</p>
      </div>

      <div
        role="group"
        aria-labelledby={kindsId}
        className="flex flex-wrap gap-2"
      >
        <span id={kindsId} className="sr-only">
          {e.carteles}
        </span>
        {CARTEL_KINDS.map((k) => (
          <Pill
            key={k}
            selected={kind === k}
            onClick={() => {
              setKind(k);
              setStatus("idle");
            }}
            className={cn(kind !== k && "bg-surface")}
          >
            {KIND_TITLE[k]}
          </Pill>
        ))}
      </div>

      <Card
        as="section"
        aria-label={KIND_TITLE[kind]}
        radius="tile"
        padding="lg"
        className="flex flex-wrap items-start gap-8"
      >
        <div className="flex w-full max-w-80 shrink-0 flex-col gap-3 lg:sticky lg:top-6">
          <div
            aria-label={t.vistaPrevia}
            role="figure"
            className="cartel-aspecto w-full overflow-hidden rounded-control shadow-soft"
          >
            <Cartel
              kind={kind}
              design={design}
              business={business}
              link={link}
              displayUrl={displayUrl}
            />
          </div>
          <p className="text-13 leading-body text-muted">
            {kind === "reservas" ? t.reservas.ayuda : t.cuenta.ayuda}
          </p>
        </div>

        <div className="flex min-w-0 flex-1 basis-72 flex-col gap-6">
          <Group label={e.plantilla}>
            {SIGN_LAYOUTS.map((layout) => (
              <Choice
                key={layout}
                selected={design.layout === layout}
                label={t.plantillas[layout]}
                onClick={() => {
                  update({ layout });
                }}
                className="flex w-20 flex-col items-center gap-1.5 rounded-control bg-surface p-1.5"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none cartel-aspecto w-full overflow-hidden"
                >
                  <Cartel
                    kind={kind}
                    design={{ ...design, layout }}
                    business={business}
                    link={link}
                    displayUrl={displayUrl}
                  />
                </span>
                <span className="text-12 font-semibold text-ink">
                  {t.plantillas[layout]}
                </span>
              </Choice>
            ))}
          </Group>

          <Group label={e.tipografia}>
            {SIGN_FONTS.map((fuente) => (
              <Choice
                key={fuente}
                selected={design.fuente === fuente}
                label={t.fuentes[fuente]}
                onClick={() => {
                  update({ fuente });
                }}
                className={cn(
                  "flex min-w-24 flex-col items-start gap-1 rounded-control bg-surface px-3.5 py-2.5 text-ink",
                  CARTEL_FONT_VARIABLES,
                  cartelThemeClass({ ...design, fuente }),
                )}
              >
                <span className="cartel-muestra-fuente text-26 leading-none">
                  {e.muestra}
                </span>
                <span className="font-sans text-12 font-semibold">
                  {t.fuentes[fuente]}
                </span>
              </Choice>
            ))}
          </Group>

          {SIGN_FONTS_SINGLE_WEIGHT.has(design.fuente) ? null : (
            <Group label={e.grosor}>
              {SIGN_WEIGHTS.map((grosor) => (
                <Pill
                  key={grosor}
                  selected={design.grosor === grosor}
                  onClick={() => {
                    update({ grosor });
                  }}
                  className={cn(design.grosor !== grosor && "bg-canvas")}
                >
                  {t.grosores[grosor]}
                </Pill>
              ))}
            </Group>
          )}

          <Group label={e.colores}>
            {SIGN_PALETTES.map((paleta) => (
              <Choice
                key={paleta}
                selected={design.paleta === paleta}
                label={t.paletas[paleta]}
                onClick={() => {
                  update({ paleta });
                }}
                className="rounded-full p-1"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "block size-9 rounded-full cartel-muestra-color",
                    cartelThemeClass({ ...design, paleta }),
                  )}
                />
              </Choice>
            ))}
          </Group>

          <Group label={e.fondo}>
            {[
              { fondo: { tipo: "liso" } as SignBackground, label: e.fondoLiso },
              ...SIGN_PATTERNS.map((patron) => ({
                fondo: { tipo: "patron", patron } as SignBackground,
                label: t.patrones[patron],
              })),
            ].map(({ fondo, label }) => (
              <Choice
                key={label}
                selected={sameBackground(design.fondo, fondo)}
                label={label}
                onClick={() => {
                  update({ fondo });
                }}
                className="flex w-18 flex-col items-center gap-1.5 rounded-control bg-surface p-1.5"
              >
                <BackgroundSwatch design={design} fondo={fondo} />
                <span className="text-12 font-semibold text-ink">{label}</span>
              </Choice>
            ))}
          </Group>

          <div className="flex flex-col gap-2.5">
            {business.fotos.length > 0 ? (
              <>
                <Group label={e.fondoFotos}>
                  {business.fotos.map((foto, i) => {
                    const fondo: SignBackground = {
                      tipo: "foto",
                      foto: foto.id,
                    };
                    const label =
                      foto.id === SIGN_COVER_PHOTO
                        ? e.fotoPortada
                        : e.fotoGaleria({
                            n:
                              business.fotos[0]?.id === SIGN_COVER_PHOTO
                                ? i
                                : i + 1,
                          });
                    return (
                      <Choice
                        key={foto.id}
                        selected={sameBackground(design.fondo, fondo)}
                        label={label}
                        onClick={() => {
                          update({ fondo });
                        }}
                        className="rounded-control p-1"
                      >
                        <span className="relative block size-12 overflow-hidden rounded-chip">
                          <Image
                            src={foto.url}
                            alt=""
                            fill
                            sizes="48px"
                            unoptimized
                            className="object-cover"
                          />
                        </span>
                      </Choice>
                    );
                  })}
                </Group>
                {design.fondo.tipo === "foto" ? (
                  <p className="text-13 leading-body text-muted">
                    {e.ayudaFoto}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-13 leading-body text-muted">
                {e.sinFotos}{" "}
                <Link
                  href={appHref("appAjustesPerfil")}
                  className={LINK_BUTTON}
                >
                  {e.irAPerfil}
                </Link>
              </p>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <span className="text-13 font-semibold text-muted">{e.textos}</span>
            <TextInput
              label={e.titulo}
              value={design.titulo}
              placeholder={DEFAULT_TEXT[kind].titulo}
              max={SIGN_TITLE_MAX}
              onChange={(titulo) => {
                update({ titulo });
              }}
            />
            <TextInput
              label={e.subtitulo}
              value={design.subtitulo}
              placeholder={DEFAULT_TEXT[kind].subtitulo}
              max={SIGN_SUBTITLE_MAX}
              onChange={(subtitulo) => {
                update({ subtitulo });
              }}
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={design.mostrarLogo}
              label={e.mostrarLogo}
              onChange={(mostrarLogo) => {
                update({ mostrarLogo });
              }}
            />
            <span aria-hidden="true" className="text-14 font-semibold text-ink">
              {e.mostrarLogo}
            </span>
          </div>

          <Group label={t.opciones.tamano}>
            {CARTEL_SIZES_FOR[kind].map((tamano) => (
              <Pill
                key={tamano}
                selected={design.tamano === tamano}
                onClick={() => {
                  update({ tamano });
                }}
                className={cn(design.tamano !== tamano && "bg-canvas")}
              >
                {t.tamanos[tamano]}
              </Pill>
            ))}
          </Group>

          <div className="flex flex-col gap-3 border-t border-line pt-5">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={onDownload}
                disabled={pending}
              >
                <Download
                  aria-hidden="true"
                  className="size-4"
                  strokeWidth={strokeCard}
                />
                {t.descargar}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={onSaveClick}
                disabled={pending || !dirty}
              >
                <Save
                  aria-hidden="true"
                  className="size-4"
                  strokeWidth={strokeCard}
                />
                {pending ? e.guardando : e.guardar}
              </Button>
            </div>
            <p role="status" className="min-h-5 text-13 text-muted">
              {statusText}
            </p>
            <p className="text-13 leading-body text-muted">{t.ayudaPdf}</p>
            <button
              type="button"
              onClick={() => {
                update(defaultSignDesign(kind));
              }}
              disabled={pending}
              className={cn("self-start", LINK_BUTTON)}
            >
              {e.restablecer}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
