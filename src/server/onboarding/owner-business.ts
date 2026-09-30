import "server-only";

/**
 * Den inloggades företag och medlemskap (WP-15, WP-46 steg 3). Styr /app och
 * /app/onboardings redirect-logik och ger varje sida/server action
 * `businessId` + `Member` (roll, flaggor, `staffId`) — aldrig från klienten.
 *
 * WP-46: "current member" i stället för "ägarens företag": en inbjuden
 * profesional (`role = 'staff'`) har också ett företag. Onboarding gäller
 * bara användare UTAN medlemskap. Ett konto har högst ett företag i v1
 * (Ägarens svar punkt 1); finns ändå flera rader väljs ägarskapet först.
 *
 * Går via `withOwnerTx` (D-019), inte `@supabase/ssr` — den klienten är bara
 * för auth. `m.user_id = $1` behövs: RLS låter ägaren se ALLA medlemskap i
 * sitt företag (policyn "select own or owner").
 */
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
};

export async function getCurrentMember(
  userId: string,
): Promise<CurrentMember | null> {
  return withOwnerTx(userId, async (q) => {
    const r = await q.query<{
      id: string;
      slug: string;
      name: string;
      comuna: string;
      category: string;
    }>(
      `select b.id, b.slug, b.name, b.comuna, b.category
         from public.memberships m
         join public.businesses b on b.id = m.business_id
        where m.user_id = $1
        order by (m.role = 'owner') desc, m.created_at
        limit 1`,
      [userId],
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
    };
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
