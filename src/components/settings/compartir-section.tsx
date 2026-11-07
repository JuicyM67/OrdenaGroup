"use client";

// Fliken "Comparte tu link" i Ajustes (WP-89, D-075): bokningslänken, en QR-kod att ladda ner
// som PNG och korta guider per kanal (Instagram, Google, WhatsApp Business, Facebook, TikTok),
// var och en med sin egen länk (`?utm_source=<kanal>`). Inget laddas från databasen och inget
// sparas. Ingen *.dc.html-referens; formspråket är Ajustes vita kort på canvas, samma
// numrerade steg som fliken Widgets.
import { Copy, Download, ExternalLink } from "lucide-react";
import { type ReactNode, useId, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { strokeCard } from "@/components/ui/icons";
import { Pill } from "@/components/ui/pill";
import { brand } from "@/config/brand";
import { compartir, inicio } from "@/i18n";
import {
  QR_SOURCE,
  SHARE_CHANNELS,
  shareLink,
  type ShareChannel,
} from "@/lib/share/channels";
import { QR_QUIET_ZONE, qrModules, qrPath } from "@/lib/share/qr";

const t = compartir;

/** PNG:ens minsta sida i pixlar (tydlig även utskriven i A5). */
const PNG_MIN_PX = 1024;

/** Kopiering med ett "Copiado"-läge per nyckel och ett gemensamt felmeddelande. */
function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState(false);
  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setError(false);
    } catch {
      setCopied(null);
      setError(true);
    }
  }
  return { copied, error, copy };
}

function CopyButton({
  copied,
  label,
  copiedLabel,
  onClick,
}: {
  copied: boolean;
  label: string;
  copiedLabel: string;
  onClick: () => void;
}) {
  return (
    <Button type="button" variant="secondary" size="sm" onClick={onClick}>
      <Copy aria-hidden="true" className="size-4" strokeWidth={strokeCard} />
      {copied ? copiedLabel : label}
    </Button>
  );
}

function UrlText({ children }: { children: string }) {
  return (
    <p
      className="rounded-control bg-canvas px-3.5 py-3 font-mono text-13 break-all text-ink"
      translate="no"
    >
      {children}
    </p>
  );
}

