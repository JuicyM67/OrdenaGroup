// `/baja/[token]` (WP-31, F14): avregistreringslänken i ett
// marknadsföringsutskick (`campanaMarketing`, e-post och sms). Publik sida,
// ingen inloggning. Token loggas aldrig (samma regel som `/r/[token]`).
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { baja } from "@/i18n";
import {
  findBajaTargetByToken,
  unsubscribeByToken,
  type UnsubscribeResult,
} from "@/server/campaigns";
import { getClientIp, hitRateLimit } from "@/server/db/rate-limit";

import { BajaForm } from "./baja-form";

// Pilotblockerare (samma princip som `/r/[token]`s `manage:ip`): en IP kan
// avregistrera högst `BAJA_IP_MAX` gånger per `BAJA_IP_WINDOW_SECONDS`.
const BAJA_IP_WINDOW_SECONDS = 10 * 60;
const BAJA_IP_MAX = 20;

export const dynamic = "force-dynamic";

type Params = Promise<{ token: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { token } = await params;
  const target = await findBajaTargetByToken(token);
  return {
    title: target ? `${baja.titulo} · ${target.negocio}` : undefined,
    robots: { index: false, follow: false },
  };
}

export default async function BajaPage({ params }: { params: Params }) {
  const { token } = await params;
  const target = await findBajaTargetByToken(token);
  if (!target) notFound();

  async function unsubscribe(): Promise<UnsubscribeResult> {
    "use server";
    const ip = await getClientIp();
    const allowed = await hitRateLimit({
      scope: "baja:ip",
      subject: ip,
      windowSeconds: BAJA_IP_WINDOW_SECONDS,
      max: BAJA_IP_MAX,
    });
    if (!allowed) return { ok: false, code: "invalid_token" };
    return unsubscribeByToken(token);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10">
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-card bg-surface p-8">
        <div>
          <p className="text-13 font-semibold text-muted">{target.negocio}</p>
          <h1 className="mt-1 font-display text-24 font-semibold tracking-title text-ink">
            {baja.titulo}
          </h1>
        </div>
        <BajaForm
          negocio={target.negocio}
          alreadyOptedOut={target.alreadyOptedOut}
          onUnsubscribe={unsubscribe}
        />
      </div>
    </main>
  );
}
