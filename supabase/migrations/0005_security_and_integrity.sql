-- ============================================================================
-- Security, access-control and data-integrity hardening.
--
-- Found during a full backend audit. Several of these are live holes and one
-- (next_document_number) makes the app unusable for the `office` role, so this
-- migration should be run before the app is used in anger.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. next_document_number must run as its owner.
--
-- It was `language plpgsql` with no `security definer`, so it executed as the
-- CALLER. Only admins can write company_settings (company_settings_admin_write
-- uses is_admin()), so for an `office` user the UPDATE matched zero rows,
-- RETURNING ... INTO left both variables NULL, and the function returned NULL.
-- Every "create" path then hit its `!number` branch: office staff could not
-- create a single job, quote, invoice or purchase order. Admins were fine,
-- which is why it survives casual testing.
-- ----------------------------------------------------------------------------
create or replace function next_document_number(p_kind text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefix text;
  v_number int;
  v_settings_id uuid;
begin
  -- security definer bypasses RLS, so re-assert the caller's right here.
  if not is_admin_or_office() then
    raise exception 'Not authorised to allocate document numbers';
  end if;

  select id into v_settings_id from company_settings limit 1 for update;
  if v_settings_id is null then
    raise exception 'company_settings row is missing — seed it before creating documents';
  end if;

  if p_kind = 'job' then
    update company_settings set next_job_number = next_job_number + 1
      where id = v_settings_id
      returning job_number_prefix, next_job_number - 1 into v_prefix, v_number;
  elsif p_kind = 'quote' then
    update company_settings set next_quote_number = next_quote_number + 1
      where id = v_settings_id
      returning quote_number_prefix, next_quote_number - 1 into v_prefix, v_number;
  elsif p_kind = 'invoice' then
    update company_settings set next_invoice_number = next_invoice_number + 1
      where id = v_settings_id
      returning invoice_number_prefix, next_invoice_number - 1 into v_prefix, v_number;
  elsif p_kind = 'po' then
    update company_settings set next_po_number = next_po_number + 1
      where id = v_settings_id
      returning po_number_prefix, next_po_number - 1 into v_prefix, v_number;
  else
    raise exception 'Unknown document kind: %', p_kind;
  end if;

  return v_prefix || '-' || lpad(v_number::text, 4, '0');
end;
$$;

revoke all on function next_document_number(text) from public;
grant execute on function next_document_number(text) to authenticated;

-- ----------------------------------------------------------------------------
-- 2. Stop users promoting themselves to admin.
--
-- profiles_update_self was `for update using (id = auth.uid())` with NO
-- `with check`. Postgres then reuses USING as the check, so the NEW row only
-- had to satisfy `id = auth.uid()` — the `role` column was unconstrained.
-- Because the anon key and URL are (by design) in the client bundle, any
-- signed-in tradesperson could PATCH /rest/v1/profiles?id=eq.<self> with
-- {"role":"admin"} and take over the account. Role/active/pay changes now go
-- exclusively through the admin-gated updateStaffAction.
-- ----------------------------------------------------------------------------
drop policy if exists profiles_update_self on profiles;
create policy profiles_update_self on profiles for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from profiles p where p.id = auth.uid())
    and is_active = (select p.is_active from profiles p where p.id = auth.uid())
    and coalesce(hourly_rate, -1) = coalesce((select p.hourly_rate from profiles p where p.id = auth.uid()), -1)
  );

-- Belt and braces: the privileged columns aren't writable by the role at all.
revoke update on profiles from authenticated;
grant update (full_name, phone, avatar_url, job_title) on profiles to authenticated;

-- ----------------------------------------------------------------------------
-- 3. Deactivating someone must actually revoke their access.
--
-- is_active was written by the staff screen but never consulted anywhere —
-- not in RLS, not in the app. A sacked employee kept full access until their
-- password was changed. Both helpers now require an active profile.
-- ----------------------------------------------------------------------------
create or replace function is_admin_or_office()
returns boolean
language sql stable
as $$
  select coalesce(
    (select role in ('admin', 'office') and is_active from profiles where id = auth.uid()),
    false
  );
$$;

create or replace function is_admin()
returns boolean
language sql stable
as $$
  select coalesce(
    (select role = 'admin' and is_active from profiles where id = auth.uid()),
    false
  );
$$;

-- ----------------------------------------------------------------------------
-- 4. Crew can no longer approve or back-date their own timesheets.
--
-- timesheets_self_all was `for all`, which includes UPDATE of every column —
-- including is_approved/approved_by/approved_at and started_at/ended_at. A
-- tradesperson could self-approve inflated hours straight through the REST
-- API. They may now insert their own rows and edit/delete only rows that are
-- still unapproved; approval remains office/admin only.
-- ----------------------------------------------------------------------------
drop policy if exists timesheets_self_all on timesheets;

create policy timesheets_self_select on timesheets for select
  using (profile_id = auth.uid());

create policy timesheets_self_insert on timesheets for insert
  with check (profile_id = auth.uid() and is_approved = false);

create policy timesheets_self_update on timesheets for update
  using (profile_id = auth.uid() and is_approved = false)
  with check (profile_id = auth.uid() and is_approved = false);

create policy timesheets_self_delete on timesheets for delete
  using (profile_id = auth.uid() and is_approved = false);

