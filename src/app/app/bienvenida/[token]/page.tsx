// /app/bienvenida/[token] (F19/WP-36): página pública (fuera del layout de
// `(app)` que exige sesión, ver src/proxy.ts) donde alguien invitado por un
// admin de la plataforma acepta su invitación. No logueado → envía un link
// mágico a la dirección de la invitación y guarda una cookie para volver
// aquí después (ver actions.ts). Logueado → acepta la invitación al tiro y
// sigue a onboarding (que detecta el negocio ya creado con comuna/category
// en blanco, ver src/server/onboarding/owner-business.ts).
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { appHref } from "@/config/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { invitacionNegocio } from "@/i18n/auth";
import {
  acceptInvitation,
  getInvitationPreview,
} from "@/server/onboarding/invitation";

import { sendInvitationMagicLink } from "./actions";
import { invitationErrorText } from "./error-text";
import { InvitationForm } from "./invitation-form";

export const metadata: Metadata = {
  title: invitacionNegocio.titulo,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function ErrorScreen({ code }: { code: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10">
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-card bg-surface p-8">
        <h1 className="text-22 font-bold tracking-title text-ink">
          {invitacionNegocio.titulo}
        </h1>
        <p className="text-15 text-ink-soft">{invitationErrorText(code)}</p>
      </div>
    </main>
  );
}

export default async function BienvenidaInvitacionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const result = await acceptInvitation(user.id, token);
    if (result.ok) redirect(appHref("appOnboarding"));
    return <ErrorScreen code={result.code} />;
  }

  const preview = await getInvitationPreview(token);
  if (!preview.ok) return <ErrorScreen code={preview.code} />;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-sm">
        <InvitationForm
          token={token}
          businessName={preview.businessName}
          onSend={sendInvitationMagicLink}
        />
      </div>
    </main>
  );
}
