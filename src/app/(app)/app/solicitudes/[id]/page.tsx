// /app/solicitudes/[id] (WP-56): öppnas från sms/mejl-länken (ny
// bokningsförfrågan ELLER avbokningsförfrågan). Mobil först. Kräver
// inloggning (`(app)/layout.tsx` + `src/proxy.ts`); en utloggad person
// skickas till /login och tillbaka hit efter inloggningen via cookien
// `pending_solicitud` (se `src/proxy.ts`/`src/app/(app)/app/page.tsx`).
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { SolicitudDetailScreen } from "@/components/solicitudes/solicitud-detail-screen";
import { appHref } from "@/config/routes";
import { APP_TZ, parseInstant, toLocalDate } from "@/lib/format/dates";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/server/onboarding/owner-business";
import {
  approveCancelRequest,
  confirmRequest,
  declineCancelRequest,
  declineRequest,
  getRequestDetail,
} from "@/server/owner/requests";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

// Id:t kommer från URL:en (sms/mejl-länken) — samma gräns som andra
// klientkontrollerade id:n (src/app/(app)/app/agenda/page.tsx, `customerIdSchema`).
const idSchema = z.guid();

type Params = Promise<{ id: string }>;

export default async function SolicitudDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const parsedId = idSchema.safeParse(id);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const current = await getCurrentMember(user.id);
  if (!current) redirect(appHref("appOnboarding"));

  if (!parsedId.success) notFound();
  const bookingId = parsedId.data;

  const detail = await getRequestDetail(
    user.id,
    current.business.id,
    bookingId,
  );
  if (!detail) notFound();

  const r = parseInstant(detail.start);
  const agendaHref = r.ok
    ? `${appHref("appAgenda")}?vista=dia&fecha=${toLocalDate(r.value, APP_TZ)}`
    : appHref("appAgenda");

  const onConfirm = async (id: string) => {
    "use server";
    const result = await confirmRequest(
      user.id,
      current.business.id,
      new Date(),
      id,
    );
    return result.ok ? { ok: true as const } : { ok: false as const };
  };

  const onDecline = async (id: string, reason?: string) => {
    "use server";
    const result = await declineRequest(
      user.id,
      current.business.id,
      new Date(),
      id,
      reason,
    );
    return result.ok ? { ok: true as const } : { ok: false as const };
  };

  const onApproveCancel = async (id: string) => {
    "use server";
    const result = await approveCancelRequest(
      user.id,
      current.business.id,
      new Date(),
      id,
    );
    return result.ok ? { ok: true as const } : { ok: false as const };
  };

  const onDeclineCancel = async (id: string) => {
    "use server";
    const result = await declineCancelRequest(
      user.id,
      current.business.id,
      new Date(),
      id,
    );
    return result.ok ? { ok: true as const } : { ok: false as const };
  };

  return (
    <SolicitudDetailScreen
      bookingId={bookingId}
      businessName={current.business.name}
      detail={detail}
      agendaHref={agendaHref}
      onConfirm={onConfirm}
      onDecline={onDecline}
      onApproveCancel={onApproveCancel}
      onDeclineCancel={onDeclineCancel}
    />
  );
}
