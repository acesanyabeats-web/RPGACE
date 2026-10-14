-- Health & body (HB-1..3), Oct 14 2026. Applied via apply_migration 'health_body_hb1_hb3'.
create table if not exists public.food_log (
  id uuid primary key default gen_random_uuid(),
  eaten_on date not null default (now() at time zone 'Europe/London')::date,
  meal text check (meal in ('breakfast','lunch','dinner','snack')),
  name text not null,
  grams numeric check (grams is null or grams >= 0),
  kcal numeric not null default 0 check (kcal >= 0),
  protein_g numeric not null default 0 check (protein_g >= 0),
  source text not null default 'manual' check (source in ('photo','label','typed','recipe','manual')),
  matched_food text,
  recipe_id uuid references public.recipes(id) on delete set null,
  servings numeric,
  created_at timestamptz not null default now()
);
create index if not exists food_log_day on public.food_log (eaten_on);
create table if not exists public.body_log (
  id uuid primary key default gen_random_uuid(),
  logged_on date not null default (now() at time zone 'Europe/London')::date,
  kind text not null check (kind in ('weight','water','sleep','steps')),
  value numeric not null check (value >= 0),
  source text not null default 'manual',
  created_at timestamptz not null default now()
);
create index if not exists body_log_day on public.body_log (kind, logged_on);
create table if not exists public.health_settings (
  id int primary key default 1 check (id = 1),
  kcal_target numeric, protein_target numeric,
  water_target_ml numeric default 2000, glass_ml numeric default 250,
  sleep_target_h numeric default 8, weight_goal_kg numeric,
  programme jsonb,
  updated_at timestamptz default now()
);
alter table public.food_log enable row level security;
alter table public.body_log enable row level security;
alter table public.health_settings enable row level security;
create policy authenticated_all on public.food_log for all to authenticated using (true) with check (true);
create policy authenticated_all on public.body_log for all to authenticated using (true) with check (true);
create policy authenticated_all on public.health_settings for all to authenticated using (true) with check (true);
