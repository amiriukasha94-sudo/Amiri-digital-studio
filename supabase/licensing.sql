-- Amiri Digital Studio: central licensing and white-label tenant foundation.
-- Run AFTER supabase/schema.sql. This creates records only; it does not by itself
-- implement investor login, tenant provisioning, billing, or automated suspension.

create table if not exists public.platform_licenses (
  id uuid primary key default gen_random_uuid(),
  license_code text not null unique,
  licensee_user_id uuid references auth.users(id) on delete set null,
  legal_entity text not null,
  contact_email text not null,
  model text not null check (model in ('white_label','franchise','enterprise')),
  tier text not null check (tier in ('reseller','business_partner','regional_operator','enterprise')),
  status text not null default 'pending' check (status in ('pending','active','suspended','expired','terminated')),
  territory text,
  starts_at timestamptz,
  ends_at timestamptz,
  setup_fee_ugx bigint not null default 0 check (setup_fee_ugx >= 0),
  recurring_fee_ugx bigint not null default 0 check (recurring_fee_ugx >= 0),
  billing_period text not null default 'monthly' check (billing_period in ('monthly','quarterly','yearly','custom')),
  agreement_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table if not exists public.license_brand_workspaces (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null unique references public.platform_licenses(id) on delete restrict,
  brand_name text not null,
  logo_url text,
  primary_domain text,
  primary_colour text,
  secondary_colour text,
  support_email text,
  support_phone text,
  custom_branding jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.license_audit_events (
  id bigint generated always as identity primary key,
  license_id uuid not null references public.platform_licenses(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.platform_licenses enable row level security;
alter table public.license_brand_workspaces enable row level security;
alter table public.license_audit_events enable row level security;

-- Only the verified Amiri owner role can manage licensing records.
drop policy if exists "Amiri owner manages platform licenses" on public.platform_licenses;
create policy "Amiri owner manages platform licenses" on public.platform_licenses
for all to authenticated using (public.is_amiri_owner()) with check (public.is_amiri_owner());

drop policy if exists "Amiri owner manages license workspaces" on public.license_brand_workspaces;
create policy "Amiri owner manages license workspaces" on public.license_brand_workspaces
for all to authenticated using (public.is_amiri_owner()) with check (public.is_amiri_owner());

drop policy if exists "Amiri owner reads license audit" on public.license_audit_events;
create policy "Amiri owner reads license audit" on public.license_audit_events
for select to authenticated using (public.is_amiri_owner());

drop policy if exists "Amiri owner inserts license audit" on public.license_audit_events;
create policy "Amiri owner inserts license audit" on public.license_audit_events
for insert to authenticated with check (public.is_amiri_owner());

-- No anon or investor policies are intentionally created yet. Add tenant-scoped
-- policies only after implementing authenticated tenant membership and testing
-- that one investor cannot read or modify another investor's data.
