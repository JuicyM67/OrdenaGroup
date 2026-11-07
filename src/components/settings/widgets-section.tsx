"use client";

// Fliken Widgets i Ajustes (WP-82, D-067, portad från BookingBuddy WP-87). Ägaren väljer widget, tema, storlek och
// knapptext, ser en live-förhandsvisning (samma iframe som besökarna får) och kopierar koden.
// Inget sparas: valen finns i sidans tillstånd och i koden. Ingen *.dc.html-referens; formspråket
// är Ajustes vita kort på canvas, med den mörka kodrutan som den viktiga ytan (DESIGN §2).
import { CalendarDays, Copy, Star, type LucideIcon } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { type ReactNode, useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { strokeCard } from "@/components/ui/icons";
import { Pill } from "@/components/ui/pill";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { brand } from "@/config/brand";
import { widgets } from "@/i18n";
import {
  WIDGET_BUTTON_LABELS,
  WIDGET_KINDS,
  WIDGET_SIZES,
  WIDGET_THEMES,
  type WidgetButtonLabel,
  type WidgetKind,
  type WidgetSize,
  type WidgetTheme,
} from "@/lib/validation/widgets";
import { widgetMessageSchema } from "@/lib/widgets/protocol";

import {
  buildWidgetCode,
  DEFAULT_WIDGET_CONFIG,
  widgetEmbedPath,
  widgetUsesLabel,
  widgetUsesSize,
  type WidgetConfig,
} from "./widgets-code";

const t = widgets.panel;

const KIND_ICON: Record<WidgetKind, LucideIcon> = {
  resenas: Star,
  boton: CalendarDays,
  reserva: CalendarDays,
};

/** Startvärden för förhandsvisningens höjd innan iframen rapporterat sin egen. */
const PREVIEW_MIN_HEIGHT: Record<WidgetKind, number> = {
  resenas: 96,
  boton: 96,
  reserva: 640,
};

const THEME_LABEL: Record<WidgetTheme, string> = {
  light: t.tema.claro,
  dark: t.tema.oscuro,
};
const SIZE_LABEL: Record<WidgetSize, string> = {
  small: t.tamano.pequeno,
  medium: t.tamano.mediano,
  large: t.tamano.grande,
};

function GroupLabel({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="text-13 font-bold text-ink">
      {children}
    </p>
  );
}

function KindTile({
  kind,
  selected,
  onSelect,
}: {
  kind: WidgetKind;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = KIND_ICON[kind];
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex min-h-22 items-start gap-3 rounded-tile border-2 bg-canvas p-3 text-left transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none",
        selected ? "border-ink" : "border-transparent",
      )}
    >
      <span
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-avatar bg-surface text-ink"
      >
        <Icon className="size-5" strokeWidth={strokeCard} />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-15 font-bold text-ink">
          {t.tipo[kind].nombre}
        </span>
        <span className="text-13 leading-body text-muted">
          {t.tipo[kind].descripcion}
        </span>
      </span>
    </button>
  );
}

/** Förhandsvisningen: samma /embed-sida som besökarna får, i en iframe på samma ursprung. */
function PreviewFrame({
  slug,
  config,
  onOpenBooking,
}: {
  slug: string;
  config: WidgetConfig;
  onOpenBooking: () => void;
}) {
  const src = widgetEmbedPath(slug, config);
  const [state, setState] = useState<{
    src: string;
    height: number;
    empty: boolean;
  }>({ src, height: PREVIEW_MIN_HEIGHT[config.kind], empty: false });
  // Nytt val = ny iframe: starta om höjd och tomt-läge under renderingen (inte i en effekt).
  if (state.src !== src) {
    setState({ src, height: PREVIEW_MIN_HEIGHT[config.kind], empty: false });
  }

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const frame = document.querySelector<HTMLIFrameElement>(
        "iframe[data-widget-preview]",
      );
      if (!frame || e.source !== frame.contentWindow) return;
      const msg = widgetMessageSchema.safeParse(e.data);
      if (!msg.success) return;
      if (msg.data.type === "resize") {
        const height = msg.data.height;
        setState((s) => ({ ...s, height }));
      } else if (msg.data.type === "empty") {
        setState((s) => ({ ...s, empty: true }));
      } else if (msg.data.type === "open-booking") {
        onOpenBooking();
      }
    }
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, [onOpenBooking]);

  const showEmpty = config.kind === "resenas" && state.empty;
  return (
    <>
      {showEmpty ? (
        <p role="status" className="text-14 leading-body text-ink">
          {t.vistaPrevia.sinResenas}
        </p>
      ) : null}
      <iframe
        key={src}
        data-widget-preview=""
        title={t.vistaPrevia.titulo}
        src={src}
        className={cn("w-full border-0", showEmpty && "hidden")}
        style={{ height: state.height }}
      />
    </>
  );
}

