# Staging — steg för steg (WP-05)

Det här dokumentet är till **ägaren**. Ingen agent har eller får nycklar till molnet
(CLAUDE.md, hård regel 8) — allt nedan görs manuellt av en människa, en gång per steg.
Staging är ett separat Supabase-projekt och en separat driftsmiljö från produktion.
Migrationer mot staging körs av GitHub Actions vid push till `main`, aldrig av en agent
lokalt (se `.github/workflows/deploy-staging.yml`).

Se även `docs/tech/ARCHITECTURE.md` ("Miljöer") och `docs/tech/SUPABASE_CONFIG.md` för
vad som gäller lokalt/prod — punkterna nedan är staging-specifika och avviker medvetet
från prod-målen där det är motiverat (t.ex. tillåtna redirect-URL:er).

## a) Skapa Supabase-projektet

1. Gå till [supabase.com/dashboard](https://supabase.com/dashboard) och logga in med
   kontot som äger organisationen för llena.
2. **New project**.
   - **Name:** `OrdenaGroup-staging`
   - **Region:** South America (São Paulo) — motsvarar `sa-east-1`, samma region som
     produktionsmålet och Vercel (`gru1`), för låg latens.
   - **Database password:** generera ett starkt lösenord (t.ex. med lösenordshanteraren)
     och **spara det i lösenordshanteraren direkt** — det behövs igen i steg (c) och visas
     bara en gång.
3. Vänta tills projektet är klart (några minuter).
4. **Project ref** (behövs i steg c): står i URL:en till projektet i dashboarden,
   `https://supabase.com/dashboard/project/<project-ref>`, och även under
   **Project Settings → General → Reference ID**.
5. Skapa en **personlig access token** för dig själv (inte projektet):
   [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
   → **Generate new token**. Ge den ett namn som `llena-staging-ci` så du känner igen den
   om du behöver återkalla den senare. Spara token i lösenordshanteraren — den visas bara
   en gång och det är den som blir `STAGING_SUPABASE_ACCESS_TOKEN` i steg (c).

## b) Supabase-inställningar för staging-projektet

Gör detta i det nya `OrdenaGroup-staging`-projektets dashboard, **innan** du kör
workflowen första gången:

1. **Data API → auto-expose new tables:** stäng av om dashboarden erbjuder alternativet
   (**Project Settings → Data API**). Litar ändå inte ensamt på detta — migrationerna
   innehåller egna `revoke`-satser mot `anon`/`authenticated` (se
   `docs/tech/SUPABASE_CONFIG.md`, samma skydd gäller identiskt i staging).
2. **Auth → URL Configuration:**
   - **Site URL:** Vercel-adressen till staging-deployen (du får den i steg d — kom
     tillbaka hit och uppdatera när den finns, t.ex.
     `https://ordena-group.vercel.app`).
   - **Redirect URLs:** lägg bara till exakta URL:er som faktiskt används
     (t.ex. `https://ordena-group.vercel.app/auth/callback`). **Inga jokertecken**
     (`*`) — samma regel som för prod i `SUPABASE_CONFIG.md`.
3. **Auth → Providers → Email:** slå på **"Confirm email"** (`enable_confirmations = true`),
   samma som prod-målet.
4. **Auth → Settings:** låt **"Allow anonymous sign-ins" vara avstängt** (av är
   standard) — rör den inte. Se motiveringen i `SUPABASE_CONFIG.md` rad
   `auth.enable_anonymous_sign_ins`.
5. Övriga rader i tabellen i `SUPABASE_CONFIG.md` (lösenordskrav, `otp_expiry`,
   SMTP, captcha, SSL-enforcement m.m.) är **prod-mål**, inte krav för staging. Sätt dem
   gärna likadant om det är enkelt, men det blockerar inte staging-lanseringen. Skarpa
   SMTP-uppgifter (Resend) ska ändå aldrig delas mellan miljöer.

## c) GitHub-hemligheter och första körningen

1. I GitHub-repot: **Settings → Secrets and variables → Actions → New repository
   secret**. Lägg in exakt dessa tre (namnen måste matcha `deploy-staging.yml`):
   - `STAGING_SUPABASE_ACCESS_TOKEN` — token från steg (a.5).
   - `STAGING_SUPABASE_DB_PASSWORD` — databaslösenordet från steg (a.2).
   - `STAGING_SUPABASE_PROJECT_REF` — project ref från steg (a.4).
2. Kör workflowen manuellt första gången: **Actions → Deploy staging (Supabase) →
   Run workflow** → gren `main` → sätt **`reseed`** till **`true`** (kryssrutan) → **Run
   workflow**. Det kör alla migrationer i `supabase/migrations/` och laddar
   `supabase/seed.sql` från en tom databas.
3. Om workflowen misslyckas med "Saknade repo-hemligheter …" i det första steget: en
   eller flera av namnen ovan stämmer inte eller saknas — kontrollera stavningen.
4. Vid senare push till `main` som ändrar `supabase/migrations/**` eller
   `supabase/seed.sql` körs workflowen automatiskt, men **utan** reseed (bara nya
   migrationer läggs på, ingen data raderas). Använd `reseed = true` manuellt igen om du
   vill nollställa staging helt (t.ex. för att testdata blivit rörig).

## d) Vercel

1. Gå till [vercel.com](https://vercel.com) och logga in med **GitHub**.
2. **Add New… → Project** → importera repot för llena.
3. **Framework Preset:** Next.js (upptäcks automatiskt).
4. **Environment Variables** (lägg till innan första deploy, eller under **Project
   Settings → Environment Variables** efteråt):
   - `NEXT_PUBLIC_APP_URL` — sätt till den Vercel-URL projektet får (du kan uppdatera
     den efter första deploy när du vet exakt domän).
   - `NEXT_PUBLIC_SUPABASE_URL` — från `OrdenaGroup-staging`-projektet:
     **Project Settings → Data API → Project URL**.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — samma sida, **Project Settings → API Keys** →
     den **publika/anon**-nyckeln (`anon` / `publishable`). **Inte** `service_role` —
     den nyckeln ska inte finnas i Vercel alls just nu (backend-funktioner som
     behöver den byggs i senare arbetspaket).
   - `DESIGN_LAB` = `1` — öppnar `/design-lab` i den här miljön trots att Vercel
     kallar den "production" internt (se punkt 3 nedan och `src/app/design-lab/gate.ts`).
     **Sätt aldrig denna variabel i det framtida riktiga produktions-Vercel-projektet.**
   - Lämna WhatsApp/Mercado Pago/Flow/Resend-variablerna (se `.env.example`) tomma
     tills vidare — tomt betyder fake-providers som bara loggar, aldrig skarpa anrop
     (se `docs/tech/INTEGRATIONS.md`, D-006–D-008).
5. **Kontrollera region:** `vercel.json` i repot sätter redan `{"regions": ["gru1"]}`.
   Verifiera efter första deploy under **Project Settings → Functions → Region** att
   det verkligen står **São Paulo (gru1)**.
6. **Deployment Protection:** slå på **Vercel Authentication** (Project Settings →
   Deployment Protection) så att staging inte är en öppen, publik sajt — bara du
   (och de du bjuder in i Vercel-teamet) kan öppna den.
7. Deploya. Vercels **"Production"-miljö för det här projektet ÄR staging** — det
   finns ingen separat riktig produktionsmiljö i Vercel ännu. Blanda inte ihop
   Vercels ord "production" med det faktiska produktionsbegreppet i
   `docs/tech/ARCHITECTURE.md`.

## e) Verifiering

- **Startsidan:** öppna Vercel-URL:en (efter att ha loggat in via Vercel Authentication
  om du slog på det i steg d.6) och kontrollera att sidan laddar.
- **`/design-lab`:** öppna `<vercel-url>/design-lab` — ska svara 200 och visa
  komponentkatalogen, eftersom `DESIGN_LAB=1` är satt (steg d.4). Om den ger 404: kolla
  att miljövariabeln verkligen heter `DESIGN_LAB` (inte `NEXT_PUBLIC_DESIGN_LAB`) och att
  värdet är exakt `1`.
- **Att workflowen kört:** GitHub → fliken **Actions** → **Deploy staging (Supabase)** →
  senaste körningen ska vara grön. Öppna steget **"Kör pgTAP mot staging"** i loggen —
  det ska visa alla pgTAP-tester i `supabase/tests/` som gröna (för närvarande 333
  tester enligt `npm run test:db` lokalt; exakt antal växer med nya migrationer).
- **Databasen:** i `OrdenaGroup-staging`-dashboarden → **Table Editor** — tabellerna
  från `supabase/migrations/` ska finnas, och om du körde med `reseed=true`,
  seed-datan från `supabase/seed.sql`.

## f) Vad staging är — och inte

- Staging är till för **granskning och manuell test av agenternas arbete**, inte för
  riktiga kunder.
- **Lägg aldrig in riktiga kunddata** (riktiga telefonnummer, riktiga namn, riktiga
  bokningar) i staging. Använd bara testdata/seed-data (Ley 21.719,
  `docs/legal/COMPLIANCE.md`).
- **Skicka aldrig skarpa WhatsApp-meddelanden eller betalningar från staging.** Så
  länge `WHATSAPP_ACCESS_TOKEN`, `MERCADOPAGO_CLIENT_ID` osv. är tomma i Vercel
  används bara fake-providers som loggar (se `docs/tech/INTEGRATIONS.md`). Fyll bara i
  riktiga tredjepartsnycklar i staging om du medvetet pekar dem mot en sandbox/testkonto
  hos respektive leverantör — aldrig produktionskonton.
- Migrationer mot staging körs **bara** av GitHub Actions (`deploy-staging.yml`), aldrig
  av en agent lokalt — skyddsreglerna i `.claude/settings.json` blockerar `db push`,
  `link` och `--linked` som lokala agentkommandon i alla worktrees.
- Sentry och PostHog ingår **inte** i den här staging-uppsättningen (se
  `docs/tasks/plans/WP-05.md`) — läggs till i ett senare arbetspaket.
