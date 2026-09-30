-- WP-26 · Säkerhetsgranskning, punkt 1 · Ångra radering hävde annan frysning
-- F#: F12. Fynd: `requestBusinessDeletion` satte alltid `status = 'frozen'`
-- och `cancelBusinessDeletion` återställde alltid `status = 'active'` — om
-- ett företag redan var `frozen` av en ANNAN anledning (t.ex. framtida
-- billing-frysning, WP-34) innan ägaren begärde radering, skulle en ångrad
-- radering felaktigt HÄVA den andra frysningen.
--
-- Fix: spara det tidigare `status`-värdet på begäran, återställ EXAKT det
-- (inte ett hårdkodat 'active') vid ångrande. `status_before_deletion_request`
-- är bara satt medan `deletion_requested_at` är satt (samma livscykel).
alter table public.businesses
  add column status_before_deletion_request public.business_status;

-- Samma styrning som `deletion_requested_at` (B2/S2): bara service_role
-- ändrar den, `authenticated` har ingen grant (varken i B2-kolumnlistan
-- eller separat).
