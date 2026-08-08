-- ============================================================================
-- Clock-in fix: stop duplicate "open" shifts, and clean up the ones already
-- created while the bug in src/lib/data/timesheets.ts was live.
--
-- Root cause of "clock in does nothing": timesheets.job_id and .profile_id
-- are NOT NULL columns, so PostgREST's resource embedding
-- (`job:jobs(...)`, `profile:profiles(...)`) defaulted to an INNER JOIN.
-- Combined with RLS on `jobs` (a tradesperson can only SELECT a job they
-- have a job_assignments row for), that inner join could silently drop the
-- whole timesheets row from the result of getOpenTimesheet() even though
-- the row itself was fully visible and the earlier insert had succeeded.
-- The app fix (job:jobs!left / profile:profiles!left, forcing an explicit
-- LEFT JOIN) lives in src/lib/data/timesheets.ts. This migration is the
-- companion database-side fix: it (1) clears out the orphaned "open" rows
-- that piled up from repeated clock-in attempts while the bug was live, and
-- (2) adds a unique index so it's impossible to end up with two open shifts
-- for the same person again, no matter what bug shows up next.
--
-- Safe to re-run.
-- ============================================================================

-- 1) Close out duplicate open shifts, keeping only the most recently
--    started one per profile. Anyone with more than one row where
--    ended_at is null almost certainly has 2-6 junk rows from clock-in
--    attempts that looked like they failed. This soft-deletes the extras by
--    ending them at their own start time with a 0-minute duration and a
--    note explaining what happened, rather than hard-deleting history.
with ranked as (
  select id, profile_id, started_at,
         row_number() over (partition by profile_id order by started_at desc) as rn
  from timesheets
  where ended_at is null
)
update timesheets t
set ended_at = t.started_at,
    notes = coalesce(t.notes || ' ', '') || '[auto-closed: duplicate clock-in caused by a since-fixed bug]'
from ranked r
where t.id = r.id
  and r.rn > 1;

-- 2) Belt-and-braces: the app already guards against double clock-in
--    (getOpenTimesheet check before insert), but that guard is only as good
--    as the read it depends on. This makes it impossible at the database
--    level for one profile to have two open (ended_at is null) shifts at
--    once, regardless of what the app layer does.
create unique index if not exists timesheets_one_open_shift_per_profile
  on timesheets (profile_id)
  where ended_at is null;
