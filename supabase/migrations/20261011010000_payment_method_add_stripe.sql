-- WP-64 · Stripe Connect · Nytt betalmetodsvärde 'stripe' (SE, kund betalar online).
-- `alter type ... add value` kan inte användas i samma transaktion som värdet
-- skapas (samma mönster som 20260930200100_payment_method_add_swish.sql):
-- egen fil. Ägarens RLS-policyer på `payments` accepterar fortfarande bara de
-- manuella metoderna, så 'stripe'-rader skapas/ändras bara av servern
-- (service role, webhook-hanteraren) — ingen policyändring behövs.
alter type public.payment_method add value 'stripe' after 'swish';
