-- WP-66 · AI-import från befintligt bokningssystem (D-046)
-- Kostnadslogg per körning: vem/vilket företag, tid, tokens, uppskattad
-- kostnad och status. ALDRIG URL, sidinnehåll eller persondata från sidan.
-- INV-3: RLS, inga anon-policies. Skrivs bara av servern (`service_role`,
-- src/server/import/runs.ts) — `authenticated` får bara läsa sina egna
-- rader eller sitt företags (ägaren).
create table public.ai_import_runs (
  id uuid primary key default gen_random_uuid(),
  -- null under onboarding (företaget finns inte än): räknas då per användare.
  business_id uuid references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null,
  -- Plattformens nyckel i allowlisten (t.ex. "bokadirekt"), aldrig URL:en.
  platform text,
  status text not null default 'running',
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  web_fetches integer not null default 0,
  cost_usd numeric(10, 4) not null default 0,
  duration_ms integer,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  constraint ai_import_runs_source_check check (source in ('url', 'text')),
  constraint ai_import_runs_status_check check (
    status in ('running', 'ok', 'empty', 'refused', 'truncated', 'fetch_failed', 'failed', 'cancelled', 'fake')
  ),
  constraint ai_import_runs_platform_format check (platform is null or platform ~ '^[a-z0-9-]{1,40}$'),
  constraint ai_import_runs_tokens_nonneg check (input_tokens >= 0 and output_tokens >= 0 and web_fetches >= 0 and cost_usd >= 0)
);

create index ai_import_runs_business_created_idx on public.ai_import_runs (business_id, created_at desc);
create index ai_import_runs_user_created_idx on public.ai_import_runs (user_id, created_at desc);
create index ai_import_runs_created_idx on public.ai_import_runs (created_at);

alter table public.ai_import_runs enable row level security;

create policy "read own or owner" on public.ai_import_runs
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (business_id is not null and private.is_member(business_id, array['owner']::public.member_role[]))
  );

revoke all on public.ai_import_runs from anon, authenticated;
grant select on public.ai_import_runs to authenticated;
grant select, insert, update, delete on public.ai_import_runs to service_role;
