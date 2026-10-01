-- WP-56 · Uppföljning (db-engineer) · `private.bookings_guard_status` och `cancel_requested`
-- F#: avbokning med godkännande. Plan: docs/tasks/plans/WP-56-avbokning.md.
-- Kräver `cancel_requested` (20261001090000) och `status_before_cancel_request`
-- (20261001090100).
--
-- Triggern (20260930150100_permissions_rls.sql) behandlade hittills bara
-- `requested -> cancelled` (neka en bokningsförfrågan) som en lätt handling
-- (can_manage_own_bookings för egen personal ELLER can_manage_all_bookings
-- räcker, ingen can_cancel_bookings krävs). `cancel_requested -> cancelled`
-- hamnade därför i `else`-grenen och krävde felaktigt can_cancel_bookings
-- specifikt — fel, eftersom att GODKÄNNA en avbokningsförfrågan (precis som
-- att neka/bekräfta en vanlig bokningsförfrågan) är en del av den vanliga
-- förfrågningshanteringen, inte en hård avbokning av en redan bekräftad tid
-- (den handlingen är `confirmed/pending_payment -> cancelled` direkt, som
-- även fortsatt kräver can_cancel_bookings via `else`-grenen).
--
-- `cancel_requested -> status_before_cancel_request` (NEKA avbokningen,
-- bokningen återgår till sin tidigare status) träffas INTE av den här
-- triggern alls (den bryr sig bara om övergångar TILL `cancelled`) — den
-- transitionen är redan tillåten av bas-RLS-policyn "write bookings"
-- (can_manage_own_bookings + egen staff_id, eller can_manage_all_bookings)
-- utan någon extra spärr, exakt samma regel som efterfrågas här. Ingen
-- koddel behövs för den delen, bara dokumentationen ovan + pgTAP-beviset i
-- 106_booking_permissions.test.sql.
create or replace function private.bookings_guard_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if new.status = 'cancelled' and old.status <> 'cancelled' then
    if old.status in ('requested', 'cancel_requested') then
      if not (
        private.has_perm(new.business_id, 'can_cancel_bookings')
        or private.has_perm(new.business_id, 'can_manage_all_bookings')
        or (
          private.has_perm(new.business_id, 'can_manage_own_bookings')
          and old.staff_id = private.member_staff_id(new.business_id)
        )
      ) then
        raise exception 'No tienes permiso para rechazar esta solicitud' using errcode = '42501';
      end if;
    else
      if not private.has_perm(new.business_id, 'can_cancel_bookings') then
        raise exception 'No tienes permiso para anular esta reserva' using errcode = '42501';
      end if;
    end if;
  end if;

  return new;
end;
$$;
