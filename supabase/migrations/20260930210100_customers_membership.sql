-- WP-54 · Medlemmar (db-engineer) · `customers.is_member` / `member_since`
-- F#: F9/F6 (ägarens plan, 2026-09-30). Plan: docs/tasks/plans/WP-54-medlemmar.md.
-- INV: INV-3 (RLS/anon-försvar på djupet), INV-4 (tenant-isolering, oförändrad).
--
-- Kundkortets kryssruta "Medlem": `is_member` (default false, aldrig
-- förkryssad av misstag eftersom det är en explicit handling från ägaren/
-- profesionalen, inte kundens samtycke) och `member_since` (satt av UI:t när
-- kryssrutan slås på, nullable). Ingen egen check mellan de två kolumnerna
-- (t.ex. "member_since kräver is_member = true") — uppdraget specificerar
-- inte den regeln, och UI:t (ui-engineer) sätter båda tillsammans.
alter table public.customers
  add column is_member boolean not null default false,
  add column member_since timestamptz null;

-- Skrivspärr: samma nivå som `notes` (D-034, can_manage_all_bookings eller
-- ägare — has_perm kortsluter alltid till true för role = 'owner', se
-- 20260930150000). Utökar `private.customers_guard_notes()` i stället för
-- en ny trigger (samma mönster som `private.customers_guard_consent()`
-- utökades i 20260928090000: `create or replace function`, samma
-- triggernamn/villkor, bara fler fält bevakade). En profesional med bara
-- `can_manage_own_bookings` ska kunna skapa/uppdatera en kund för att boka
-- eller markera Llegó/No vino (20260930170000), men inte göra henne till
-- medlem eller skriva känsliga anteckningar om henne.
create or replace function private.customers_guard_notes()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if (new.notes is not null or new.is_member or new.member_since is not null)
       and not private.has_perm(new.business_id, 'can_manage_all_bookings') then
      raise exception 'No tienes permiso para escribir notas o membresía de este cliente' using errcode = '42501';
    end if;
    return new;
  end if;

  -- UPDATE: bara bry sig om notes/is_member/member_since faktiskt ändras
  -- (samma "vanliga fallet ska inte nå längre än hit"-princip som innan).
  if (new.notes is distinct from old.notes
      or new.is_member is distinct from old.is_member
      or new.member_since is distinct from old.member_since)
     and not private.has_perm(new.business_id, 'can_manage_all_bookings') then
    raise exception 'No tienes permiso para escribir notas o membresía de este cliente' using errcode = '42501';
  end if;

  return new;
end;
$$;

-- `(business_id, phone_e164)` har redan ett index (unique constraint sedan
-- 20260927100300_customers.sql) — ingen ny migration behövs för det.
