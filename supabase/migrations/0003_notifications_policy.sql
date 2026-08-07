-- ============================================================================
-- Phase 6/7: allow office/admin to create notifications for other people.
--
-- The original notifications_self_all policy only lets someone manage their
-- OWN notification rows (profile_id = auth.uid()) — correct for reading/
-- marking-read, but it also silently blocked office/admin from creating a
-- notification FOR a tradesperson (e.g. "you've been assigned to JOB-0001").
-- Every place the app creates a notification on someone else's behalf is
-- already an office/admin-only action (job/task/appointment assignment,
-- quote acceptance, overdue invoice checks), so this policy is scoped to
-- exactly that.
-- ============================================================================

create policy notifications_office_insert on notifications for insert
  with check (is_admin_or_office());
