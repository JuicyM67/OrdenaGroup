import "server-only";

/**
 * Den inloggades företag och medlemskap (WP-15, WP-46 steg 3). Styr /app och
 * /app/onboardings redirect-logik och ger varje sida/server action
 * `businessId` + `Member` (roll, flaggor, `staffId`) — aldrig från klienten.
 *
 * WP-46: "current member" i stället för "ägarens företag": en inbjuden
 * profesional (`role = 'staff'`) har också ett företag. Onboarding gäller
 * bara användare UTAN medlemskap.
 *
 * WP-98 (D-082): ett konto kan ha flera företag (en ägare med flera lokaler,
 * eller personal i två salonger). Vilket som är aktivt väljs i profilmenyn och
 * sparas i cookien `ACTIVE_BUSINESS_COOKIE`; den är bara en önskan — raden
 * måste fortfarande vara kontots eget medlemskap (`m.user_id = $1`).
 *
 * Går via `withOwnerTx` (D-019), inte `@supabase/ssr` — den klienten är bara
 * för auth. `m.user_id = $1` behövs: RLS låter ägaren se ALLA medlemskap i
 * sitt företag (policyn "select own or owner").
 */
import { cookies } from "next/headers";

import { loadMember, type Member } from "@/server/db/permissions";
import { withOwnerTx } from "@/server/db/tx";
import { memberView, type MemberView } from "@/server/owner/member";

export type OwnerBusiness = {
  id: string;
  slug: string;
  name: string;
  /** F19/WP-36: vacío cuando el negocio nació de una invitación de admin
   * (`accept_business_invitation`) y el dueño todavía no completó el
   * onboarding — ver `isOnboardingDraft`. */
  comuna: string;
  category: string;
};

export type CurrentMember = {
  business: OwnerBusiness;
  member: Member;
  /** Effektiva behörigheter för UI:t (dölja knappar/sektioner). */
  view: MemberView;
  /** WP-90 (D-076): satt när en plattformsadmin är inne i modo soporte. */
  support: { until: string } | null;
};

/** WP-98 (D-082): det valda företaget (sätts av `switchBusinessAction` och när
 * onboardingen av ett nytt företag är klar). */
const ACTIVE_BUSINESS_COOKIE = "active_business";

/** Sparar valet. Bara från en server action/route handler, och bara efter att
 * anroparen kontrollerat att kontot är medlem (`isMyBusiness`) eller just
 * skapat/fyllt i företaget. */
export async function setActiveBusinessCookie(
  businessId: string,
): Promise<void> {
  (await cookies()).set(ACTIVE_BUSINESS_COOKIE, businessId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 400 * 24 * 60 * 60,
  });
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Cookiens företags-id, eller null (ingen cookie, ogiltigt värde eller
 * anropat utanför en request, t.ex. i ett test). */
async function preferredBusinessId(): Promise<string | null> {
  try {
    const value = (await cookies()).get(ACTIVE_BUSINESS_COOKIE)?.value;
    return value && UUID_RE.test(value) ? value : null;
  } catch {
    return null;
  }
}

export async function getCurrentMember(
  userId: string,
): Promise<CurrentMember | null> {
  const preferred = await preferredBusinessId();
  return withOwnerTx(userId, async (q) => {
    const r = await q.query<{
      id: string;
      slug: string;
      name: string;
      comuna: string;
      category: string;
      support_until: Date | string | null;
    }>(
      // WP-90 (D-076): ett aktivt supportmedlemskap väljs före adminens
      // eget företag; ett utgånget räknas inte alls.
      // WP-98 (D-082): sedan ett eget utkast från en admin-inbjudan (det nya
      // företaget ska sättas upp först), sedan det valda (cookien), sedan
      // ägarskap före personal, äldst först.
      `select b.id, b.slug, b.name, b.comuna, b.category, m.support_until
         from public.memberships m
         join public.businesses b on b.id = m.business_id
        where m.user_id = $1
          and (m.support_until is null or m.support_until > now())
        order by (m.support_until is not null) desc,
                 (m.role = 'owner' and b.comuna = '' and b.category = '') desc,
                 coalesce(b.id = $2::uuid, false) desc,
                 (m.role = 'owner') desc,
                 m.created_at
        limit 1`,
      [userId, preferred],
    );
    const row = r.rows[0];
    if (!row) return null;
    const member = await loadMember(q, userId, row.id);
    if (!member) return null;
    return {
      business: {
        id: row.id,
        slug: row.slug,
        name: row.name,
        comuna: row.comuna,
        category: row.category,
      },
      member,
      view: memberView(member),
      support: row.support_until
        ? { until: new Date(row.support_until).toISOString() }
        : null,
    };
  });
}

export type MyBusiness = { id: string; name: string };

/** WP-98 (D-082): kontots egna företag (inga supportrader) för väljaren i
 * profilmenyn — ägarskap först, sedan i den ordning de lades till. */
export async function listMyBusinesses(userId: string): Promise<MyBusiness[]> {
  return withOwnerTx(userId, async (q) => {
    const r = await q.query<MyBusiness>(
      `select b.id, b.name
         from public.memberships m
         join public.businesses b on b.id = m.business_id
        where m.user_id = $1 and m.support_until is null
        order by (m.role = 'owner') desc, m.created_at`,
      [userId],
    );
    return r.rows;
  });
}

/** WP-98 (D-082): sant om kontot (inte som support) är medlem i företaget. */
export async function isMyBusiness(
  userId: string,
  businessId: string,
): Promise<boolean> {
  if (!UUID_RE.test(businessId)) return false;
  return withOwnerTx(userId, async (q) => {
    const r = await q.query(
      `select 1 from public.memberships
        where user_id = $1 and business_id = $2 and support_until is null`,
      [userId, businessId],
    );
    return r.rows.length > 0;
  });
}

/** WP-98 (D-082): sant om företaget är kontots eget utkast från en
 * admin-inbjudan (ägare, onboarding inte klar) — `/app/activar/[id]`. */
export async function isMyDraftBusiness(
  userId: string,
  businessId: string,
): Promise<boolean> {
  if (!UUID_RE.test(businessId)) return false;
  return withOwnerTx(userId, async (q) => {
    const r = await q.query(
      `select 1 from public.memberships m
         join public.businesses b on b.id = m.business_id
        where m.user_id = $1 and m.business_id = $2 and m.role = 'owner'
          and m.support_until is null and b.comuna = '' and b.category = ''`,
      [userId, businessId],
    );
    return r.rows.length > 0;
  });
}

/** Bakåtkompatibelt: bara företaget (vilken roll som helst). */
export async function getOwnerBusiness(
  userId: string,
): Promise<OwnerBusiness | null> {
  const current = await getCurrentMember(userId);
  return current ? current.business : null;
}

/** F19/WP-36: un negocio creado por `accept_business_invitation` tiene
 * `comuna`/`category` en blanco a propósito (ver el comentario de esa
 * función en la migración) — el dueño todavía tiene que completar el
 * onboarding contra ESE negocio, no crear uno nuevo. */
export function isOnboardingDraft(business: OwnerBusiness): boolean {
  return business.comuna === "" && business.category === "";
}
