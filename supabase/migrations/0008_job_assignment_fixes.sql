-- ============================================================================
-- Scheduling an appointment must actually grant job access.
--
-- Found in the wild: scheduling a crew member onto an appointment (Schedule
-- page) only ever inserts an appointment_assignments row. It never touches
-- job_assignments — the table every other piece of per-job access is keyed
-- off (RLS on jobs, job_notes, job_photos, job-photos/documents Storage, and
-- the `listJobs()` query that populates the clock-in dropdown on the
-- Timesheets page). So a labourer scheduled the natural way — Schedule ->
-- create appointment -> tick their name — shows up on their own Today
-- screen (that part reads appointment_assignments directly) but:
--   - the job itself doesn't appear in their Jobs list or the clock-in
--     job picker (jobs_assigned_select requires job_assignments)
--   - they can't post a job note (job_notes_assigned_all requires it too)
--   - "View job" from their appointment card is blocked
-- The only way around it was for the office to *also* separately open the
-- job and assign them again from the Team tab — an easy step to miss, and
-- exactly the shape of bug reported ("logged a timesheet... didn't record,
-- note didn't appear anywhere").
--
-- This migration adds the unique indexes the app's addJobAssignmentAction
-- already assumed existed (it has a 23505-handling branch for "already
-- assigned", but nothing ever enforced that at the database level, so
-- assigning the same person twice silently created duplicate rows). The
-- application-level fix (auto-granting job_assignments when someone is
-- scheduled onto an appointment) lives in schedule/actions.ts.
-- ============================================================================

create unique index if not exists job_assignments_job_profile_unique
  on job_assignments (job_id, profile_id)
  where profile_id is not null;

create unique index if not exists job_assignments_job_subcontractor_unique
  on job_assignments (job_id, subcontractor_id)
  where subcontractor_id is not null;
