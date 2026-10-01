-- WP-31 · Erbjudanden (kampanjer) · Säkerhetsgranskning (db-engineer) ·
-- Skrivningar bara via service_role
-- F#: F14. Plan: docs/tasks/plans/WP-31-utskick.md.
--
-- `campaigns`/`campaign_recipients` fick vid sin ursprungsmigration
-- (20261001120000) ett brett `grant select, insert, update, delete ... to
-- authenticated` + en "for all"-RLS-policy (`private.has_perm(business_id,
-- 'can_manage_all_bookings')`) — samma mönster som flera andra tabeller.
-- Men den RIKTIGA skrivvägen för båda tabellerna är alltid
-- `src/server/campaigns/send.ts` (`sendCampaign`/`writeCampaignAsSystem`,
-- integrations-engineer): ägarens app kontrollerar behörigheten själv i en
-- `withOwnerTx`-läsning och skriver sedan i en EGEN `withServiceTx`
-- (service_role krävs ändå för `message_outbox`-raderna i samma
-- transaktion, D-029). `authenticated` ska därför ALDRIG kunna skriva i
-- de här två tabellerna direkt — bara läsa (historik, `/app/clientes/
-- utskick`). Oförändrat: service_role har fortfarande fullt CRUD.
revoke insert, update, delete on public.campaigns from authenticated;
revoke insert, update, delete on public.campaign_recipients from authenticated;
