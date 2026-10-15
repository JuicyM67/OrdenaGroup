// Erbjudandesidan (WP-68, Erbjudande.dc.html) i hemsidans designspråk: foto-hero
// med glasbrickor, vita kort för "Det här ingår", "Så funkar det", villkor och
// en verifierad recension med salongens svar (D-045). WP-69 (D-057): när
// företaget kan ta betalt visas köpet ("Köp och välj tid", ett vanligt
// formulär mot en server action — ingen klient-JS); annars som förut "Köpet
// öppnar snart" och en länk till salongens lediga tider (D-035).
import { ArrowRight, Check, ChevronRight, Star } from "lucide-react";
import Link from "next/link";

import { Brodsmulor } from "@/components/marketing/paginas/foto-hero";
import {
  BreadcrumbJsonLd,
  type Migas,
} from "@/components/marketing/paginas/json-ld";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { strokeArrow } from "@/components/ui/icons";
import { hrefMarketplace } from "@/config/routes";
import { queryString } from "@/config/url-params";
import { descubre, vales } from "@/i18n";
import { formatDuration } from "@/lib/format/dates";
import { initialsOf } from "@/lib/format/initials";
import { formatMoney } from "@/lib/format/money";
import type { OfferDetail as OfferDetailData } from "@/server/marketplace/public";

import { BottomTabs } from "./bottom-tabs";
import type { ConsumerNav } from "./consumer-session";
import { formatKm, formatRating } from "./format";
import { OfferCard } from "./offer-card";
import { OfferImage } from "./offer-image";
import { favoriteFor } from "./favorite";
import { OfferJsonLd } from "./offer-json-ld";

const t = descubre;

const card = "rounded-card bg-surface p-5 lg:p-6";
const cardTitle = "text-18 font-bold";

function Stars({ n }: { n: number }) {
  return (
    <span
      aria-label={t.tarjeta.nota({ nota: String(n) })}
      className="flex gap-0.5"
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={
            i <= n
              ? "size-4 fill-ink text-ink"
              : "size-4 fill-line-strong text-line-strong"
          }
          strokeWidth={0}
        />
      ))}
    </span>
  );
}

function BuySoon({
  offer,
  bookHref,
  atOfferPrice,
}: {
  offer: OfferDetailData;
  bookHref: string;
  /** D-060: bokning till erbjudandepris, betalning i salongen (CL). */
  atOfferPrice: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-13 text-muted">
          {t.oferta.precioNormal} <s>{formatMoney(offer.regularMinor)}</s>
        </span>
        <b className="font-display text-40 leading-none font-semibold tracking-display">
          {formatMoney(offer.priceMinor)}
        </b>
      </div>
      <span className="flex h-12 items-center justify-center rounded-control bg-canvas px-4 text-14 font-bold text-muted">
        {atOfferPrice ? t.oferta.enLocal : t.oferta.proximamente}
      </span>
      <p className="text-13 leading-relaxed text-muted">
        {atOfferPrice ? t.oferta.enLocalTexto : t.oferta.proximamenteTexto}
      </p>
      <Link
        href={bookHref}
        className="flex h-12 items-center justify-center gap-2 rounded-control bg-ink px-4 text-15 font-bold text-on-dark hover:bg-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {atOfferPrice ? t.oferta.reservarOferta : t.oferta.verHoras}
        <ArrowRight
          aria-hidden="true"
          className="size-4.5 text-lime"
          strokeWidth={strokeArrow}
        />
      </Link>
    </div>
  );
}

export type OfferPurchase = {
  action: (formData: FormData) => Promise<void>;
  /** Besked efter retur (`?kop=fel|slut|avbrutet`), redan översatt. */
  notice?: string;
};

const buyButton =
  "flex items-center justify-center gap-2 rounded-control bg-ink text-15 font-bold text-on-dark hover:bg-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

