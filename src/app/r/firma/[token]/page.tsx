// WP-88 (D-074): engångslänken för att godkänna en consentimiento i salongen.
// Personalen skapar den i fichan (`createSigningLink`), kunden öppnar den på
// sin eller salongens enhet. Bara hashen av token finns i databasen; token
// binds i closuren (samma mönster som `/r/[token]`) och loggas aldrig.
import type { Metadata } from "next";

import {
  ConsentAcceptCard,
  type ConsentAcceptResult,
} from "@/components/records/consent-accept-card";
import { consentimientoInformado } from "@/i18n";
import { getClientIp, hitRateLimit } from "@/server/db/rate-limit";
import {
  acceptSigningLink,
  loadSigningLink,
} from "@/server/records/public-consent";
import { systemClock } from "@/server/scheduling/clock";

const SIGN_IP_WINDOW_SECONDS = 10 * 60;
const SIGN_IP_MAX = 20;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: consentimientoInformado.firma.titulo,
  robots: { index: false, follow: false },
};

type Params = Promise<{ token: string }>;

export default async function FirmaPage({ params }: { params: Params }) {
  const { token } = await params;
  const view = await loadSigningLink(token, systemClock());

  async function accept(): Promise<ConsentAcceptResult> {
    "use server";
    const ip = await getClientIp();
    const allowed = await hitRateLimit({
      scope: "consent-sign:ip",
      subject: ip,
      windowSeconds: SIGN_IP_WINDOW_SECONDS,
      max: SIGN_IP_MAX,
    });
    if (!allowed) return { ok: false, code: "rate_limited" };
    if (view.status !== "open") return { ok: false, code: "invalid" };
    return acceptSigningLink(token, view.consent.version, systemClock());
  }

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-5 pb-10">
      <div>
        {view.status !== "invalid" ? (
          <p className="text-13 font-semibold text-muted">
            {view.businessName}
          </p>
        ) : null}
        <h1 className="mt-1 font-display text-24 font-semibold tracking-title text-ink">
          {consentimientoInformado.firma.titulo}
        </h1>
      </div>
      {view.status === "open" ? (
        <ConsentAcceptCard
          consent={view.consent}
          businessName={view.businessName}
          onAccept={accept}
          defaultOpen
        />
      ) : (
        <p role="status" className="text-14 text-muted">
          {view.status === "done"
            ? consentimientoInformado.firma.yaAceptado
            : consentimientoInformado.firma.linkVencido}
        </p>
      )}
    </main>
  );
}
