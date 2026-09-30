import "server-only";

/**
 * WP-46 steg 3: den inloggades medlemskap för appens server actions och
 * loaders i `src/server/owner/`. Varje mutation kör i `withOwnerTx`
 * (`authenticated`, RLS gäller) OCH kontrollerar samma flagga i TypeScript
 * via `requireMemberPerm` → `requirePerm` (`src/server/db/permissions.ts`),
 * så att UI:t får en typad kod i stället för en tyst nollrads-UPDATE.
 *
 * Felkoder (kontraktet mot UI, `MutationResult.code`):
 * - `"unauthorized"`: inte medlem i företaget alls (oförändrat, som förut).
 * - `"forbidden"`: medlem, men flaggan saknas (text: `errores.permiso.*`).
 */
import {
  hasPerm,
  loadMember,
  PERMS,
  PermissionDeniedError,
  requirePerm,
  type Member,
  type MemberRole,
  type Perm,
} from "@/server/db/permissions";
import type { Queryable } from "@/server/db/pool";

export type { Member, MemberRole, Perm };
export { PermissionDeniedError };

/** Kastas av `requireMemberPerm` när personen inte är medlem i företaget. */
export class NotMemberError extends Error {
  constructor() {
    super("not a member");
    this.name = "NotMemberError";
  }
}

/** Kastas av `requireOwnerMember` när medlemmen inte är ägaren. */
export class OwnerRequiredError extends Error {
  constructor() {
    super("owner required");
    this.name = "OwnerRequiredError";
  }
}

/**
 * Vad UI:t behöver för att dölja knappar och sektioner. `perms` är de
 * EFFEKTIVA behörigheterna: för `owner` alltid `true` (samma kortslutning
 * som `hasPerm`/`private.has_perm`), för `vendor`/`admin` alltid `false`.
 */
export type MemberView = {
  /** `null` = inte medlem (loaders svarar då med tom data via RLS). */
  role: MemberRole | null;
  /** Personalraden kontot är kopplat till (`null` för ägaren). */
  staffId: string | null;
  perms: Record<Perm, boolean>;
};

export function memberView(m: Member | null): MemberView {
  const perms = {} as Record<Perm, boolean>;
  for (const p of PERMS) perms[p] = hasPerm(m, p);
  return { role: m?.role ?? null, staffId: m?.staffId ?? null, perms };
}

/**
 * Läser medlemskapet i anroparens transaktion och kräver `perm`. Kastar
 * `NotMemberError` (→ `"unauthorized"`) eller `PermissionDeniedError`
 * (→ `"forbidden"`); fånga med `authzCode`.
 */
export async function requireMemberPerm(
  q: Queryable,
  userId: string,
  businessId: string,
  perm: Perm,
): Promise<Member> {
  const m = await loadMember(q, userId, businessId);
  if (!m) throw new NotMemberError();
  requirePerm(m, perm);
  return m;
}

/** Bara ägaren (export, radering, anonymisering, medlemskap). */
export async function requireOwnerMember(
  q: Queryable,
  userId: string,
  businessId: string,
): Promise<Member> {
  const m = await loadMember(q, userId, businessId);
  if (!m) throw new NotMemberError();
  if (!isOwner(m)) throw new OwnerRequiredError();
  return m;
}

export function isOwner(m: Member | null): boolean {
  return m?.role === "owner";
}

/** Medlemskapet (vilken roll som helst) eller `NotMemberError`. För loaders. */
export async function requireMember(
  q: Queryable,
  userId: string,
  businessId: string,
): Promise<Member> {
  const m = await loadMember(q, userId, businessId);
  if (!m) throw new NotMemberError();
  return m;
}

export type AuthzCode = "unauthorized" | "forbidden";

/** `NotMemberError`/`PermissionDeniedError` → felkod, annars `undefined`. */
export function authzCode(e: unknown): AuthzCode | undefined {
  if (e instanceof NotMemberError) return "unauthorized";
  if (e instanceof PermissionDeniedError) return "forbidden";
  if (e instanceof OwnerRequiredError) return "forbidden";
  return undefined;
}
