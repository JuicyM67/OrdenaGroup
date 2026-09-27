# Supabase-konfiguration: lokalt och prod

`supabase/config.toml` gäller **bara lokalt**. Tabellen nedan är målet för prod-projektet (`sa-east-1`). Värdena sätts manuellt av ägaren i dashboarden när projektet skapas (WP-05/före pilot). Ingen agent ändrar prod.

| Inställning | Lokalt (config.toml) | Prod (mål) | Varför |
|---|---|---|---|
| Postgres major | 17 | 17 | Samma beteende |
| `api.schemas` | `["public"]` | `public` | GraphQL används inte |
| GraphQL-tillägget (`pg_graphql`) | avstängt (ingår inte i `api.schemas`, se D-014-anteckningen nedan) | avstängt | pg_graphql exponerar annars schemaintrospektion utan att vi bett om det |
| Data API → auto-expose new tables/functions | **på** (plattformens standard — det finns ingen `config.toml`-inställning som stänger av det lokalt), motverkas i migrationerna med explicita `alter default privileges ... in schema public revoke ... from anon/authenticated` (se DATA_MODEL.md "Grants") | **på** som standard; samma motverkan gäller identiskt i prod eftersom den ligger i `supabase/migrations/`. Stäng även av i dashboarden (Project Settings → Data API) om alternativet finns för projektet — men lita inte på det ensamt, verifiera enligt avsnittet nedan. | Standardbeteendet ger annars `anon`/`authenticated`/`service_role` fullt CRUD på nya tabeller automatiskt (granskningsfynd, se nedan) |
| `auth.site_url` | `http://127.0.0.1:3000` | `https://<domän>` (D-001, ej bestämd) | Redirect-bas |
| `auth.additional_redirect_urls` | `https://127.0.0.1:3000` | Bara exakta prod-URL:er (`https://<domän>/auth/callback`). Inga wildcards. Previews går mot egna Supabase-branches. | Förhindrar open redirect |
| `auth.enable_signup` | true | true | Ägaren skapar kontot själv (F1) |
| `auth.enable_anonymous_sign_ins` | false | **false** | En anonym användare i Supabase Auth får rollen `authenticated` (samma som ett riktigt konto), bara med `is_anonymous = true` i JWT:et. Våra RLS-policies (`private.is_member`) filtrerar redan bort dem naturligt (de har inget `memberships`-medlemskap), men om den här sätts till `true` av misstag i prod kan vem som helst skapa ett `authenticated`-JWT utan e-post/lösenord och t.ex. anropa `create_business()`. Ska vara av tills en uttrycklig produktanledning finns. |
| `auth.enable_manual_linking` | false | false | – |
| `auth.email.enable_confirmations` | false | **true** | Verifierad e-post |
| `auth.email.double_confirm_changes` | true | true | – |
| `auth.email.secure_password_change` | false | **true** | – |
| `auth.email.otp_expiry` | 3600 | **900** (15 min) | Kortare giltighet för magiska länkar |
| `auth.email.max_frequency` | 1s | **60s** | Mot spam |
| `auth.minimum_password_length` / `password_requirements` | 6 / "" | **12 / `lower_upper_letters_digits`** + läckta lösenord-skydd | Lösenord används inte i UI:t, men ska vara starka om de används |
| `auth.jwt_expiry` | 3600 | 3600 | – |
| `auth.enable_refresh_token_rotation` / reuse | true / 10 | true / 10 | – |
| E-post (SMTP) | Lokal mail (`local_smtp`) | **Egen SMTP via Resend**, avsändare på egen domän. `rate_limit.email_sent` höjs (t.ex. 100/h). | Inbyggd SMTP klarar 2 mejl/h |
| `auth.captcha` | av | **Turnstile på** för signup och inloggning före pilot (WP-27) | Mot bottar |
| `auth.sms` | av | av (WhatsApp-kod kommer senare) | – |
| `auth.mfa.totp` | av | av för ägare i v1, **på** för intern admin (F19) | – |
| `db.ssl_enforcement` | av | **på** | – |
| Seed | `db reset` lokalt | **aldrig** | Fiktiv testdata |
| analytics / edge_runtime / storage s3, vector | av | irrelevant (hanteras av plattformen) | – |

## Ändringar i `config.toml` gjorda i WP-01

- `[analytics] enabled = false` — analytics/vector-containern monterar Docker-socketen; avstängt minskar beroendet av det förkravet och startar stacken snabbare.
- `[edge_runtime] enabled = false` — Next-routes används, inte edge functions (D-003).
- `[storage.s3_protocol] enabled = false` och `[storage.vector] enabled = false` — oanvänt i v1. `storage` i sig är kvar (logotyper senare).
- `[api] schemas = ["public"]` — GraphQL (`graphql_public`) används inte och pg_graphql exponerar annars schemaintrospektion. Samma värde är målet i prod.
- Realtime, Studio och `local_smtp` (magiska länkar lokalt) är oförändrade.
- `project_id` och portar är oförändrade (delas av alla worktrees under Våg A, se README "Lokal databas").

## Verifiering efter första `db push` mot prod (S2, säkerhetsgranskning)

Lokalt bevisar `000_schema_guard.test.sql` (pgTAP) att `anon` saknar rättigheter och att `authenticated` bara kör allowlistade funktioner. Detta upprepas manuellt mot en riktig Supabase-branch/prod-projekt efter första `db push`, eftersom `pg_default_acl` sätts av plattformen själv per projekt och kan skilja sig:

1. Kontrollera `pg_default_acl` för schema `public`: `select defaclrole::regrole, defaclnamespace::regnamespace, array_to_string(defaclacl, ',') from pg_default_acl where defaclnamespace = 'public'::regnamespace;` — bekräfta att `anon` och `authenticated` INTE finns i ACL-listorna för `postgres`-raden efter att migrationerna kört (våra `alter default privileges ... in schema public revoke ...`-satser ska ha tagit bort dem).
2. `has_table_privilege('anon', 'public.<tabell>', 'select')` (och insert/update/delete) för varje tenant-tabell → ska vara `false` för alla.
3. `has_table_privilege('authenticated', 'public.<tabell>', 'delete')` för `payments`/`businesses` → ska vara `false` (ingen delete-grant på `payments` alls, inte ens för `service_role`; `businesses` har delete bara för `service_role`, aldrig `authenticated`).
4. `has_function_privilege('authenticated', 'public.create_business(text,text,text,text,text)', 'execute')` → `true`, och kör `000_schema_guard`s allowlist-fråga direkt mot branchen för att bekräfta att inga andra `public`-funktioner är körbara för `authenticated`.
5. Kör hela `supabase/tests/` (`supabase test db` pekat mot branchen, eller manuellt via `psql \i`) mot en riktig Supabase-branch (aldrig mot prod direkt) innan prod-migreringen godkänns.

Se `docs/tech/DATA_MODEL.md` för schema och invarianter, `CLAUDE.md` för de hårda reglerna.
