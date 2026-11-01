-- Amiri owner provisioning and profile-role hardening.
-- Run AFTER supabase/schema.sql in the Supabase SQL Editor.
-- Replace the UUID below with the id from Authentication -> Users.
-- Run this only while signed in to the trusted Supabase dashboard as project owner.

-- Customer profile policies in schema.sql intentionally allow self-insert only
-- with role='customer' and self-update only while role remains 'customer'.
-- This migration removes any older broad profile write policies that could
-- accidentally permit users to promote themselves.
drop policy if exists "self profile insert" on public.profiles;
drop policy if exists "self profile update" on public.profiles;
drop policy if exists "profile owner or self read" on public.profiles;

create policy "profiles read self or owner" on public.profiles
for select to authenticated
using (id = (select auth.uid()) or public.is_amiri_owner());

create policy "customers create own customer profile" on public.profiles
for insert to authenticated
with check (id = (select auth.uid()) and role = 'customer');

create policy "customers update own nonprivileged profile" on public.profiles
for update to authenticated
using (id = (select auth.uid()) and role = 'customer')
with check (id = (select auth.uid()) and role = 'customer');

-- Owner provisioning: change the UUID and display name, then run this statement.
-- The SQL Editor executes with trusted database privileges; never expose this
-- operation through a public endpoint or browser-side code.
-- insert into public.profiles (id, display_name, role)
-- values ('REPLACE-WITH-AUTH-USER-UUID', 'Amiri Owner', 'owner')
-- on conflict (id) do update set role = 'owner', display_name = excluded.display_name;

-- Verify the exact account after provisioning:
-- select id, display_name, role from public.profiles
-- where id = 'REPLACE-WITH-AUTH-USER-UUID';
