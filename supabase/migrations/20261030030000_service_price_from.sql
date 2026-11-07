-- WP-84 (D-069, port av SE WP-93 / D-075) · "Desde"-pris per tjänst: priset är
-- ett lägsta pris ("desde $15.000"). Samma filnamn som i BookingBuddy.
-- `services` har tabellgrants (inte kolumngrants) för authenticated, så
-- ägaren sätter kolumnen via samma RLS-policys som övriga fält. Ingen ny
-- tabell, ingen ny policy.
alter table public.services
  add column price_from boolean not null default false;
