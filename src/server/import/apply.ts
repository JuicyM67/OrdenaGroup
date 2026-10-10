import "server-only";

/**
 * WP-66: "Importar lo seleccionado" i Ajustes. Allt i EN `withOwnerTx`
 * (RLS gäller) med samma scheman och insert-hjälpare som Ajustes
 * (`ajustesServiceInputSchema`, `insertServiceIn`, `insertStaffIn`,
 * `replaceBusinessHoursIn`, `businessProfileInputSchema`) — ingen egen
 * valideringslogik. Ett ogiltigt värde avbryter hela importen (ingenting
 * skrivs) och returnerar felkoden + vilken rad det gällde.
 *
 * Dubbletter (samma tjänste-/personalnamn, skiftlägesokänsligt, aktiva som
 * inaktiva) uppdateras aldrig tyst — de hoppas över och rapporteras.
 * Personal blir bara `staff`-rader (inga konton/inbjudningar), så
 * personalgränsen per plan (D-037, räknar konton) påverkas inte — samma regel
 * som Ajustes → Equipo. Nya medarbetare kopplas till de importerade tjänsterna.
 */
import type { Queryable } from "@/server/db/pool";
import { withOwnerTx } from "@/server/db/tx";
import {
  businessProfileInputSchema,
  staffTitleSchema,
} from "@/lib/validation/profile";
import {
  importSelectionSchema,
  type ImportApplyResult,
} from "@/lib/validation/import";
import {
  insertServiceIn,
  insertStaffIn,
  mapDbError,
  replaceBusinessHoursIn,
} from "@/server/owner/ajustes";
import {
  ajustesHoursInputSchema,
  ajustesServiceInputSchema,
  ajustesStaffInputSchema,
} from "@/server/owner/ajustes-schemas";
import { requireMemberPerm, requireOwnerMember } from "@/server/owner/member";

import { normalizeName } from "./preview";

class ImportRowError extends Error {
  constructor(
    readonly code: string,
    readonly item?: string,
  ) {
    super(code);
  }
}

async function categoryIdIn(
  q: Queryable,
  businessId: string,
  name: string,
  cache: Map<string, string>,
  created: { n: number },
): Promise<string | null> {
  const clean = name.trim().slice(0, 60);
  if (!clean) return null;
  const key = normalizeName(clean);
  const hit = cache.get(key);
  if (hit) return hit;
  const existing = await q.query<{ id: string; name: string }>(
    `select id, name from public.service_categories where business_id = $1`,
    [businessId],
  );
  for (const c of existing.rows) cache.set(normalizeName(c.name), c.id);
  const again = cache.get(key);
  if (again) return again;
  const r = await q.query<{ id: string }>(
    `insert into public.service_categories (business_id, name, sort)
     select $1, $2, coalesce(max(sort), 0) + 1 from public.service_categories where business_id = $1
     returning id`,
    [businessId, clean],
  );
  const id = r.rows[0]!.id;
  cache.set(key, id);
  created.n++;
  return id;
}

