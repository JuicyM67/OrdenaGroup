"use client";
// Kundens väntelisteerbjudande `/v/[token]` (WP-23, D-029): visar erbjudandet
// med en nedräkning till `expiresAt` och knappen "Ta tiden" (server action,
// bunden till token i `page.tsx`:s closure — samma mönster som
// `/r/[token]`:s `cancelReservation`, qa-granskning WP-13 item 5). Härledd
// formgivning (ingen ritad referens för den här skärmen): mörk rubrik, `Card
// radius="tile"` för sammanfattningen, samma typografiskalor som
// `ManageScreen`.
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { comun, vOferta } from "@/i18n";
import { APP_LOCALE, APP_TZ, formatDate, formatTime } from "@/lib/format/dates";

import {
  mustParseInstant,
  remainingParts,
  type ClaimActionResult,
  type OfferScreenState,
  type WaitlistOfferView,
} from "./view";

export type OfferScreenProps =
  | {
      kind: "offer";
      offer: WaitlistOfferView;
      staffName: string;
      now: string;
      onClaim: () => Promise<ClaimActionResult>;
    }
  | { kind: OfferScreenState };

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-13 text-muted">{label}</span>
      <span className="text-right text-15 font-bold text-ink">{value}</span>
    </div>
  );
}

function DeadEnd({ title, body }: { title: string; body?: string }) {
  return (
    <div className="flex flex-col gap-2 p-5 pb-10">
      <h1 className="font-display text-22 font-semibold tracking-title text-ink">
        {title}
      </h1>
      {body ? <p className="text-14 text-muted">{body}</p> : null}
    </div>
  );
}

/** `now` (ISO, från servern) fröar den FÖRSTA renderingen så att SSR-HTML:en
 * och klienthydreringen visar exakt samma sekund — tickningen efteråt (varje
 * sekund, `Date.now()`) sker bara i `useEffect`, alltså aldrig under själva
 * hydreringen (samma hydrerings-säkra mönster som övriga "nu"-beroende
 * klientkomponenter i appen). */
function OfferCountdown({
  offer,
  now,
}: {
  offer: WaitlistOfferView;
  now: string;
}) {
  const [nowMs, setNowMs] = useState(() =>
    mustParseInstant(now, "OfferCountdown").getTime(),
  );
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const { minutos, segundos, done } = remainingParts(
    offer.expiresAt,
    new Date(nowMs),
  );
  if (done) return null;
  return (
    <p role="status" className="text-14 font-semibold text-ink">
      {vOferta.expira({ minutos, segundos })}
    </p>
  );
}

export function OfferScreen(props: OfferScreenProps) {
  if (props.kind === "offer") {
    return <OfferForm {...props} />;
  }
  if (props.kind === "taken") {
    return <DeadEnd title={vOferta.yaTomada} body={vOferta.yaTomadaAviso} />;
  }
  if (props.kind === "expired") {
    return <DeadEnd title={vOferta.vencida} />;
  }
  return <DeadEnd title={vOferta.yaReservada} />;
}

function OfferForm({
  offer,
  staffName,
  now,
  onClaim,
}: Extract<OfferScreenProps, { kind: "offer" }>) {
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [failure, setFailure] = useState<OfferScreenState | "error" | null>(
    null,
  );

  const start = mustParseInstant(offer.start, "OfferForm");
  const dia = formatDate(start, APP_TZ, "weekdayDayMonthLong", APP_LOCALE);
  const hora = formatTime(start, APP_TZ);

  async function handleClaim() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await onClaim();
      if (result.ok) {
        setConfirmed(true);
        return;
      }
      setFailure(
        result.code === "taken" || result.code === "expired"
          ? result.code
          : "error",
      );
    } catch {
      setFailure("error");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmed) {
    return (
      <DeadEnd title={vOferta.confirmada} body={vOferta.confirmadaAviso} />
    );
  }
  if (failure === "taken") {
    return <DeadEnd title={vOferta.yaTomada} body={vOferta.yaTomadaAviso} />;
  }
  if (failure === "expired") {
    return <DeadEnd title={vOferta.vencida} />;
  }

  return (
    <div className="flex flex-col gap-6 p-5 pb-10">
      <div>
        <p className="text-13 font-semibold text-muted">{offer.businessName}</p>
        <h1 className="mt-1 font-display text-24 font-semibold tracking-title text-ink">
          {vOferta.titulo}
        </h1>
      </div>

      <Card radius="tile" padding="lg" className="flex flex-col gap-3">
        <Row label={vOferta.campos.servicio} value={offer.serviceName} />
        <Row label={vOferta.campos.dia} value={dia} />
        <Row label={vOferta.campos.hora} value={hora} />
        <Row label={vOferta.campos.profesional} value={staffName} />
      </Card>

      <OfferCountdown offer={offer} now={now} />

      <Button
        type="button"
        variant="accent"
        size="lg"
        disabled={submitting}
        onClick={() => void handleClaim()}
      >
        {submitting ? vOferta.tomando : vOferta.ctaTomar}
      </Button>

      {failure === "error" ? (
        <p role="alert" className="text-13 text-ink">
          {comun.algoSalioMal}
        </p>
      ) : null}
    </div>
  );
}
