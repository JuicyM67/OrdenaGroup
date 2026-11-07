// WP-21: riktig data (D-020s grind och fixtures flyttade till /design-lab/agenda,
// se docs/decisions/DECISIONS.md D-024). Ägare utan företag → /app/onboarding (samma
// mönster som /app/page.tsx, WP-15). `?vista=&fecha=` läses server-side. Llegó/No vino
// sparas via en server action bunden till ägaren/företaget (closure, samma mönster som
// `src/app/[slug]/page.tsx` — se kommentaren i `src/app/[slug]/actions.ts`).
//
// WP-21b: manuell bokning och flytt (server actions, samma closure-mönster). Samtycket
// (om rutan var ikryssad) sparas i ett eget steg efter att bokningen redan finns — ett fel
// där loggas här (utanför `src/server`, där `console.*` är tillåtet, till skillnad från
// `src/server/owner/manual-booking.ts`) och svaret blir ändå `ok` (samma avvägning som
// `src/app/[slug]/actions.ts`/`submit.ts`, WP-20).
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";

import { logout } from "@/app/auth/actions";
import { AgendaScreen } from "@/components/agenda/agenda-screen";
import type {
  CreateFlashSlotInput,
  FlashCatalogService,
  FlashStaff,
} from "@/components/flash/types";
import { appHref } from "@/config/routes";
import { parseLocalDate, APP_TZ, toLocalDate } from "@/lib/format/dates";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { pgErrorCode } from "@/server/db/errors";
import { kickOutbox } from "@/server/messaging/outbox";
import { getOwnerBusiness } from "@/server/onboarding/owner-business";
import { ownerNameParts } from "@/server/owner/shared";
import { loadAjustesServices, loadAjustesStaff } from "@/server/owner/ajustes";
import {
  loadOwnerAgendaMonthCounts,
  loadOwnerAgendaWeek,
} from "@/server/owner/agenda";
import { markArrival, type ArrivalStatus } from "@/server/owner/arrival";
import { createFlashSlotFromDialog } from "@/server/owner/flash-slots";
import {
  createManualBooking,
  loadOwnerBookableCatalog,
  moveOwnerBooking,
  saveManualConsent,
} from "@/server/owner/manual-booking";
import {
  approveCancelRequest,
  confirmRequest,
  declineCancelRequest,
  declineRequest,
  listPendingRequests,
} from "@/server/owner/requests";
import { getCustomerContact } from "@/server/owner/clientes";
import { MANUAL_METHODS } from "@/server/payments/mark-paid";
import { anonymizeCustomer, exportCustomer } from "@/server/privacy/customer";
import { removeWaitlistEntry } from "@/server/waitlist";

import { markPaidAction, undoPaymentAction } from "../caja/actions";
import {
  undoPackageUseAction,
  redeemPackageAction,
} from "../caja/package-actions";
import {
  confirmMyPhotoUploadAction,
  createMyPhotoUploadAction,
  deleteMyPhotoAction,
  loadMyProfileAction,
  updateMyTitleAction,
} from "../my-profile-actions";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// z.guid() (inte z.uuid()): samma motiv som src/server/owner/manual-booking.ts
// — seedens "vanity"-id (b0000000-…) har inte en giltig RFC 4122-version/
// variant. Säkerhetsgranskning WP-26 (punkt 9): server actions är anropbara
// endpoints, `customerId` från klienten valideras innan den når
// exportCustomer/anonymizeCustomer i stället för att låta ett ogiltigt värde
// nå databasen som ett raw cast-fel.
const customerIdSchema = z.guid();

// VERCEL_ENV måste läsas per request, se src/app/design-lab/layout.tsx.
export const dynamic = "force-dynamic";

