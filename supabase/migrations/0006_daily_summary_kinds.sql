-- ============================================================================
-- Two kinds of daily summary.
--
-- 'operations' — what actually happened on each job today, written from the
--   notes the crew logged on site plus their timesheet hours. Readable by
--   EVERY signed-in staff member: the whole point is that the crew can see
--   where every job stands, not just the office. Contains no money.
--
-- 'financial'  — the money digest (invoiced, received, overdue, quote
--   conversion). Office/admin only, same as before.
-- ============================================================================

alter table daily_summaries
  add column if not exists kind text not null default 'financial';

alter table daily_summaries
  add constraint daily_summaries_kind_check check (kind in ('operations', 'financial'));

-- One row per day PER KIND, rather than one row per day.
alter table daily_summaries drop constraint if exists daily_summaries_summary_date_key;
create unique index if not exists daily_summaries_date_kind_unique
  on daily_summaries (summary_date, kind);

-- Replace the office-only read policy with a kind-aware one.
drop policy if exists daily_summaries_office_read on daily_summaries;

create policy daily_summaries_read on daily_summaries for select
  using (
    (kind = 'operations' and auth.uid() is not null)
    or (kind = 'financial' and is_admin_or_office())
  );

-- Still no insert/update/delete policy for regular users — only the
-- service-role key writes this table, from the cron route or the
-- office-triggered "generate now" action.
