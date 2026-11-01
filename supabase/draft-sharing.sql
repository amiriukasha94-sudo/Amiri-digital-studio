-- Run once in Supabase SQL Editor. Draft content is accessed only through the Netlify
-- function using SUPABASE_SERVICE_ROLE_KEY. Do not expose that key in browser code.
create table if not exists public.website_draft_shares (
 id uuid primary key default gen_random_uuid(),
 token_hash text not null unique,
 client_name text not null default '',
 business_name text not null default '',
 client_phone text not null default '',
 client_email text not null default '',
 brief text not null,
 html_content text not null,
 status text not null default 'draft' check(status in ('draft','client_approved','changes_requested','owner_approved','published')),
 client_feedback text not null default '',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 expires_at timestamptz not null
);
create table if not exists public.website_draft_revisions (
 id uuid primary key default gen_random_uuid(),
 draft_id uuid not null references public.website_draft_shares(id) on delete cascade,
 revision_number integer not null,
 html_content text not null,
 note text not null default '',
 created_at timestamptz not null default now(),
 unique(draft_id,revision_number)
);
alter table public.website_draft_shares enable row level security;
alter table public.website_draft_revisions enable row level security;
-- Intentionally no anon/authenticated policies. Only the server-side service role can access these tables.
