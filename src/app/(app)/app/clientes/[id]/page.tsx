// /app/clientes/[id] (WP-24, F9): kundkortet. Anteckningar kräver
// `can_manage_all_bookings`/ägare (D-034, `updateCustomerNotes` kontrollerar
// det igen server-side); export/anonimizar bara ägaren (WP-26, samma
// `exportCustomer`/`anonymizeCustomer` som agendans popover).
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { logout } from "@/app/auth/actions";
import { CustomerDetailScreen } from "@/components/customers/customer-detail-screen";
import { market } from "@/config/brand";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendCustomerMessage } from "@/server/messaging/outbox/customer-message";
import { getCurrentMember } from "@/server/onboarding/owner-business";
import {
  getCustomerDetail,
  notifyCustomerMembership,
  setCustomerMember,
  updateCustomerNotes,
} from "@/server/owner/clientes";
import { ownerNameParts } from "@/server/owner/shared";
import { anonymizeCustomer, exportCustomer } from "@/server/privacy/customer";

import {
  confirmMyPhotoUploadAction,
  createMyPhotoUploadAction,
  deleteMyPhotoAction,
  loadMyProfileAction,
  updateMyTitleAction,
} from "../../my-profile-actions";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// VERCEL_ENV måste läsas per request, se src/app/design-lab/layout.tsx.
export const dynamic = "force-dynamic";

// z.guid() (inte z.uuid()): samma motiv som src/app/(app)/app/agenda/page.tsx
// — seedens "vanity"-id har inte en giltig RFC 4122-version/variant.
const idSchema = z.guid();

export default async function ClienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const current = await getCurrentMember(user.id);
  if (!current) redirect("/app/onboarding");

  const { id } = await params;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) notFound();

  const customer = await getCustomerDetail(
    user.id,
    current.business.id,
    parsedId.data,
    new Date(),
  );
  if (!customer) notFound();

  const owner = ownerNameParts(user.email);
  const myProfile = await loadMyProfileAction();

  const onUpdateNotes = async (notes: string) => {
    "use server";
    return updateCustomerNotes(
      user.id,
      current.business.id,
      parsedId.data,
      notes,
    );
  };

  const onExportCustomer = async (customerId: string) => {
    "use server";
    const parsed = idSchema.safeParse(customerId);
    if (!parsed.success) return { ok: false as const, code: "invalid_input" };
    return exportCustomer(user.id, current.business.id, parsed.data);
  };

  const onAnonymizeCustomer = async (customerId: string) => {
    "use server";
    const parsed = idSchema.safeParse(customerId);
    if (!parsed.success) return { ok: false as const, code: "invalid_input" };
    return anonymizeCustomer(user.id, current.business.id, parsed.data);
  };

  const onSetMember = async (isMember: boolean) => {
    "use server";
    return setCustomerMember(
      user.id,
      current.business.id,
      parsedId.data,
      isMember,
    );
  };

  const onNotifyMember = async () => {
    "use server";
    return notifyCustomerMembership(
      user.id,
      current.business.id,
      parsedId.data,
    );
  };

  // WP-55: "Enviar mensaje" — bara SE (ClickSend). I CL öppnar dialogen
  // `wa.me` direkt i klienten, utan servern (`MessageDialog`, D-006/D-007).
  const onSendMessage = async (text: string) => {
    "use server";
    const result = await sendCustomerMessage({
      businessId: current.business.id,
      customerId: parsedId.data,
      actorUserId: user.id,
      text,
    });
    if (!result.ok) return { ok: false as const, code: result.error };
    return { ok: true as const };
  };

  return (
    <CustomerDetailScreen
      customer={customer}
      canViewReports={current.view.perms.can_view_reports}
      onLogout={logout}
      onUpdateNotes={onUpdateNotes}
      onExportCustomer={onExportCustomer}
      onAnonymizeCustomer={onAnonymizeCustomer}
      onSetMember={onSetMember}
      onNotifyMember={onNotifyMember}
      onSendMessage={market === "SE" ? onSendMessage : undefined}
      ownerName={owner.name}
      publicPageHref={`/${current.business.slug}`}
      myProfile={myProfile ?? undefined}
      myProfileActions={
        myProfile
          ? {
              updateTitle: updateMyTitleAction,
              createPhotoUpload: createMyPhotoUploadAction,
              confirmPhotoUpload: confirmMyPhotoUploadAction,
              deletePhoto: deleteMyPhotoAction,
            }
          : undefined
      }
    />
  );
}