/** Knappförhandsvisningens dialog: samma bokning som loadern öppnar på företagets sida. */
function BookingPreviewDialog({
  slug,
  theme,
  open,
  onOpenChange,
}: {
  slug: string;
  theme: WidgetTheme;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const src = `/embed/${slug}/reserva?dialog=1&theme=${theme}`;
  useEffect(() => {
    if (!open) return;
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const frame = document.querySelector<HTMLIFrameElement>(
        "iframe[data-widget-preview-dialog]",
      );
      if (!frame || e.source !== frame.contentWindow) return;
      const msg = widgetMessageSchema.safeParse(e.data);
      if (msg.success && msg.data.type === "close") onOpenChange(false);
    }
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, [open, onOpenChange]);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-20 flex items-center justify-center bg-ink/45 p-4">
          <Dialog.Content
            aria-modal="true"
            aria-describedby={undefined}
            className="relative flex h-full max-h-200 w-full max-w-130 flex-col overflow-hidden rounded-panel bg-surface shadow-popover"
          >
            <Dialog.Title className="sr-only">
              {widgets.visitante.dialogo.titulo}
            </Dialog.Title>
            <iframe
              data-widget-preview-dialog=""
              title={widgets.visitante.dialogo.titulo}
              src={src}
              className="h-full w-full flex-1 border-0"
            />
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export type WidgetsSectionProps = {
  slug: string;
  /** Appens adress (`siteOrigin()` på servern, `NEXT_PUBLIC_APP_URL`) för `<script src>`. */
  origin: string;
};

export function WidgetsSection({ slug, origin }: WidgetsSectionProps) {
  const [config, setConfig] = useState<WidgetConfig>(DEFAULT_WIDGET_CONFIG);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const ids = {
    kind: useId(),
    theme: useId(),
    size: useId(),
    label: useId(),
  };
  const code = buildWidgetCode(slug, config, origin);
  const copied = copiedCode === code;
  const dark = config.theme === "dark";

  function patch(next: Partial<WidgetConfig>) {
    setConfig((c) => ({ ...c, ...next }));
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setCopyError(false);
    } catch {
      setCopiedCode(null);
      setCopyError(true);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="font-display text-20 font-bold lg:text-22">
          {t.titulo}
        </h2>
        <p className="max-w-160 text-14 leading-body text-muted">{t.intro}</p>
      </div>

      <Card radius="tile" padding="lg" className="flex flex-col gap-5">
        <div className="flex flex-col gap-2.5">
          <GroupLabel id={ids.kind}>{t.tipo.etiqueta}</GroupLabel>
          <div
            role="group"
            aria-labelledby={ids.kind}
            className="grid gap-2.5 md:grid-cols-3"
          >
            {WIDGET_KINDS.map((kind) => (
              <KindTile
                key={kind}
                kind={kind}
                selected={config.kind === kind}
                onSelect={() => {
                  patch({ kind });
                }}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-x-8 gap-y-5">
          <div className="flex flex-col gap-2.5">
            <GroupLabel id={ids.theme}>{t.tema.etiqueta}</GroupLabel>
            <SegmentedControl
              aria-label={t.tema.etiqueta}
              value={config.theme}
              onValueChange={(v) => {
                patch({ theme: v as WidgetTheme });
              }}
              options={WIDGET_THEMES.map((v) => ({
                value: v,
                label: THEME_LABEL[v],
              }))}
              className="bg-canvas"
              itemClassName="w-28"
            />
          </div>
          {widgetUsesSize(config.kind) ? (
            <div className="flex flex-col gap-2.5">
              <GroupLabel id={ids.size}>{t.tamano.etiqueta}</GroupLabel>
              <SegmentedControl
                aria-label={t.tamano.etiqueta}
                value={config.size}
                onValueChange={(v) => {
                  patch({ size: v as WidgetSize });
                }}
                options={WIDGET_SIZES.map((v) => ({
                  value: v,
                  label: SIZE_LABEL[v],
                }))}
                className="bg-canvas"
                itemClassName="w-24"
              />
            </div>
          ) : null}
          {widgetUsesLabel(config.kind) ? (
            <div className="flex flex-col gap-2.5">
              <GroupLabel id={ids.label}>{t.textoBoton.etiqueta}</GroupLabel>
              <div
                role="group"
                aria-labelledby={ids.label}
                className="flex flex-wrap gap-2"
              >
                {WIDGET_BUTTON_LABELS.map((label: WidgetButtonLabel) => (
                  <Pill
                    key={label}
                    selected={config.label === label}
                    onClick={() => {
                      patch({ label });
                    }}
                    className={cn(config.label !== label && "bg-canvas")}
                  >
                    {t.textoBoton.opciones[label]}
                  </Pill>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card
          as="section"
          aria-label={t.vistaPrevia.titulo}
          radius="tile"
          padding="lg"
          className="flex min-w-0 flex-col gap-3"
        >
          <h3 className="text-18 font-bold text-ink">{t.vistaPrevia.titulo}</h3>
          <div
            className={cn(
              "min-w-0 rounded-tile p-5",
              dark ? "bg-dark" : "bg-canvas",
            )}
          >
            <PreviewFrame
              slug={slug}
              config={config}
              onOpenBooking={() => {
                setBookingOpen(true);
              }}
            />
          </div>
          {config.kind === "boton" ? (
            <p className="text-13 leading-body text-muted">
              {t.vistaPrevia.infoBoton}
            </p>
          ) : null}
          <p className="text-13 leading-body text-muted">
            {t.ayuda({ marca: brand.name })}
          </p>
        </Card>
        <BookingPreviewDialog
          slug={slug}
          theme={config.theme}
          open={bookingOpen}
          onOpenChange={setBookingOpen}
        />

        <div className="flex min-w-0 flex-col gap-6">
          <Card
            as="section"
            aria-label={t.codigo.titulo}
            tone="dark"
            radius="tile"
            padding="lg"
            className="flex flex-col gap-3.5"
          >
            <h3 className="text-18 font-bold">{t.codigo.titulo}</h3>
            <div
              role="region"
              aria-label={t.codigo.titulo}
              tabIndex={0}
              className="overflow-x-auto rounded-control bg-night p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
            >
              <pre className="font-mono text-13 leading-relaxed whitespace-pre text-on-dark-soft">
                {code}
              </pre>
            </div>
            <Button
              type="button"
              variant="accent"
              size="xl"
              className="self-start"
              onClick={() => void copy()}
            >
              <Copy
                aria-hidden="true"
                className="size-4.5"
                strokeWidth={strokeCard}
              />
              {copied ? t.codigo.copiado : t.codigo.copiar}
            </Button>
            <p className="sr-only" role="status">
              {copied ? t.codigo.copiado : ""}
            </p>
            {copyError ? (
              <p role="alert" className="text-13 font-semibold text-on-dark">
                {t.codigo.errorCopiar}
              </p>
            ) : null}
          </Card>

          <Card
            as="section"
            aria-label={t.codigo.pasosTitulo}
            radius="tile"
            padding="lg"
            className="flex flex-col gap-3.5"
          >
            <h3 className="text-18 font-bold text-ink">
              {t.codigo.pasosTitulo}
            </h3>
            <ol className="flex flex-col gap-3">
              {[
                t.codigo.pasos.uno,
                t.codigo.pasos.dos,
                t.codigo.pasos.tres,
              ].map((step, i) => (
                <li key={step} className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-canvas font-display text-15 font-bold text-ink"
                  >
                    {i + 1}
                  </span>
                  <span className="text-14 font-medium text-ink">{step}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