function BuyForm({
  offer,
  purchase,
  className,
  label,
}: {
  offer: OfferDetailData;
  purchase: OfferPurchase;
  className: string;
  label: string;
}) {
  return (
    <form action={purchase.action}>
      <input type="hidden" name="oferta" value={offer.slug} />
      <button type="submit" className={`${buyButton} ${className}`}>
        {label}
        <ArrowRight
          aria-hidden="true"
          className="size-4.5 text-lime"
          strokeWidth={strokeArrow}
        />
      </button>
    </form>
  );
}

function BuyBox({
  offer,
  purchase,
}: {
  offer: OfferDetailData;
  purchase: OfferPurchase;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-13 text-muted">
          {t.oferta.precioNormal} <s>{formatMoney(offer.regularMinor)}</s>
        </span>
        <b className="font-display text-40 leading-none font-semibold tracking-display">
          {formatMoney(offer.priceMinor)}
        </b>
      </div>
      {purchase.notice ? (
        <p
          role="status"
          className="rounded-tile bg-canvas px-3 py-2 text-13 font-semibold text-ink"
        >
          {purchase.notice}
        </p>
      ) : null}
      <BuyForm
        offer={offer}
        purchase={purchase}
        className="h-14 w-full px-5"
        label={vales.compra.comprar}
      />
      <p className="text-13 leading-relaxed text-muted">{vales.compra.texto}</p>
      <ul className="flex flex-col gap-1.5 text-13 text-ink-soft">
        <li className="flex items-start gap-2">
          <Check
            aria-hidden="true"
            className="mt-0.5 size-3.5 shrink-0 text-success-fg"
            strokeWidth={2.6}
          />
          {t.oferta.validez({ meses: offer.validMonths })}
        </li>
        <li className="flex items-start gap-2">
          <Check
            aria-hidden="true"
            className="mt-0.5 size-3.5 shrink-0 text-success-fg"
            strokeWidth={2.6}
          />
          {vales.compra.arrepentimiento}
        </li>
      </ul>
      <p className="text-12 text-muted">
        {vales.compra.vendido({ negocio: offer.business.name })}
      </p>
    </div>
  );
}

