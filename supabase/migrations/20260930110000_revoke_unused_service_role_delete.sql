-- WP-26 · Säkerhetsgranskning, punkt 6 · service_role: minsta möjliga DELETE
-- F#: F12.
--
-- Fynd: `service_role` hade DELETE på i princip varje tabell i `public`,
-- verifierat direkt mot databasen (`has_table_privilege('service_role',
-- oid, 'DELETE')`). Två källor:
--   1. Den lokala plattformens defaultprivilegier ger `service_role` fullt
--      CRUD på en NY tabell automatiskt (samma gotcha som D-014-
--      korrigendumet för anon/authenticated, se DATA_MODEL.md och
--      20260930080000_consent_events.sql) — INTE ett medvetet val.
--   2. `payments` hade dessutom ett explicit `grant ... delete ...` i en
--      tidig version av den migrationen (rättat innan den mergades till
--      `select, insert, update`, se 20260927100400_bookings_payments.sql),
--      men grant nummer 1 gav ändå DELETE bakvägen — kommentaren "ingen
--      delete-grant" i supabase/tests/050_payments.test.sql/DATA_MODEL.md
--      stämde alltså inte i praktiken förrän den här migrationen.
--
-- Verifierat med grep (`grep -rn "delete from public\." src/server
-- src/app/api`) vilka tabeller `service_role`-kontext (`withServiceTx`,
-- INTE `security definer`-funktioner som `run_retention`/
-- `delete_owner_account`, som kör som `postgres` oavsett grants) FAKTISKT
-- raderar direkt:
--   - public.bookings      (src/server/privacy/business.ts, purgeBusiness)
--   - public.businesses    (src/server/privacy/business.ts, purgeBusiness)
--   - public.customer_answers (src/server/privacy/customer.ts, anonymizeCustomer)
--   - public.booking_answers  (src/server/privacy/customer.ts, anonymizeCustomer)
-- De fyra behåller sitt DELETE. Alla andra tabeller nedan raderas bara via
-- KASKAD (som aldrig kräver grants, oavsett roll) eller inte alls av
-- service_role — DELETE tas bort (minsta möjliga rättighet).
revoke delete on public.staff from service_role;
revoke delete on public.services from service_role;
revoke delete on public.staff_services from service_role;
revoke delete on public.business_hours from service_role;
revoke delete on public.staff_hours from service_role;
revoke delete on public.time_off from service_role;
revoke delete on public.memberships from service_role;
revoke delete on public.customers from service_role;
revoke delete on public.business_images from service_role;
revoke delete on public.service_categories from service_role;
revoke delete on public.booking_questions from service_role;
revoke delete on public.booking_question_targets from service_role;
-- Ingen TS-kod raderar direkt (`private.run_retention()` kör som security
-- definer, bypassar grants). Ett framtida städjobb som vill radera
-- `message_outbox` direkt (inte via `run_retention()`) måste re-granta detta
-- i en egen, ny migration — dokumenterar avsiktligt VARFÖR, inte bara ANTAR.
revoke delete on public.message_outbox from service_role;
-- Punkt 6, explicit: kassahistorik ska aldrig kunna försvinna, oavsett roll.
revoke delete on public.payments from service_role;