export default async function AppAgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; fecha?: string; cliente?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const business = await getOwnerBusiness(user.id);
  if (!business) redirect(appHref("appOnboarding"));

  // WP-61 (ägarens UX-genomgång WP-57): klockan + profilmenyn i agendans verktygsrad/mobila
  // topprad (AgendaToolbar/OwnerMobileTopBar, via AgendaShell) — samma data/mönster som
  // /app/inicio (se ../inicio/page.tsx).
  const owner = ownerNameParts(user.email);
  const myProfile = await loadMyProfileAction();

  const { vista, fecha, cliente } = await searchParams;
  const parsedFecha = fecha ? parseLocalDate(fecha) : null;
  const now = new Date();
  const focus = parsedFecha?.ok ? parsedFecha.value : toLocalDate(now, APP_TZ);
  // WP-24: kundkortets "Nueva reserva" (`/app/clientes/[id]`) länkar hit med
  // `?cliente=<id>` — öppnar "Nueva reserva" direkt, förifylld.
  const parsedCliente = cliente ? customerIdSchema.safeParse(cliente) : null;

  const [
    data,
    catalog,
    pendingRequests,
    initialManualCustomer,
    staffRows,
    serviceRows,
  ] = await Promise.all([
    loadOwnerAgendaWeek(user.id, business.id, focus, now),
    loadOwnerBookableCatalog(user.id, business.id),
    listPendingRequests(user.id, business.id, now),
    parsedCliente?.success
      ? getCustomerContact(user.id, business.id, parsedCliente.data)
      : Promise.resolve(null),
    // WP-30: tomrutsmenyns "Hora flash" (FlashSlotDialog) behöver tjänsternas
    // längd (`durationMin`), som `loadOwnerBookableCatalog`s katalog inte har.
    loadAjustesStaff(user.id, business.id),
    loadAjustesServices(user.id, business.id),
  ]);

  const flashStaff: FlashStaff[] = staffRows
    .filter((s) => s.active)
    .map((s) => ({ id: s.id, name: s.name }));
  const flashServices: FlashCatalogService[] = serviceRows
    .filter((s) => s.active)
    .map((s) => ({
      id: s.id,
      name: s.name,
      durationMin: s.durationMin,
      staffIds: staffRows
        .filter((st) => st.serviceIds.includes(s.id))
        .map((st) => st.id),
    }));

  const onCreateFlashSlot = async (input: CreateFlashSlotInput) => {
    "use server";
    try {
      return await createFlashSlotFromDialog(user.id, business.id, input);
    } catch {
      // Ogiltigt datum/tid (t.ex. en trasig klient) — `fromLocal`/
      // `toISOString()` kan kasta innan motorns egen zod-validering nås.
      return { ok: false as const, code: "invalid_input" as const };
    }
  };

  const onArrival = async (bookingId: string, status: ArrivalStatus) => {
    "use server";
    await markArrival(user.id, business.id, bookingId, status);
  };

  // WP-50: agendans månadsvy — hämtas per efterfrågad månad i stället för att skickas med
  // sidans första laddning (samma closure-mönster som `onArrival`).
  const onLoadMonthCounts = async (month: { year: number; month: number }) => {
    "use server";
    return loadOwnerAgendaMonthCounts(user.id, business.id, month);
  };

  const onCreateManualBooking = async (input: unknown) => {
    "use server";
    const result = await createManualBooking(
      user.id,
      business.id,
      new Date(),
      input,
    );
    if (!result.ok) return { ok: false as const, error: result.error };
    void kickOutbox(); // WP-16: bekräftelse + ägarmejl direkt
    if (result.value.consent) {
      try {
        await saveManualConsent(
          user.id,
          business.id,
          result.value.customerId,
          new Date(),
        );
      } catch (e) {
        // Ingen persondata (bara SQLSTATE) — bokningen finns redan och svarar ok.
        console.error(
          "agenda: kunde inte spara det manuella samtycket (bokningen skapades ändå)",
          {
            businessId: business.id,
            bookingId: result.value.bookingId,
            sqlstate: pgErrorCode(e),
          },
        );
      }
    }
    return { ok: true as const };
  };

  const onMoveBooking = async (input: unknown) => {
    "use server";
    const result = await moveOwnerBooking(
      user.id,
      business.id,
      new Date(),
      input,
    );
    if (!result.ok) return { ok: false as const, error: result.error };
    void kickOutbox(); // WP-16: flyttmeddelandet direkt
    return { ok: true as const };
  };

  // WP-26 steg 7 (F12): "Exportar datos"/"Anonimizar cliente" i agenda-popovern
  // (`event-popover.tsx`). Ingen `kickOutbox()` här — anonymisering avbryter bara
  // köade meddelanden, den skapar inga nya.
  const onExportCustomer = async (customerId: string) => {
    "use server";
    const parsed = customerIdSchema.safeParse(customerId);
    if (!parsed.success) return { ok: false as const, code: "invalid_input" };
    return exportCustomer(user.id, business.id, parsed.data);
  };

  const onAnonymizeCustomer = async (customerId: string) => {
    "use server";
    const parsed = customerIdSchema.safeParse(customerId);
    if (!parsed.success) return { ok: false as const, code: "invalid_input" };
    return anonymizeCustomer(user.id, business.id, parsed.data);
  };

  const onConfirmRequest = async (bookingId: string) => {
    "use server";
    const result = await confirmRequest(
      user.id,
      business.id,
      new Date(),
      bookingId,
    );
    return { ok: result.ok };
  };

  const onDeclineRequest = async (bookingId: string, reason?: string) => {
    "use server";
    const result = await declineRequest(
      user.id,
      business.id,
      new Date(),
      bookingId,
      reason,
    );
    return { ok: result.ok };
  };

  const onApproveCancelRequest = async (bookingId: string) => {
    "use server";
    const result = await approveCancelRequest(
      user.id,
      business.id,
      new Date(),
      bookingId,
    );
    return { ok: result.ok };
  };

  const onDeclineCancelRequest = async (bookingId: string) => {
    "use server";
    const result = await declineCancelRequest(
      user.id,
      business.id,
      new Date(),
      bookingId,
    );
    return { ok: result.ok };
  };

  // WP-23: väntelistkortets "Ta bort".
  const onRemoveWaitlistEntry = async (entryId: string) => {
    "use server";
    const result = await removeWaitlistEntry(user.id, business.id, entryId);
    return { ok: result.ok };
  };

  return (
    <AgendaScreen
      data={data}
      initialVista={
        vista === "dia" ? "dia" : vista === "mes" ? "mes" : "semana"
      }
      initialFecha={parsedFecha?.ok ? parsedFecha.value : undefined}
      showMover={true}
      onArrival={onArrival}
      catalog={catalog}
      businessName={business.name}
      onCreateManualBooking={onCreateManualBooking}
      onMoveBooking={onMoveBooking}
      onExportCustomer={onExportCustomer}
      onAnonymizeCustomer={onAnonymizeCustomer}
      onRemoveWaitlistEntry={onRemoveWaitlistEntry}
      flashStaff={flashStaff}
      flashServices={flashServices}
      onCreateFlashSlot={onCreateFlashSlot}
      onLogout={logout}
      ownerName={owner.name}
      publicPageHref={`/${business.slug}`}
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
      onLoadMonthCounts={onLoadMonthCounts}
      pendingRequests={pendingRequests}
      onConfirmRequest={onConfirmRequest}
      onDeclineRequest={onDeclineRequest}
      onApproveCancelRequest={onApproveCancelRequest}
      onDeclineCancelRequest={onDeclineCancelRequest}
      initialManualCustomer={initialManualCustomer ?? undefined}
      onMarkPaid={markPaidAction}
      onUndoPayment={undoPaymentAction}
      packageActions={{
        redeem: redeemPackageAction,
        undo: undoPackageUseAction,
      }}
      manualMethods={MANUAL_METHODS}
    />
  );
}
