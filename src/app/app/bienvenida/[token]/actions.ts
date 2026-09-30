"use server";

// Server action: envía el link mágico a la dirección de la invitación
// (F19/WP-36). Misma lógica de límites que `src/app/(auth)/login/actions.ts`,
// con una gráfica separada ("invite:*") para no compartir contador con el
// login normal.
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getClientIp, hitRateLimit } from "@/server/db/rate-limit";
import {
  getInvitationPreview,
  INVITE_COOKIE_MAX_AGE_SECONDS,
  INVITE_COOKIE_NAME,
} from "@/server/onboarding/invitation";

export type SendInvitationLinkResult =
  | { ok: true; email: string }
  | { ok: false; code: string };

const WINDOW_SECONDS = 10 * 60;
const IP_MAX = 5;
const TOKEN_MAX = 3;

export async function sendInvitationMagicLink(
  token: string,
): Promise<SendInvitationLinkResult> {
  const preview = await getInvitationPreview(token);
  if (!preview.ok) return { ok: false, code: preview.code };

  const ip = await getClientIp();
  const ipAllowed = await hitRateLimit({
    scope: "invite:ip",
    subject: ip,
    windowSeconds: WINDOW_SECONDS,
    max: IP_MAX,
  });
  if (!ipAllowed) return { ok: false, code: "over_email_send_rate_limit" };

  const tokenAllowed = await hitRateLimit({
    scope: "invite:token",
    subject: token,
    windowSeconds: WINDOW_SECONDS,
    max: TOKEN_MAX,
  });
  if (!tokenAllowed) return { ok: false, code: "over_email_send_rate_limit" };

  try {
    const supabase = await createSupabaseServerClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const { error } = await supabase.auth.signInWithOtp({
      email: preview.email,
      options: appUrl ? { emailRedirectTo: `${appUrl}/auth/confirm` } : {},
    });
    if (error) return { ok: false, code: "network" };
  } catch {
    return { ok: false, code: "network" };
  }

  const cookieStore = await cookies();
  cookieStore.set(INVITE_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: INVITE_COOKIE_MAX_AGE_SECONDS,
  });

  return { ok: true, email: preview.email };
}