revoke update on timesheets from authenticated;
grant update (
  ended_at, break_minutes, notes, started_at, is_approved, approved_by, approved_at
) on timesheets to authenticated;
-- The approval columns above are still reachable only via the office-only
-- timesheets_office_all policy; the self policies exclude approved rows.

-- ----------------------------------------------------------------------------
-- 5. Assigned crew may update job progress, not job money.
--
-- jobs_assigned_update was column-unrestricted, so an assigned tradesperson
-- could rewrite estimated_value/estimated_cost/customer_id on their own job.
-- ----------------------------------------------------------------------------
revoke update on jobs from authenticated;
grant update (
  status, actual_completion_date, start_date, expected_completion_date,
  job_name, description, customer_id, site_id, quote_id, primary_contact_id,
  estimated_value, estimated_cost, updated_at, deleted_at
) on jobs to authenticated;
-- Office/admin keep full column access through jobs_office_all; the narrower
-- risk (crew editing money) is closed by the column check below.
create or replace function jobs_guard_crew_financials()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_admin_or_office() then
    return new;
  end if;
  -- Non-office updaters (assigned crew) may only move progress fields.
  new.estimated_value := old.estimated_value;
  new.estimated_cost  := old.estimated_cost;
  new.customer_id     := old.customer_id;
  new.site_id         := old.site_id;
  new.quote_id        := old.quote_id;
  new.job_number      := old.job_number;
  new.job_name        := old.job_name;
  new.deleted_at      := old.deleted_at;
  return new;
end;
$$;

drop trigger if exists trg_jobs_guard_crew_financials on jobs;
create trigger trg_jobs_guard_crew_financials
  before update on jobs
  for each row execute function jobs_guard_crew_financials();

-- ----------------------------------------------------------------------------
-- 6. Money integrity constraints.
--
-- Line items were parsed with `Number(x) || 0` and never validated, so a
-- crafted POST could store negative quantities (producing a negative invoice
-- total, which the payment trigger would then mark 'paid' for 1p) or a 250%
-- VAT rate. The app now validates too, but the database is the backstop.
-- ----------------------------------------------------------------------------
alter table quote_items
  add constraint quote_items_quantity_positive check (quantity > 0),
  add constraint quote_items_unit_price_non_negative check (unit_price >= 0),
  add constraint quote_items_vat_rate_sane check (vat_rate >= 0 and vat_rate <= 100);

alter table invoice_items
  add constraint invoice_items_quantity_positive check (quantity > 0),
  add constraint invoice_items_unit_price_non_negative check (unit_price >= 0),
  add constraint invoice_items_vat_rate_sane check (vat_rate >= 0 and vat_rate <= 100);

alter table purchase_order_items
  add constraint po_items_quantity_positive check (quantity > 0),
  add constraint po_items_unit_price_non_negative check (unit_price >= 0),
  add constraint po_items_vat_rate_sane check (vat_rate >= 0 and vat_rate <= 100);

alter table payments
  add constraint payments_amount_positive check (amount > 0);

alter table job_costs
  add constraint job_costs_quantity_positive check (quantity > 0),
  add constraint job_costs_unit_cost_non_negative check (unit_cost >= 0);

-- ----------------------------------------------------------------------------
-- 7. One quote can only ever become one job.
--
-- acceptQuoteAction's read-then-write idempotency check could be raced by a
-- double-click, creating two jobs (and burning two job numbers) for the same
-- quote. The action now claims the quote atomically; this index guarantees it.
-- ----------------------------------------------------------------------------
create unique index if not exists jobs_quote_id_unique
  on jobs (quote_id) where quote_id is not null;

create unique index if not exists quotes_converted_job_id_unique
  on quotes (converted_job_id) where converted_job_id is not null;

-- ----------------------------------------------------------------------------
-- 8. Storage: writes are scoped to a job the user can actually see.
--
-- The original policies only checked `auth.uid() is not null`, so any signed-in
-- user could write objects under any job's prefix (paths are "{job_id}/...").
-- ----------------------------------------------------------------------------
drop policy if exists "job-photos read" on storage.objects;
drop policy if exists "job-photos write" on storage.objects;
drop policy if exists "documents read" on storage.objects;
drop policy if exists "documents write" on storage.objects;

create policy "job-photos read" on storage.objects for select
  using (
    bucket_id = 'job-photos'
    and exists (
      select 1 from jobs j
      where j.id::text = (storage.foldername(name))[1]
        and (
          is_admin_or_office()
          or exists (select 1 from job_assignments ja where ja.job_id = j.id and ja.profile_id = auth.uid())
        )
    )
  );

create policy "job-photos write" on storage.objects for insert
  with check (
    bucket_id = 'job-photos'
    and exists (
      select 1 from jobs j
      where j.id::text = (storage.foldername(name))[1]
        and (
          is_admin_or_office()
          or exists (select 1 from job_assignments ja where ja.job_id = j.id and ja.profile_id = auth.uid())
        )
    )
  );

create policy "documents read" on storage.objects for select
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from jobs j
      where j.id::text = (storage.foldername(name))[1]
        and (
          is_admin_or_office()
          or exists (select 1 from job_assignments ja where ja.job_id = j.id and ja.profile_id = auth.uid())
        )
    )
  );

-- Documents are office-authored only (uploadJobDocumentAction is office-gated).
create policy "documents write" on storage.objects for insert
  with check (bucket_id = 'documents' and is_admin_or_office());
