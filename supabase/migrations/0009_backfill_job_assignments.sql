-- ============================================================================
-- Backfill job_assignments for crew already scheduled before 0008/the
-- app-code fix existed.
--
-- 0008 (and the matching change in schedule/actions.ts) stopped the bug going
-- forward, but it can't retroactively fix appointments that were already
-- created before that code was deployed. Anyone scheduled onto a job's
-- appointment before the fix still has no job_assignments row, so the job
-- is still invisible to them: it doesn't show in their Jobs list, it's not
-- in the clock-in job picker, and they can't post a note — exactly the
-- symptom reported ("clock in does nothing", "timesheet doesn't log")
-- even after the code fix went out, because the specific person/job
-- combination being tested was assigned before the fix existed.
--
-- This grants job_assignments to everyone who has an appointment_assignments
-- row for a job but no matching job_assignments row yet. Safe to re-run —
-- only inserts rows that don't already exist.
-- ============================================================================

insert into job_assignments (job_id, profile_id)
select distinct a.job_id, aa.profile_id
from appointment_assignments aa
join appointments a on a.id = aa.appointment_id
where aa.profile_id is not null
  and a.job_id is not null
  and not exists (
    select 1 from job_assignments ja
    where ja.job_id = a.job_id and ja.profile_id = aa.profile_id
  );

insert into job_assignments (job_id, subcontractor_id)
select distinct a.job_id, aa.subcontractor_id
from appointment_assignments aa
join appointments a on a.id = aa.appointment_id
where aa.subcontractor_id is not null
  and a.job_id is not null
  and not exists (
    select 1 from job_assignments ja
    where ja.job_id = a.job_id and ja.subcontractor_id = aa.subcontractor_id
  );
