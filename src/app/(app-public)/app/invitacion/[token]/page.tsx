// /app/invitacion/[token] (WP-46 steg 5–6, D-034): sidan där en inbjuden
// profesional accepterar. MEDVETET i en EGEN route-grupp, inte under
// `(app)/app/`: den måste kunna visas för en UTLOGGAD besökare (magisk
// länk-formuläret), och `(app)/layout.tsx` redirectar allt utloggat till
// /login (försvar i djupet). `src/proxy.ts` har en snäv undantagsregel för
// just den här sökvägsprefixen (`/app/invitacion/`) av samma skäl.
//
// Ingen `.dc.html`-referens (ny skärm, se `src/i18n/es-CL.ts`s kommentar vid
// `invitacion`) — bara tokens, samma mönster som resten av appen.
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { requestMagicLink } from "@/app/(auth)/login/actions";
import { LoginForm } from "@/components/auth/login-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { comun, invitacion } from "@/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  acceptInvitation,
  loadInvitationPreview,
} from "@/server/team/accept";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** 32 slumpbyte som base64url (`createInvitationToken`, `src/server/team/token.ts`). */
const TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;

function errorText(code: string, email?: string): string {
  switch (code) {
    case "noEncontrada":
      return invitacion.errores.noEncontrada;
    case "expirada":
      return invitacion.errores.expirada;
    case "revocada":
      return invitacion.errores.revocada;
    case "yaUsada":
      return invitacion.errores.yaUsada;
    case "limiteDelPlan":
      return invitacion.errores.limiteDelPlan;
    case "correoOtroNegocio":
      return invitacion.errores.correoOtroNegocio;
    case "otroCorreo":
      return invitacion.errores.otroCorreo({ email: email ?? "" });
    default:
      return comun.algoSalioMal;
  }
}

function ErrorCard({ text }: { text: string }) {
  return (
    <Card radius="card" padding="xl" className="flex flex-col gap-3">
      <p role="alert" className="text-15 text-ink">
        {text}
      </p>
    </Card>
  );
}

export default async function InvitationPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; email?: string }>;
}) {
  const { token } = await params;
  const { error, email: errorEmail } = await searchParams;

  if (!TOKEN_RE.test(token)) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10">
        <div className="w-full max-w-sm">
          <ErrorCard text={invitacion.errores.noEncontrada} />
        </div>
      </main>
    );
  }

  const preview = await loadInvitationPreview(token);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  async function onRequestMagicLink(email: string) {
    "use server";
    // WP-46: kom ihåg den här inbjudan (15 min, samma som Supabases
    // magisk länk/kod) så att `/app` (`src/app/(app)/app/page.tsx`) kan
    // skicka tillbaka hit efter inloggningen — `/auth/confirm` stödjer
    // medvetet ingen `?next=` (öppen omdirigering, D-019), en cookie med ett
    // redan validerat token-format är den säkra vägen runt det.
    const store = await cookies();
    store.set("pending_invitation", token, {
      path: "/",
      maxAge: 60 * 15,
      sameSite: "lax",
    });
    return requestMagicLink(email);
  }

  async function onAccept() {
    "use server";
    const supabase = await createSupabaseServerClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (!currentUser) redirect("/login");
    const result = await acceptInvitation(
      currentUser.id,
      currentUser.email ?? "",
      token,
      new Date(),
    );
    if (result.ok) redirect("/app/agenda");
    const qs = new URLSearchParams({ error: result.code });
    if (result.code === "otroCorreo") qs.set("email", result.email);
    redirect(`/app/invitacion/${token}?${qs.toString()}`);
  }

  if (!preview || preview.status !== "valid") {
    const code = !preview
      ? "noEncontrada"
      : preview.status === "expired"
        ? "expirada"
        : preview.status === "revoked"
          ? "revocada"
          : "yaUsada";
    return (
      <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10">
        <div className="w-full max-w-sm">
          <ErrorCard text={errorText(code)} />
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10">
      <div className="flex w-full max-w-sm flex-col gap-4">
        <Card radius="card" padding="xl" className="flex flex-col gap-3">
          <h1 className="text-22 font-bold tracking-title text-ink">
            {invitacion.titulo({ negocio: preview.businessName })}
          </h1>
          <p className="text-15 text-ink-soft">
            {invitacion.texto({ negocio: preview.businessName })}
          </p>
          {error ? (
            <p role="alert" className="text-13 text-ink">
              {errorText(error, errorEmail)}
            </p>
          ) : null}
          {user ? (
            <form action={onAccept}>
              <Button type="submit" size="xl" className="w-full">
                {invitacion.ctaAceptar}
              </Button>
            </form>
          ) : null}
        </Card>

        {!user ? <LoginForm onRequestMagicLink={onRequestMagicLink} /> : null}
      </div>
    </main>
  );
}
