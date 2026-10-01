// `GET /api/flash/[id]/story.png` (WP-30, F13): bild att dela i Instagram/
// WhatsApp-stories, 1080×1920, enligt `docs/design/reference/
// HoraFlash.dc.html`. Bara för AKTIVA flash-tider (annars 404) — ingen
// kunddata, ingen auth (ägaren delar bilden offentligt med flit).
//
// Satori (`ImageResponse`) har ingen DOM/CSS-kaskad: bara inline-`style`,
// inga Tailwind-klasser/CSS-variabler (samma motiverade undantag som
// `src/app/icon.tsx`, D-021) — hex-värdena nedan är kopior av
// `src/styles/tokens.css` (lime/ink/mörklila/vit), inte nya godtyckliga
// värden.
import { ImageResponse } from "next/og";
import { NextResponse, type NextRequest } from "next/server";

import { flashStory } from "@/i18n";
import { APP_LOCALE, APP_TZ, formatDate, formatTime } from "@/lib/format/dates";
import { formatMoney } from "@/lib/format/money";
import { flashPrice, isFlashIdShape } from "@/server/flash";
import { withServiceTx } from "@/server/db/tx";
import { systemClock } from "@/server/scheduling/clock";

import { loadStoryFonts } from "./fonts";

export const dynamic = "force-dynamic";

const WIDTH = 1080;
const HEIGHT = 1920;

// eslint-disable-next-line no-restricted-syntax -- kopia av --color-lime (D-021, se filkommentaren)
const LIME = "#E3F36B";
// eslint-disable-next-line no-restricted-syntax -- kopia av --color-ink
const INK = "#16161A";
// eslint-disable-next-line no-restricted-syntax -- dekorcirkel i referensen (HoraFlash.dc.html)
const CIRCLE = "#C9B8F5";
// eslint-disable-next-line no-restricted-syntax -- sekundär textfärg i referensen
const INK_MUTED = "#5E5E66";
// eslint-disable-next-line no-restricted-syntax -- mörkare variant för liten text på lime
const DARK_MUTED = "#2F3310";
// eslint-disable-next-line no-restricted-syntax -- kopia av --color-surface (vit)
const WHITE = "#FFFFFF";

type StoryData = {
  negocio: string;
  comuna: string;
  slug: string;
  servicio: string;
  profesional: string;
  start: number;
  priceClp: number;
  discountPct: number;
};

async function loadStoryData(
  flashSlotId: string,
  now: Date,
): Promise<StoryData | undefined> {
  return withServiceTx(async (q) => {
    const slot = await q.query<{
      business_id: string;
      staff_id: string;
      service_ids: string[] | null;
      starts_at: string;
      discount_pct: number;
    }>(
      `select business_id, staff_id, service_ids, starts_at::text as starts_at,
              discount_pct::int as discount_pct
         from public.flash_slots
        where id = $1 and status = 'active' and ends_at > $2`,
      [flashSlotId, now],
    );
    const f = slot.rows[0];
    if (!f) return undefined;

    const biz = await q.query<{ name: string; comuna: string; slug: string }>(
      `select name, comuna, slug from public.businesses
        where id = $1 and status = 'active'`,
      [f.business_id],
    );
    const b = biz.rows[0];
    if (!b) return undefined;

    const staff = await q.query<{ name: string }>(
      `select name from public.staff where business_id = $1 and id = $2`,
      [f.business_id, f.staff_id],
    );
    const staffName = staff.rows[0]?.name ?? "";

    // Samma regel som `flashSelection`/`isFreeIn`: den FÖRSTA tillåtna
    // tjänsten (sort, name), inte "alla" uppräknade — en story visar en rad.
    const svc = await q.query<{ name: string; price_clp: number }>(
      `select name, price_clp from public.services
        where business_id = $1 and active
          and ($2::uuid[] is null or id = any($2::uuid[]))
        order by sort, name
        limit 1`,
      [f.business_id, f.service_ids],
    );
    const s = svc.rows[0];
    if (!s) return undefined;

    return {
      negocio: b.name,
      comuna: b.comuna,
      slug: b.slug,
      servicio: s.name,
      profesional: staffName,
      start: new Date(f.starts_at).getTime(),
      priceClp: s.price_clp,
      discountPct: f.discount_pct,
    };
  });
}

