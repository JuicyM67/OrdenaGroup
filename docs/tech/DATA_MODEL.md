# Datamodell (utkast)

> Utgångspunkt för `db-engineer`. Detaljer får förbättras, men invarianterna (markerade **INV**) får inte tas bort utan ett nytt beslut i DECISIONS.md.

## Konventioner
- `id uuid primary key default gen_random_uuid()`, `created_at timestamptz default now()`, `updated_at` via trigger.
- Alla tenant-tabeller har `business_id uuid not null references businesses on delete cascade` + index.
- Belopp: `integer` CLP, `check (x >= 0)`. Tider: `timestamptz` / `tstzrange`. Telefon: `text` E.164 med check `^\+[1-9][0-9]{7,14}$`.
- Enums som Postgres-typer.

## Tabeller

```sql
-- Företag och åtkomst
businesses (id, slug unique, name, comuna, category, timezone default 'America/Santiago',
  phone, address, logo_url, accent_color,
  min_notice_minutes default 60, max_days_ahead default 30,
  cancel_window_hours default 3, slot_interval_minutes default 15,
  waitlist_mode enum('sequential','broadcast') default 'sequential',
  plan enum('free','emprende','equipo','local') default 'free',
  trial_ends_at, status enum('active','frozen') default 'active')

memberships (business_id, user_id references auth.users, role enum('owner','staff','vendor','admin'),
  staff_id null references staff, primary key (business_id, user_id))

-- Katalog och schema
staff (id, business_id, name, color, active, sort)
services (id, business_id, name, category, duration_min check > 0, price_clp,
  buffer_after_min default 0, deposit_kind enum('none','fixed','percent'), deposit_value,
  remind_after_weeks null, active, sort)
staff_services (staff_id, service_id, primary key)
business_hours (business_id, weekday 1-7 (ISO, 1 = lunes), start_time, end_time)   -- flera rader per dag tillåts
staff_hours (staff_id, weekday, start_time, end_time)                            -- snävar in, vidgar aldrig
time_off (id, business_id, staff_id null = hela företaget, period tstzrange, kind enum('block','lunch','vacation','holiday'), note)

-- Kunder
customers (id, business_id, phone_e164, name, email null, notes,
  consent_terms_at, consent_marketing_at null, consent_version, consent_channel,
  visits_count default 0, no_show_count default 0, last_visit_at, anonymized_at null,
  unique (business_id, phone_e164))

-- Bokningar
bookings (id, business_id, staff_id, service_id, customer_id,
  period tstzrange not null,              -- själva tjänsten
  blocked tstzrange not null,             -- period + buffert, används av constraint
  status enum('pending_payment','confirmed','completed','no_show','cancelled'),
  source enum('web','manual','waitlist','flash'),
  price_clp, discount_clp default 0, deposit_clp default 0,
  manage_token text unique,               -- kundens länk, slumpad 32 byte, base64url
  pending_expires_at null, cancelled_at, cancel_reason, reminded_at, confirmed_by_customer_at,
  notes)

-- INV-1: ingen dubbelbokning av samma profesional
alter table bookings add constraint no_overlap
  exclude using gist (staff_id with =, blocked with &&)
  where (status in ('pending_payment','confirmed','completed'));

payments (id, business_id, booking_id, kind enum('deposit','balance','full'),
  method enum('cash','card_terminal','transfer','mercadopago'),
  amount_clp, status enum('pending','approved','rejected','refunded'),
  provider_ref null, paid_at)

-- Unika funktioner
waitlist_entries (id, business_id, customer_id, service_id, staff_id null, date date,
  status enum('waiting','offered','booked','expired','cancelled'), offered_at, offer_expires_at, position)
flash_slots (id, business_id, staff_id, service_id, period tstzrange, discount_pct check 5..70,
  status enum('open','booked','expired','cancelled'), booking_id null)
loyalty_programs (business_id primary key, every_n_visits, reward_text, active)
loyalty_cards (business_id, customer_id, stamps, rewards_redeemed, primary key (business_id, customer_id))

-- Meddelanden
message_outbox (id, business_id, booking_id null, to_phone, channel enum('whatsapp','email'),
  template, payload jsonb, category enum('utility','marketing','service'),
  status enum('queued','sending','sent','delivered','read','failed','dead'),
  attempts default 0, next_attempt_at, provider_message_id, error, dedupe_key unique)
inbound_events (provider, event_id, payload jsonb, received_at, primary key (provider, event_id))  -- INV-2: idempotens

-- Integrationer och abonnemang
integrations (business_id, provider enum('mercadopago'), account_id, access_token_enc, refresh_token_enc, expires_at)
subscriptions (business_id, plan, status enum('trialing','active','past_due','cancelled'), provider, provider_ref, current_period_end)
usage_monthly (business_id, month date, whatsapp_utility, whatsapp_marketing, primary key)

-- Försäljning och drift
vendors (id, user_id, name, phone, commission_pct)
vendor_businesses (vendor_id, business_id, signed_at, primary key)
audit_log (id, business_id null, actor_user_id null, action, entity, entity_id, meta jsonb, at)
```

## RLS-mönster

```sql
create function is_member(b uuid, roles text[] default null) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships m
    where m.business_id = b and m.user_id = auth.uid()
    and (roles is null or m.role::text = any(roles)));
$$;

alter table services enable row level security;
create policy "members read" on services for select using (is_member(business_id));
create policy "owners write" on services for all using (is_member(business_id, array['owner','admin']))
  with check (is_member(business_id, array['owner','admin']));
```

- **INV-3:** RLS på **varje** tabell, **inga** policies för `anon`. Den publika bokningssidan läser via servern (Server Components/Actions med service role och explicit `business_id` från slug) och exponerar bara publika fält.
- **INV-4:** en pgTAP-test per tabell bevisar att företag A inte kan läsa eller skriva B:s rader.
- Kunden (utan konto) når sin bokning bara via `manage_token`, i servern.
