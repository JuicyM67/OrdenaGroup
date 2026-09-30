import "server-only";

/**
 * Onboarding i ett enda skrivsteg (F1, WP-15 slim): företag + tjänster + personal +
 * öppettider skapas i EN transaktion (`withOwnerTx`, D-019) så att `/app` bara ser ett
 * företag som antingen finns helt eller inte alls. `businesses` skapas bara via
 * `create_business()` (D-014) — ingen direkt insert i den tabellen härifrån.
 *
 * `userId` kommer från den verifierade sessionen i anroparens closure (page.tsx), aldrig
 * från klienten (samma mönster som /[slug]/actions.ts).
 */
import { marketConfig } from "@/config/market";
import { LEGAL_VERSION } from "@/i18n/legal/types";
import type { Queryable } from "@/server/db/pool";
import { pgErrorCode } from "@/server/db/errors";
import { withOwnerTx } from "@/server/db/tx";
import { recordConsent } from "@/server/privacy/consent";

import { onboardingInputSchema, type OnboardingInput } from "./schemas";

export type OnboardingResult =
  { ok: true; businessId: string; slug: string } | { ok: false; code: string };

function pgConstraint(e: unknown): string | undefined {
  if (typeof e !== "object" || e === null || !("constraint" in e)) {
    return undefined;
  }
  const v = (e as Record<string, unknown>).constraint;
  return typeof v === "string" ? v : undefined;
}

/** Läser bara SQLSTATE och constraint-namn, aldrig detail/message (kan innehålla värden). */
function mapDbError(e: unknown): string {
  const code = pgErrorCode(e);
  const constraint = pgConstraint(e);
  if (code === "23505" && constraint === "businesses_slug_key") {
    return "business.slug_taken";
  }
  if (code === "23514" && constraint === "businesses_slug_not_reserved") {
    return "business.slug_reserved";
  }
  if (code === "23514" && constraint === "businesses_slug_format") {
    return "business.slug_invalid";
  }
  if (code === "23P01" && constraint === "business_hours_no_overlap") {
    return "hours.business_hours_no_overlap";
  }
  if (code === "23514" && constraint === "business_hours_start_before_end") {
    return "hours.business_hours_start_before_end";
  }
  return "unknown";
}

async function insertBusinessHours(
  q: Queryable,
  businessId: string,
  hours: OnboardingInput["hours"],
): Promise<void> {
  for (const h of hours) {
    if (!h.open || !h.start || !h.end) continue;
    await q.query(
      `insert into public.business_hours (business_id, weekday, start_time, end_time)
       values ($1, $2, $3, $4)`,
      [businessId, h.weekday, h.start, h.end],
    );
  }
}

async function insertServices(
  q: Queryable,
  businessId: string,
  services: OnboardingInput["services"],
): Promise<string[]> {
  const ids: string[] = [];
  for (const [i, s] of services.entries()) {
    const r = await q.query<{ id: string }>(
      `insert into public.services (business_id, name, duration_min, price_clp, sort)
       values ($1, $2, $3, $4, $5) returning id`,
      [businessId, s.name, s.durationMin, s.priceClp, i + 1],
    );
    ids.push(r.rows[0]!.id);
  }
  return ids;
}

async function insertStaff(
  q: Queryable,
  businessId: string,
  staff: OnboardingInput["staff"],
  serviceIds: readonly string[],
): Promise<void> {
  for (const [i, st] of staff.entries()) {
    const r = await q.query<{ id: string }>(
      `insert into public.staff (business_id, name, color, sort)
       values ($1, $2, $3, $4) returning id`,
      // profesionales.colores (es-CL.ts): staff-1 … staff-6, tilldelade i tur och
      // ordning — inget färgval i den här slimmade onboardingen (se rapporten).
      [businessId, st.name, `staff-${(i % 6) + 1}`, i + 1],
    );
    const staffId = r.rows[0]!.id;
    for (const idx of new Set(st.serviceIndexes)) {
      const serviceId = serviceIds[idx];
      // Schemat (onboardingInputSchema) garanterar redan idx < services.length.
      if (!serviceId) continue;
      await q.query(
        `insert into public.staff_services (business_id, staff_id, service_id)
         values ($1, $2, $3)`,
        [businessId, staffId, serviceId],
      );
    }
  }
}

export async function completeOnboarding(
  userId: string,
  rawInput: unknown,
): Promise<OnboardingResult> {
  const parsed = onboardingInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      code: parsed.error.issues[0]?.message ?? "invalid_input",
    };
  }
  const input = parsed.data;

  try {
    return await withOwnerTx(userId, async (q) => {
      // Tidszonen kommer från installationens marknadskonfig (D-025), inte
      // från klienten: `create_business()` tar emot den som en sjätte,
      // servergivna parameter (20260929100000_businesses_timezone_markets.sql).
      const businessRow = await q.query<{ id: string }>(
        "select public.create_business($1, $2, $3, $4, $5, $6) as id",
        [
          input.business.name,
          input.business.slug,
          input.business.comuna,
          input.business.category,
          input.business.phone,
          marketConfig.timeZone,
        ],
      );
      const businessId = businessRow.rows[0]!.id;

      await insertBusinessHours(q, businessId, input.hours);
      const serviceIds = await insertServices(q, businessId, input.services);
      await insertStaff(q, businessId, input.staff, serviceIds);

      // WP-26: villkor + biträdesavtal (schemat kräver `acceptedTerms: true`),
      // i samma transaktion som företaget. `consent_events` tar bara insert
      // från `service_role` (D-019): rollen byts först här, efter att
      // `create_business()` redan verifierat ägaren via `auth.uid()`.
      await q.query("set local role service_role");
      for (const kind of ["owner_terms", "dpa"] as const) {
        await recordConsent(q, {
          businessId,
          subject: "owner",
          kind,
          version: LEGAL_VERSION,
          channel: "web",
          granted: true,
        });
      }

      return { ok: true, businessId, slug: input.business.slug } as const;
    });
  } catch (e) {
    return { ok: false, code: mapDbError(e) };
  }
}