/** "Barbería Norte" → "BN" (hasta dos letras, primeras palabras). */
function initials(negocio: string): string {
  const letters = negocio
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (letters || "·").slice(0, 2);
}

function capitalize(s: string): string {
  return s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function appHost(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000";
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  if (!isFlashIdShape(id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  // Säkerhetsgranskning: 404 om företaget inte är aktivt eller tiden är slut.
  const data = await loadStoryData(id, systemClock());
  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const fonts = await loadStoryFonts();
  const start = new Date(data.start);
  const dia = capitalize(
    formatDate(start, APP_TZ, "weekdayDayLong", APP_LOCALE),
  );
  const hora = formatTime(start, APP_TZ);
  const price = flashPrice(data.priceClp, data.discountPct);
  const link = `${appHost()}/${data.slug}`;

  const image = new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 48,
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
        padding: "84px 72px 72px",
        background: LIME,
        color: INK,
        fontFamily: '"Plus Jakarta Sans"',
      }}
    >
      <div
        style={{
          position: "absolute",
          right: -270,
          top: 450,
          width: 900,
          height: 900,
          borderRadius: 450,
          background: CIRCLE,
        }}
      />

      {/* Header: logo + nombre + comuna */}
      <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
        <div
          style={{
            width: 132,
            height: 132,
            borderRadius: 42,
            background: INK,
            color: LIME,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: '"Bricolage Grotesque"',
            fontSize: 51,
            fontWeight: 700,
          }}
        >
          {initials(data.negocio)}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 45, fontWeight: 700 }}>{data.negocio}</div>
          <div style={{ fontSize: 36, color: DARK_MUTED }}>{data.comuna}</div>
        </div>
      </div>

      {/* Insignia + descuento gigante */}
      <div style={{ display: "flex", flexDirection: "column", marginTop: 54 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontSize: 39,
            fontWeight: 700,
            padding: "18px 36px",
            borderRadius: 42,
            background: INK,
            color: WHITE,
            alignSelf: "flex-start",
          }}
        >
          {flashStory.badge}
        </div>
        <div
          style={{
            fontFamily: '"Bricolage Grotesque"',
            fontSize: 354,
            fontWeight: 800,
            letterSpacing: -0.05,
            lineHeight: 0.9,
            marginTop: 48,
          }}
        >
          −{data.discountPct}%
        </div>
      </div>

      {/* Tarjeta blanca */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 18,
          marginTop: "auto",
          background: WHITE,
          borderRadius: 72,
          padding: 54,
        }}
      >
        <div style={{ fontSize: 39, color: INK_MUTED }}>
          {flashStory.soloUnaHora}
        </div>
        <div
          style={{
            fontFamily: '"Bricolage Grotesque"',
            fontSize: 84,
            fontWeight: 600,
            letterSpacing: -0.02,
          }}
        >
          {dia} · {hora}
        </div>
        <div style={{ fontSize: 45, fontWeight: 600 }}>
          {data.servicio}
          {data.profesional ? ` con ${data.profesional}` : ""}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 24,
            marginTop: 12,
          }}
        >
          <span
            style={{
              fontFamily: '"Bricolage Grotesque"',
              fontSize: 78,
              fontWeight: 700,
            }}
          >
            {formatMoney(price)}
          </span>
          <span
            style={{
              fontSize: 42,
              color: INK_MUTED,
              textDecoration: "line-through",
            }}
          >
            {formatMoney(data.priceClp)}
          </span>
        </div>
      </div>

      {/* Barra inferior: CTA + link */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            height: 156,
            borderRadius: 54,
            background: INK,
            color: WHITE,
            alignItems: "center",
            justifyContent: "center",
            fontSize: 45,
            fontWeight: 700,
          }}
        >
          {flashStory.cta}
        </div>
        <div style={{ display: "flex", fontSize: 33, color: DARK_MUTED }}>
          {link}
        </div>
      </div>
    </div>,
    {
      width: WIDTH,
      height: HEIGHT,
      fonts,
    },
  );
  // Kort cache (planens krav): flash-tiden kan avbrytas/bokas när som helst,
  // en gammal bild ska inte dröja kvar länge i en CDN/delningsapps cache.
  image.headers.set("Cache-Control", "public, max-age=60, s-maxage=60");
  return image;
}
