-- WP-77 (D-058) · Presentkort: nytt betalmetodsvärde `gift_card`.
--
-- `alter type ... add value` kan inte användas i samma transaktion som den
-- körs i (Postgres-begränsning) — egen migrationsfil, samma mönster som
-- 20261011010000_payment_method_add_stripe.sql. Ägarens RLS-policyer på
-- `payments` accepterar fortfarande bara de manuella metoderna, så
-- `gift_card` skrivs bara av servern/databasens funktioner
-- (20261017010100_gift_cards.sql).
alter type public.payment_method add value if not exists 'gift_card' after 'stripe';