function QrCard({ url, slug }: { url: string; slug: string }) {
  const modules = useMemo(() => qrModules(url), [url]);
  const side = modules.length + 2 * QR_QUIET_ZONE;
  const bgRef = useRef<SVGRectElement>(null);
  const fgRef = useRef<SVGPathElement>(null);

  // Ritar samma moduler på en canvas med färgerna SVG:n faktiskt fick (tokens via
  // `fill-surface`/`fill-ink`), så PNG:en aldrig har egna färgvärden.
  function download() {
    const bg = bgRef.current;
    const fg = fgRef.current;
    if (!bg || !fg) return;
    const scale = Math.ceil(PNG_MIN_PX / side);
    const canvas = document.createElement("canvas");
    canvas.width = side * scale;
    canvas.height = side * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = getComputedStyle(bg).fill;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = getComputedStyle(fg).fill;
    modules.forEach((row, y) => {
      row.forEach((dark, x) => {
        if (dark) {
          ctx.fillRect(
            (x + QR_QUIET_ZONE) * scale,
            (y + QR_QUIET_ZONE) * scale,
            scale,
            scale,
          );
        }
      });
    });
    canvas.toBlob((blob) => {
      if (!blob) return;
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `${t.qr.archivo({ slug })}.png`;
      a.click();
      URL.revokeObjectURL(href);
    }, "image/png");
  }

  return (
    <Card
      as="section"
      aria-label={t.qr.titulo}
      radius="tile"
      padding="lg"
      className="flex flex-col gap-3.5"
    >
      <h3 className="text-18 font-bold text-ink">{t.qr.titulo}</h3>
      <div className="flex flex-wrap items-center gap-5">
        <svg
          role="img"
          aria-label={t.qr.alt}
          viewBox={`0 0 ${side} ${side}`}
          shapeRendering="crispEdges"
          className="size-40 shrink-0 rounded-control"
        >
          <rect
            ref={bgRef}
            width={side}
            height={side}
            className="fill-surface"
          />
          <path ref={fgRef} d={qrPath(modules)} className="fill-ink" />
        </svg>
        <div className="flex max-w-80 flex-col gap-3">
          <p className="text-14 leading-body text-muted">{t.qr.ayuda}</p>
          <Button
            type="button"
            variant="primary"
            size="md"
            className="self-start"
            onClick={download}
          >
            <Download
              aria-hidden="true"
              className="size-4"
              strokeWidth={strokeCard}
            />
            {t.qr.descargar}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Steps({ steps }: { steps: readonly string[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {steps.map((step, i) => (
        <li key={step} className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-canvas font-display text-15 font-bold text-ink"
          >
            {i + 1}
          </span>
          <span className="pt-1.5 text-14 leading-body font-medium text-ink">
            {step}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <p className="text-13 leading-body text-muted">{children}</p>;
}

function channelNote(channel: ShareChannel): string {
  if (channel === "instagram") {
    return t.canales.instagram.nota({ marca: brand.name });
  }
  return t.canales[channel].nota;
}

export type CompartirSectionProps = {
  slug: string;
  businessName: string;
  /** Bokningssidans absoluta adress (`siteOrigin()` + `/<slug>`, `NEXT_PUBLIC_APP_URL`). */
  bookingUrl: string;
};

export function CompartirSection({
  slug,
  businessName,
  bookingUrl,
}: CompartirSectionProps) {
  const [channel, setChannel] = useState<ShareChannel>("instagram");
  const { copied, error, copy } = useCopy();
  const channelsId = useId();
  const channelUrl = shareLink(bookingUrl, channel);
  const guide = t.canales[channel];
  const whatsappMessage = inicio.tuLink.mensajeWhatsapp({
    negocio: businessName,
    url: shareLink(bookingUrl, "whatsapp"),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="font-display text-20 font-bold lg:text-22">
          {t.titulo}
        </h2>
        <p className="max-w-160 text-14 leading-body text-muted">{t.intro}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card
          as="section"
          aria-label={t.link.titulo}
          radius="tile"
          padding="lg"
          className="flex min-w-0 flex-col gap-3.5"
        >
          <h3 className="text-18 font-bold text-ink">{t.link.titulo}</h3>
          <UrlText>{bookingUrl}</UrlText>
          <div className="flex flex-wrap gap-2">
            <CopyButton
              copied={copied === "base"}
              label={t.link.copiar}
              copiedLabel={t.link.copiado}
              onClick={() => void copy("base", bookingUrl)}
            />
            <Button asChild variant="secondary" size="sm">
              <a href={`/${slug}`} target="_blank" rel="noreferrer">
                <ExternalLink
                  aria-hidden="true"
                  className="size-4"
                  strokeWidth={strokeCard}
                />
                {t.link.abrir}
              </a>
            </Button>
          </div>
        </Card>

        <QrCard url={shareLink(bookingUrl, QR_SOURCE)} slug={slug} />
      </div>

      <Card
        as="section"
        aria-label={t.guias.titulo}
        radius="tile"
        padding="lg"
        className="flex flex-col gap-5"
      >
        <div className="flex flex-col gap-1.5">
          <h3 className="text-18 font-bold text-ink">{t.guias.titulo}</h3>
          <Note>{t.guias.aviso}</Note>
        </div>

        <div
          role="group"
          aria-labelledby={channelsId}
          className="flex flex-wrap gap-2"
        >
          <span id={channelsId} className="sr-only">
            {t.guias.etiqueta}
          </span>
          {SHARE_CHANNELS.map((c) => (
            <Pill
              key={c}
              selected={channel === c}
              onClick={() => {
                setChannel(c);
              }}
              className={cn(channel !== c && "bg-canvas")}
            >
              {t.canales[c].nombre}
            </Pill>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <div className="flex min-w-0 flex-col gap-4">
            <Steps
              steps={[
                guide.pasos.uno,
                guide.pasos.dos,
                guide.pasos.tres,
                guide.pasos.cuatro,
              ]}
            />
            <Note>{channelNote(channel)}</Note>
          </div>

          <div className="flex min-w-0 flex-col gap-5">
            <div className="flex flex-col gap-2.5">
              <p className="text-13 font-bold text-ink">{t.guias.linkCanal}</p>
              <UrlText>{channelUrl}</UrlText>
              <Note>{t.guias.linkCanalAyuda}</Note>
              <div>
                <CopyButton
                  copied={copied === channelUrl}
                  label={t.guias.copiarLinkCanal}
                  copiedLabel={t.guias.linkCanalCopiado}
                  onClick={() => void copy(channelUrl, channelUrl)}
                />
              </div>
            </div>

            {channel === "whatsapp" ? (
              <div className="flex flex-col gap-2.5">
                <p className="text-13 font-bold text-ink">
                  {t.canales.whatsapp.mensajeTitulo}
                </p>
                <p className="rounded-control bg-canvas px-3.5 py-3 text-14 leading-body break-words text-ink">
                  {whatsappMessage}
                </p>
                <div>
                  <CopyButton
                    copied={copied === "mensaje"}
                    label={t.canales.whatsapp.copiarMensaje}
                    copiedLabel={t.canales.whatsapp.mensajeCopiado}
                    onClick={() => void copy("mensaje", whatsappMessage)}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      <p className="sr-only" role="status">
        {copied === "mensaje"
          ? t.canales.whatsapp.mensajeCopiado
          : copied
            ? t.link.copiado
            : ""}
      </p>
      {error ? (
        <p role="alert" className="text-13 font-semibold text-ink">
          {t.link.errorCopiar}
        </p>
      ) : null}
    </div>
  );
}
