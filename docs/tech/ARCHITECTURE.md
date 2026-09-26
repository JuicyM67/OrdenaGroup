# Arkitektur

## Stack

| Lager | Val |
|---|---|
| Webb + backend | **Next.js (App Router) + TypeScript strict**, Server Actions och Route Handlers. Inget separat backend-lager. |
| Stil | **Tailwind CSS v4** med tokens i `src/styles/tokens.css` |
| UI-primitiver | Radix via shadcn/ui (Popover, Dialog, Checkbox, Tabs, Select), **helt omstylade till tokens** |
| Ikoner / typsnitt | `lucide-react`, `next/font` (Bricolage Grotesque, Plus Jakarta Sans) |
| Databas / auth / lagring | **Supabase** (Postgres 15+, Auth, Storage), region `sa-east-1` |
| DB-åtkomst | `@supabase/ssr` för auth; SQL-migrationer i `supabase/migrations/`; genererade typer i `src/types/database.ts` |
| Validering | Zod, delad mellan klient och server |
| Datum | `date-fns` + `date-fns-tz`, all lagring i UTC, allt resonerande i företagets tidszon |
| Jobb | Tabell `message_outbox` + cron varje minut (Supabase `pg_cron` → skyddad route `/api/cron/*`) |
| Meddelanden | Meta WhatsApp Cloud API (direkt), Resend för e-post |
| Betalning | Mercado Pago (OAuth per företag, handpenning), Flow (vårt abonnemang) |
| Hosting | Vercel, region `gru1` (São Paulo) |
| Test | Vitest (enhet + DB mot lokal Supabase), Playwright (e2e + visuell jämförelse), pgTAP för RLS |
| Observabilitet | Sentry, PostHog (utan persondata) |

## Mappstruktur

```
src/
  app/
    (marketing)/              landningssida, priser
    (auth)/login/             magisk länk / WhatsApp-kod
    (app)/app/                ägarens app: inicio, agenda, clientes, caja, flash, ajustes, onboarding
    (vendor)/vendedor/        säljarvy (fas 2)
    (admin)/admin/            intern konsol (fas 2)
    [slug]/                   publik bokningssida
    r/[token]/                kundens egen länk: se, flytta, avboka, exportera/radera data
    api/webhooks/whatsapp/    Meta webhook
    api/webhooks/mercadopago/
    api/webhooks/flow/
    api/cron/[job]/           outbox, påminnelser, väntelista-timeout, veckorapport
    api/og/flash/[id]/        story-bild för hora flash (@vercel/og)
    design-lab/[screen]/      bara i dev: skärmar med exempeldata för visuell jämförelse
  components/
    ui/                       generella (Button, Chip, Pill, Card, SegmentedControl …)
    dashboard/ agenda/ booking/ mobile/
  config/brand.ts             produktnamn, domän, supportnummer (ENDA stället)
  lib/
    supabase/                 server-/klient-/admin-klienter
    format/                   clp.ts, dates.ts, phone.ts (E.164 +56), rut.ts
    validation/               zod-scheman
  server/                     domänlogik — importeras aldrig av klientkomponenter
    scheduling/               tillgänglighet, slots, skapa/flytta/avboka
    bookings/  customers/  waitlist/  flash/  loyalty/  reports/
    messaging/                outbox, whatsapp, email, mallar
    payments/                 mercadopago, flow
    billing/                  planer, kvoter, provperiod
    privacy/                  export, anonymisering, samtycken
  styles/tokens.css
  types/database.ts           genererat
supabase/
  migrations/  seed.sql  tests/ (pgTAP)
docs/                         allt som styr bygget
```

## Principer

1. **Servern bestämmer.** Tillgänglighet, priser och rabatter räknas bara på servern och räknas om före varje insert.
2. **Databasen skyddar invarianter.** Exclusion constraint mot dubbelbokning, check constraints på belopp och tider, RLS på varje tabell.
3. **Multi-tenant via `business_id`** på alla tenant-tabeller + RLS via tabellen `memberships`. Service role används bara i `server/` för cron och webhooks, alltid med explicit `business_id`-filter och test som bevisar det.
4. **Allt utgående går via outboxen.** Inga WhatsApp-anrop direkt i requesten. Idempotent, med retry och backoff och `FOR UPDATE SKIP LOCKED`.
5. **Webhooks är idempotenta** (lagra providerns event-id) och verifierar signatur över rå body.
6. **Pengar är heltal i CLP.** Tid i `timestamptz`/`tstzrange`. Telefon i E.164.
7. **Inga hemligheter i klienten.** Tredjepartstokens krypteras (pgsodium/Vault eller AES-GCM med nyckel i env).
8. **Ingen persondata i loggar** (maskera telefon och namn).

## Miljöer

| Miljö | Databas | Syfte |
|---|---|---|
| local | `supabase start` | utveckling, tester |
| preview | Supabase-branch per PR | granskning |
| production | Supabase-projekt `sa-east-1` | skarp drift |

Migrationer körs aldrig mot produktion från en agent. Produktion migreras manuellt efter godkänd PR.

## Flöden (översikt)

**Bokning (kund):** `/[slug]` → hämtar tjänster → `getAvailableSlots(service, staff?, date)` → kunden väljer → `createBooking()` (räknar om tillgänglighet, skapar/uppdaterar customer, sparar samtycken, insert med exclusion constraint) → om handpenning: status `pending_payment` + Mercado Pago-preferens, annars `confirmed` → outbox: bekräftelse → cron: påminnelse 24 h innan.

**Avbokning → väntelista:** status `cancelled` → `waitlist.onSlotFreed()` → erbjud i tur och ordning via outbox → första *Sí* (webhook) → `createBooking(source='waitlist')` → övriga får "ya fue tomada".

**Handpenning:** MP-preferens med företagets token → kunden betalar → webhook (verifierad, idempotent) → `payments` + booking `confirmed` → bekräftelse. Obetald efter 15 min → frigör tiden.
