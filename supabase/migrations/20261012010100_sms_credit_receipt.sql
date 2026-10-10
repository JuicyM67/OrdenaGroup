-- WP-76 · SMS-krediter (D-053): länk till Stripes kvitto i historiken.
-- Sätts av servern när köpet krediteras (hämtat från Stripes API, aldrig från
-- klienten). Ingen persondata (Stripes kvittosida kräver länkens hemliga del).
alter table public.sms_credit_purchases add column receipt_url text;
alter table public.sms_credit_purchases
  add constraint sms_credit_purchases_receipt_url_check
    check (receipt_url is null or receipt_url like 'https://%');
