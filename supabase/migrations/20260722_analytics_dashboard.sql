-- Analytics dashboard schema for PersonalInjuryLawyerHub.com
--
-- HOW TO RUN THIS FILE
-- This repo has no server and no Supabase CLI project linked to it, and
-- this build environment cannot reach supabase.co (network policy blocks
-- it outright). Run this file yourself, once, in the Supabase SQL Editor
-- for project tbqigevoksabizjogvtm. It is idempotent — safe to re-run.
--
-- WHY A NEW TABLE INSTEAD OF "analytics_events"
-- Named personalinjurylawyerhub_dashboard, not the generic "analytics_events",
-- because this Supabase project already serves leads (and analytics) for
-- multiple directory sites, per the site owner. A generic name would
-- collide.
--
-- WHY PUBLIC INSERT/SELECT IS SAFE HERE
-- This table stores no PII: event type, path, referrer, a browser-generated
-- session/visitor id, and — for listing pages — the listing's slug/name/
-- city (already public directory data). Public SELECT is what lets the
-- dashboard's live panel subscribe via Realtime straight from the browser.
-- Public INSERT is required because this is a static site with no backend
-- of its own to hold a service-role key — the browser inserts directly
-- using the publishable/anon key, same pattern already used for the leads
-- form in js/inquire.js.
--
-- WHY THE LEADS TABLE IS NOT TOUCHED THE SAME WAY
-- Unlike analytics, the "leads" table holds real names, emails, and phone
-- numbers. It is NOT made public-readable here. Instead, a narrow
-- SECURITY DEFINER function returns only an aggregate count for this
-- site's leads, so the public dashboard can show "N leads received"
-- without ever exposing a queryable path to the underlying PII.

-- ---------------------------------------------------------------------
-- 1. Event table
-- ---------------------------------------------------------------------
create table if not exists public.personalinjurylawyerhub_dashboard (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  event_type   text not null check (event_type in (
                 'pageview',
                 'listing_view',
                 'call_click',        -- reserved: no phone numbers in this
                                      -- site's data yet, so never fired
                                      -- today; kept for schema stability
                                      -- if phone data is added later.
                 'directions_click',
                 'website_click',     -- this site's equivalent of a
                                      -- lead-intent click, alongside
                                      -- directions_click and inquire_click
                 'inquire_click',     -- opened the lead-capture modal;
                                      -- the strongest on-site lead signal
                 'search',
                 'review_click'
               )),
  path         text,
  referrer     text,
  session_id   text,
  visitor_id   text,
  listing_slug text,
  listing_name text,
  city         text,
  query        text
);

comment on table public.personalinjurylawyerhub_dashboard is
  'Public, PII-free analytics events for personalinjurylawyerhub.com. Powers the public /dashboard.html page.';

-- ---------------------------------------------------------------------
-- 2. Indexes
-- ---------------------------------------------------------------------
create index if not exists idx_pilh_dashboard_created_at
  on public.personalinjurylawyerhub_dashboard (created_at);
create index if not exists idx_pilh_dashboard_event_type
  on public.personalinjurylawyerhub_dashboard (event_type);
create index if not exists idx_pilh_dashboard_listing_slug
  on public.personalinjurylawyerhub_dashboard (listing_slug);
create index if not exists idx_pilh_dashboard_path
  on public.personalinjurylawyerhub_dashboard (path);
create index if not exists idx_pilh_dashboard_session_id
  on public.personalinjurylawyerhub_dashboard (session_id);

-- ---------------------------------------------------------------------
-- 3. Row Level Security
-- ---------------------------------------------------------------------
alter table public.personalinjurylawyerhub_dashboard enable row level security;

drop policy if exists "public can read pilh dashboard events" on public.personalinjurylawyerhub_dashboard;
create policy "public can read pilh dashboard events"
  on public.personalinjurylawyerhub_dashboard
  for select
  using (true);

drop policy if exists "public can insert pilh dashboard events" on public.personalinjurylawyerhub_dashboard;
create policy "public can insert pilh dashboard events"
  on public.personalinjurylawyerhub_dashboard
  for insert
  with check (true);

-- No update/delete policy is created, so rows are append-only for anon —
-- intentional; the dashboard has no need to mutate past events, and this
-- limits what a malicious client could do even with the public key.

-- ---------------------------------------------------------------------
-- 4. Realtime
-- ---------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.personalinjurylawyerhub_dashboard;
exception
  when duplicate_object then null; -- already added; fine on re-run
end $$;

-- ---------------------------------------------------------------------
-- 5. Aggregate-only leads count (no PII exposed)
-- ---------------------------------------------------------------------
-- Adjust the WHERE clause below if your "leads" table's column names
-- differ from what js/inquire.js currently sends. As wired today,
-- js/inquire.js posts source_site = 'personalinjurylawyerhub.com' on
-- every row, so that is what this filters on. If your leads table does
-- not have a source_site column, replace the filter accordingly (e.g. a
-- site_id foreign key) or this function will fail — check the Supabase
-- logs after running the migration.
create or replace function public.personalinjurylawyerhub_leads_count(days_back int default 30)
returns bigint
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::bigint
  from public.leads
  where source_site = 'personalinjurylawyerhub.com'
    and created_at >= now() - (greatest(days_back, 0) || ' days')::interval;
$$;

comment on function public.personalinjurylawyerhub_leads_count(int) is
  'Returns only a count of this site''s leads in the given window. SECURITY DEFINER so the public dashboard can call it without the leads table itself being publicly readable.';

revoke all on function public.personalinjurylawyerhub_leads_count(int) from public;
grant execute on function public.personalinjurylawyerhub_leads_count(int) to anon;
