-- WP-83 (D-068): planval i "Comenzar" utan betalning i appen.
--
-- Chile har ingen planbetalning i appen (D-061/D-062): betalda planer
-- aktiveras av plattformsadmin ("Facturación manual"). När en ny ägare väljer
-- en betald plan i onboarding sparas önskemålet här, och teamet kontaktar
-- företaget och aktiverar planen (med provperiod via `plan_override_until`)
-- i /admin. Företaget fortsätter på `free` tills dess.
--
-- Ingen update-grant till authenticated: servern skriver efter egen
-- ägarkontroll som service_role (src/server/plans/request.ts). Medlemmar kan
-- läsa värdet via den befintliga tabell-granten `select` (RLS: egna företag).
alter table public.businesses
  add column plan_requested public.business_plan
    constraint businesses_plan_requested_check
      check (plan_requested is null or plan_requested in ('emprende', 'equipo', 'local')),
  add column plan_requested_at timestamptz,
  add constraint businesses_plan_requested_at_check
    check ((plan_requested is null) = (plan_requested_at is null));

comment on column public.businesses.plan_requested is
  'WP-83 (D-068): betald plan som ägaren bad om i onboarding (ingen betalning '
  'i appen). Teamet aktiverar planen i /admin. Null = inget önskemål.';
comment on column public.businesses.plan_requested_at is
  'WP-83 (D-068): när önskemålet i plan_requested sparades.';
