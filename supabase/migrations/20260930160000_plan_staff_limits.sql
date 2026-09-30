-- WP-46 · Uppföljning (db-engineer) · Konkreta personalgränser per plan
-- F#: F1/F6. D-037 (docs/decisions/DECISIONS.md): ägarens beslut 2026-09-30.
-- Ersätter no-op-kroppen i private.plan_staff_limit
-- (20260930150300_member_invitations.sql) — samma hook, bara riktiga
-- siffror. `staff_seat_count` räknas nu om till "totalt antal konton i
-- företaget INKLUSIVE ägaren" (ägarens beslut), inte bara personalkonton.
--
-- Gräns: free 1, emprende 1, equipo 3, local 10. free/emprende har redan
-- ägarens eget konto som sin enda "plats" — kan alltså inte bjuda in någon
-- alls (planens WP-46, Ägarens svar punkt 4: "Planen med en medarbetare kan
-- inte bjuda in").
create or replace function private.plan_staff_limit(p_plan public.business_plan)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_plan
    when 'free' then 1
    when 'emprende' then 1
    when 'equipo' then 3
    when 'local' then 10
  end;
$$;

-- "Upptagna platser", omdefinierad (ägarens beslut): TOTALT antal konton i
-- företaget, ägaren inräknad — inte bara personal. `role in ('owner',
-- 'staff')`: `vendor` (WP-35) och `admin` (F19, reserverad platformsroll)
-- räknas medvetet INTE in, de är inte "medarbetarplatser" i den här
-- bemärkelsen. Väntande, icke-utgångna, icke-återkallade OCH icke-
-- accepterade inbjudningar räknas också (en accepterad inbjudan har redan
-- blivit en `memberships`-rad och skulle annars räknas två gånger).
create or replace function private.staff_seat_count(b uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select (
    (select count(*) from public.memberships
      where business_id = b and role in ('owner', 'staff'))
    + (select count(*) from public.member_invitations
        where business_id = b and accepted_at is null and revoked_at is null and expires_at > now())
  )::integer;
$$;