export async function applyImport(
  userId: string,
  businessId: string,
  rawInput: unknown,
): Promise<ImportApplyResult> {
  const parsed = importSelectionSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  const sel = parsed.data;

  try {
    return await withOwnerTx<ImportApplyResult>(userId, async (q) => {
      // Importen rör profil, katalog och team på en gång: bara ägaren.
      await requireOwnerMember(q, userId, businessId);
      // Profil + öppettider
      const profileKeys = Object.keys(sel.profile);
      if (profileKeys.length > 0 || sel.hours) {
        await requireMemberPerm(q, userId, businessId, "can_edit_settings");
      }
      if (profileKeys.length > 0) {
        const cur = await q.query<{
          about: string | null;
          instagram: string | null;
          tiktok: string | null;
          facebook: string | null;
          address: string | null;
          phone: string | null;
        }>(
          `select about, instagram, tiktok, facebook, address, phone
             from public.businesses where id = $1 for update`,
          [businessId],
        );
        const row = cur.rows[0];
        if (!row) return { ok: false, code: "unauthorized" };
        const merged = businessProfileInputSchema.safeParse({
          about: sel.profile.about ?? row.about ?? "",
          instagram: sel.profile.instagram ?? row.instagram ?? "",
          tiktok: sel.profile.tiktok ?? row.tiktok ?? "",
          facebook: sel.profile.facebook ?? row.facebook ?? "",
          address: sel.profile.address ?? row.address ?? "",
          phone: sel.profile.phone ?? row.phone ?? "",
        });
        if (!merged.success) {
          throw new ImportRowError(
            merged.error.issues[0]?.message ?? "invalid_input",
          );
        }
        const p = merged.data;
        await q.query(
          `update public.businesses
              set about = $1, instagram = $2, tiktok = $3, facebook = $4, address = $5, phone = $6
            where id = $7`,
          [
            p.about,
            p.instagram,
            p.tiktok,
            p.facebook,
            p.address,
            p.phone,
            businessId,
          ],
        );
      }
      if (sel.hours) {
        const hours = ajustesHoursInputSchema.safeParse(
          sel.hours.map((h) =>
            h.open
              ? h
              : {
                  weekday: h.weekday,
                  open: false,
                  start: undefined,
                  end: undefined,
                },
          ),
        );
        if (!hours.success) {
          throw new ImportRowError(
            hours.error.issues[0]?.message ?? "invalid_input",
          );
        }
        const r = await replaceBusinessHoursIn(q, businessId, hours.data);
        if (!r.ok) return r;
      }

      // Tjänster (+ kategorier)
      const skippedServices: string[] = [];
      const newServiceIds: string[] = [];
      const createdCategories = { n: 0 };
      if (sel.services.length > 0) {
        await requireMemberPerm(q, userId, businessId, "can_edit_catalog");
        const existing = await q.query<{ name: string }>(
          `select name from public.services where business_id = $1`,
          [businessId],
        );
        const taken = new Set(existing.rows.map((s) => normalizeName(s.name)));
        const catCache = new Map<string, string>();
        for (const s of sel.services) {
          const key = normalizeName(s.name);
          if (taken.has(key)) {
            skippedServices.push(s.name.trim());
            continue;
          }
          const input = ajustesServiceInputSchema.safeParse({
            name: s.name,
            durationMin: s.durationMin,
            priceClp: s.price,
            bufferAfterMin: 0,
            description: s.description,
          });
          if (!input.success) {
            throw new ImportRowError(
              input.error.issues[0]?.message ?? "invalid_input",
              s.name,
            );
          }
          const id = await insertServiceIn(q, businessId, input.data);
          if (!id) return { ok: false, code: "unauthorized" };
          taken.add(key);
          newServiceIds.push(id);
          const catId = await categoryIdIn(
            q,
            businessId,
            s.category,
            catCache,
            createdCategories,
          );
          if (catId) {
            await q.query(
              `update public.services set category_id = $3 where business_id = $1 and id = $2`,
              [businessId, id, catId],
            );
          }
        }
      }

      // Personal
      const skippedStaff: string[] = [];
      let createdStaff = 0;
      if (sel.staff.length > 0) {
        await requireMemberPerm(q, userId, businessId, "can_manage_team");
        const existing = await q.query<{ name: string }>(
          `select name from public.staff where business_id = $1`,
          [businessId],
        );
        const taken = new Set(existing.rows.map((s) => normalizeName(s.name)));
        for (const st of sel.staff) {
          const key = normalizeName(st.name);
          if (taken.has(key)) {
            skippedStaff.push(st.name.trim());
            continue;
          }
          const input = ajustesStaffInputSchema.safeParse({
            name: st.name,
            serviceIds: newServiceIds,
          });
          const title = staffTitleSchema.safeParse(st.title);
          if (!input.success || !title.success) {
            const issue = !input.success
              ? input.error.issues[0]?.message
              : !title.success
                ? title.error.issues[0]?.message
                : undefined;
            throw new ImportRowError(issue ?? "invalid_input", st.name);
          }
          const id = await insertStaffIn(q, businessId, input.data);
          if (!id) return { ok: false, code: "unauthorized" };
          taken.add(key);
          createdStaff++;
          if (title.data) {
            await q.query(
              `update public.staff set title = $3 where business_id = $1 and id = $2`,
              [businessId, id, title.data],
            );
          }
        }
      }

      return {
        ok: true,
        created: {
          services: newServiceIds.length,
          staff: createdStaff,
          categories: createdCategories.n,
        },
        skipped: { services: skippedServices, staff: skippedStaff },
      };
    });
  } catch (e) {
    if (e instanceof ImportRowError) {
      return e.item
        ? { ok: false, code: e.code, item: e.item }
        : { ok: false, code: e.code };
    }
    return { ok: false, code: mapDbError(e) };
  }
}
