-- ============================================================================
-- Phase 7 follow-on: AI end-of-day summaries.
--
-- One row per calendar day, holding an AI-generated plain-English recap of
-- the day's jobs/tasks/schedule/financial activity. Written by the
-- /api/cron/end-of-day-summary route using the service-role client (so it
-- can run unattended, with no user session) — application code never writes
-- this table via the normal user-scoped client. Office/admin can read; no
-- one else, since it surfaces financial figures alongside operational ones.
-- ============================================================================

create table daily_summaries (
  id uuid primary key default gen_random_uuid(),
  summary_date date not null unique,
  content text not null,
  stats jsonb,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table daily_summaries enable row level security;

create policy daily_summaries_office_read on daily_summaries for select
  using (is_admin_or_office());

-- No insert/update/delete policy for regular users at all — only the
-- service-role key (which bypasses RLS entirely) writes this table, from
-- the cron route.