export function OfferDetail({
  offer,
  migas,
  jsonLd,
  nav,
  purchase,
  bookAtOfferPrice,
}: {
  offer: OfferDetailData;
  migas: Migas;
  jsonLd: Record<string, unknown>;
  nav: ConsumerNav;
  /** WP-69: köpet (bara när företaget kan ta betalt, SE). */
  purchase?: OfferPurchase;
  /** D-060: utan köp bokar kunden till erbjudandepris (`?oferta=`) och
   * betalar i salongen (CL). Annars "köp kommer snart" + vanlig bokning. */
  bookAtOfferPrice?: boolean;
}) {
  const bookHref = `/${offer.business.slug}`;
  const atOfferPrice = !purchase && bookAtOfferPrice === true;
  const offerBookHref = atOfferPrice
    ? `${bookHref}${queryString("oferta", offer.id)}`
    : bookHref;
  const categoria = t.categorias.nombres[offer.category];
  const ratingParts = [
    offer.rating ? t.oferta.verificadas({ n: offer.rating.count }) : null,
    offer.distanceKm !== null
      ? `${formatKm(offer.distanceKm)} km`
      : offer.business.areaName,
  ].filter(Boolean);

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <BreadcrumbJsonLd migas={migas} />
      <OfferJsonLd data={jsonLd} />
      <SiteHeader className="mt-10" />
      <main className="flex-1 pb-44 lg:pb-0">
        <section className="relative -mt-26 flex min-h-110 flex-col bg-dark text-on-dark lg:min-h-130">
          <OfferImage
            src={offer.imageUrl}
            alt={offer.business.name}
            sizes="100vw"
            priority
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-photo-tint-mobile lg:bg-photo-tint"
          />
          <div className="relative mx-auto flex w-full max-w-360 flex-1 flex-col justify-end gap-4 px-4 pt-32 pb-8 sm:px-8 lg:px-22 lg:pb-14">
            <Brodsmulor migas={migas} label={t.migas.label} />
            <div className="flex items-center justify-between gap-3">
              {offer.discountPct > 0 ? (
                <span className="w-fit rounded-chip bg-lime px-3 py-1.5 text-14 font-bold text-ink">
                  {t.oferta.ahorra({ pct: offer.discountPct })}
                </span>
              ) : (
                <span />
              )}
              {favoriteFor(
                nav,
                offer.business.id,
                hrefMarketplace("oferta", offer.slug),
              )}
            </div>
            <p className="text-13 font-bold tracking-label text-on-dark/80 uppercase">
              {t.oferta.eyebrow({ categoria })}
            </p>
            <h1 className="max-w-3xl font-display text-38 leading-display font-semibold tracking-hero text-balance sm:text-52">
              {offer.title}
            </h1>
          </div>
        </section>

        <div className="mx-auto flex max-w-360 flex-col gap-6 px-4 py-6 sm:px-8 lg:flex-row lg:items-start lg:gap-8 lg:px-22 lg:py-10">
          <div className="flex min-w-0 flex-1 flex-col gap-3.5">
            <Link
              href={bookHref}
              className="flex items-center gap-3.5 rounded-card bg-surface p-3.5 hover:shadow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <span
                aria-hidden="true"
                className="flex size-12 shrink-0 items-center justify-center rounded-icon bg-ink font-display text-18 font-bold text-lime"
              >
                {initialsOf(offer.business.name).slice(0, 1)}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <b className="text-16">{offer.business.name}</b>
                <span className="flex items-center gap-1 text-13 text-muted">
                  {offer.rating ? (
                    <>
                      <Star
                        aria-hidden="true"
                        className="size-3.5 fill-ink-soft text-ink-soft"
                        strokeWidth={0}
                      />
                      <span className="font-semibold text-ink-soft">
                        {formatRating(offer.rating.average)}
                      </span>
                      <span aria-hidden="true">·</span>
                    </>
                  ) : null}
                  <span className="truncate">{ratingParts.join(" · ")}</span>
                </span>
              </span>
              <ChevronRight
                aria-hidden="true"
                className="size-5 shrink-0 text-muted"
                strokeWidth={2}
              />
            </Link>

            {offer.description ? (
              <p className="px-1 py-2 text-16 leading-relaxed text-ink-soft">
                {offer.description}
              </p>
            ) : null}

            {offer.includes.length > 0 ? (
              <section className={card}>
                <h2 className={cardTitle}>{t.oferta.incluye}</h2>
                <ul className="mt-3 flex flex-col gap-2.5">
                  {offer.includes.map((x) => (
                    <li key={x} className="flex items-start gap-3 text-15">
                      <span
                        aria-hidden="true"
                        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success-bg text-success-fg"
                      >
                        <Check className="size-3.5" strokeWidth={2.6} />
                      </span>
                      {x}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className={card}>
              <h2 className={cardTitle}>{t.oferta.comoFunciona}</h2>
              <ol className="mt-3 grid grid-cols-3 gap-2">
                {(atOfferPrice ? t.oferta.pasosLocal : t.oferta.pasos).map(
                  (paso, i) => (
                    <li
                      key={paso}
                      className="flex flex-col gap-1 rounded-tile bg-canvas p-3"
                    >
                      <b className="font-display text-24 font-semibold">
                        {i + 1}
                      </b>
                      <span className="text-13 leading-snug text-ink-soft">
                        {paso}
                      </span>
                    </li>
                  ),
                )}
              </ol>
              <p className="mt-3 text-13 text-muted">
                {/* Giltighetstiden gäller värdebeviset (köpet), inte bokningen. */}
                {atOfferPrice
                  ? null
                  : t.oferta.validez({ meses: offer.validMonths })}{" "}
                {t.oferta.duracion({
                  duracion: formatDuration(offer.durationMin),
                })}
              </p>
            </section>

            {offer.terms ? (
              <section className={card}>
                <h2 className={cardTitle}>{t.oferta.condiciones}</h2>
                <p className="mt-2 text-14 leading-relaxed text-ink-soft">
                  {offer.terms}
                </p>
              </section>
            ) : null}

            {offer.rating ? (
              <section className={card}>
                <div className="flex items-center justify-between gap-3">
                  <h2 className={cardTitle}>{t.oferta.resenas}</h2>
                  <span className="flex items-center gap-1 text-14">
                    <Star
                      aria-hidden="true"
                      className="size-4 fill-ink text-ink"
                      strokeWidth={0}
                    />
                    <b>{formatRating(offer.rating.average)}</b>
                    <span className="text-muted">
                      {t.tarjeta.resenas({ n: offer.rating.count })}
                    </span>
                  </span>
                </div>
                {offer.review ? (
                  <figure className="mt-3 flex flex-col gap-2">
                    <figcaption className="flex items-center gap-2">
                      <b className="text-14">{offer.review.displayName}</b>
                      <span className="rounded-chip bg-success-bg px-2 py-0.5 text-12 font-bold text-success-fg">
                        {t.oferta.verificada}
                      </span>
                    </figcaption>
                    <Stars n={offer.review.rating} />
                    <blockquote className="text-15 leading-relaxed">
                      {offer.review.comment}
                    </blockquote>
                    {offer.review.reply ? (
                      <p className="rounded-tile bg-canvas p-3 text-14">
                        <b>{t.oferta.respuesta}</b> {offer.review.reply}
                      </p>
                    ) : null}
                  </figure>
                ) : null}
              </section>
            ) : null}

            <p className="px-1 text-13 text-muted">
              {t.oferta.vendidoPor}{" "}
              <b className="text-ink-soft">{offer.business.name}</b>
              {offer.business.address ? ` · ${offer.business.address}` : ""}
            </p>

            {offer.more.length > 0 ? (
              <section className="mt-4 flex flex-col gap-3">
                <h2 className="font-display text-24 font-semibold tracking-display">
                  {t.oferta.masDe({ negocio: offer.business.name })}
                </h2>
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {offer.more.map((o) => (
                    <li key={o.id}>
                      <OfferCard offer={o} variant="row" />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <aside className="hidden w-95 shrink-0 rounded-card bg-surface p-6 shadow-soft lg:sticky lg:top-28 lg:block">
            {purchase ? (
              <BuyBox offer={offer} purchase={purchase} />
            ) : (
              <BuySoon
                offer={offer}
                bookHref={offerBookHref}
                atOfferPrice={atOfferPrice}
              />
            )}
          </aside>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 rounded-t-card bg-surface px-4 pt-3 pb-27 shadow-popover lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <s className="text-13 text-muted">
              {formatMoney(offer.regularMinor)}
            </s>
            <b className="font-display text-26 leading-none font-semibold">
              {formatMoney(offer.priceMinor)}
            </b>
            {purchase ? (
              purchase.notice ? (
                <span role="status" className="mt-1 text-12 text-muted">
                  {purchase.notice}
                </span>
              ) : null
            ) : (
              <span className="mt-1 text-12 text-muted">
                {atOfferPrice ? t.oferta.enLocal : t.oferta.proximamente}
              </span>
            )}
          </div>
          {purchase ? (
            <BuyForm
              offer={offer}
              purchase={purchase}
              className="h-14 shrink-0 px-5 whitespace-nowrap"
              label={vales.compra.comprar}
            />
          ) : (
            <Link
              href={offerBookHref}
              className="flex h-13 items-center gap-2 rounded-control bg-ink px-5 text-15 font-bold text-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              {atOfferPrice ? t.oferta.reservarOferta : t.oferta.verHoras}
              <ArrowRight
                aria-hidden="true"
                className="size-4.5 text-lime"
                strokeWidth={strokeArrow}
              />
            </Link>
          )}
        </div>
      </div>
      <SiteFooter />
      <BottomTabs active="descubre" nav={nav} />
    </div>
  );
}
