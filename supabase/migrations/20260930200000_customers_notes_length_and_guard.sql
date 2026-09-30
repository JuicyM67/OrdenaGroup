-- WP-24 · Clientes + Caja (db-engineer) · `customers.notes`: gräns + vem får ändra
-- F#: F6/F9/F10. Plan: docs/tasks/plans/WP-24-clientes-caja.md, "Clientes".
--
-- `customers.notes` finns redan (20260927100300_customers.sql) men saknade
-- en längdgräns och en egen skrivspärr. Uppdraget: högst 1000 tecken, och
-- bara ägaren eller `can_manage_all_bookings` får ÄNDRA fältet (D-034),
-- trots att `can_manage_own_bookings` räcker för resten av kundraden sedan
-- 20260930170000_permission_rls_gaps.sql (en profesional med bara sin egen
-- agenda ska kunna skapa/uppdatera en kund för att boka/markera Llegó/No
-- vino, men inte skriva känsliga anteckningar om henne).
--
-- Samma mönster som `private.customers_guard_consent` (S5): en RLS-policys
-- `with check` ser hela den NYA raden, inte skillnaden mot den gamla, så den
-- kan inte uttrycka "bara notes kräver den hårdare regeln, resten av raden
-- följer den vanliga policyn". En trigger kan jämföra NEW mot OLD.

-- 1. Längdgräns (samma varning i UI:t som bokningsanteckningar, ui-engineer).
alter table public.customers
  add constraint customers_notes_length_check check (notes is null or char_length(notes) <= 1000);

-- 2. Skrivspärr på fältet notes specifikt.
-- `security invoker` räcker (ingen förhöjd rättighet krävs: `private.has_perm`
-- är redan `security definer` och gör sin egen kontroll av auth.uid()).
-- Bara `authenticated` berörs (samma `current_user`-kortslutning som
-- `customers_guard_consent`) — service_role/postgres (import, WP-26-radering,
-- seed) är oförändrade.
create function private.customers_guard_notes()
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
    if new.notes is not null and not private.has_perm(new.business_id, 'can_manage_all_bookings') then
      raise exception 'No tienes permiso para escribir notas de este cliente' using errcode = '42501';
    end if;
    return new;
  end if;

  -- UPDATE: bara bry sig om notes faktiskt ändras (samma "vanliga fallet
  -- ska inte nå längre än hit"-princip som customers_guard_consent).
  if new.notes is distinct from old.notes
     and not private.has_perm(new.business_id, 'can_manage_all_bookings') then
    raise exception 'No tienes permiso para escribir notas de este cliente' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger customers_guard_notes
  before insert or update on public.customers
  for each row execute function private.customers_guard_notes();
