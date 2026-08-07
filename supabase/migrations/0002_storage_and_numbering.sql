-- ============================================================================
-- Storage buckets + document numbering helper functions
-- ============================================================================

insert into storage.buckets (id, name, public)
values
  ('job-photos', 'job-photos', false),
  ('documents', 'documents', false),
  ('company-assets', 'company-assets', true)
on conflict (id) do nothing;

-- Only signed-in staff/crew can read or write job photos & documents; the
-- actual row-level filtering (which job) is enforced by the corresponding
-- job_photos/documents table policies checked via a join, since Storage RLS
-- can only see the object path — so we namespace paths as "{job_id}/...".
create policy "job-photos read" on storage.objects for select
  using (bucket_id = 'job-photos' and auth.uid() is not null);
create policy "job-photos write" on storage.objects for insert
  with check (bucket_id = 'job-photos' and auth.uid() is not null);

create policy "documents read" on storage.objects for select
  using (bucket_id = 'documents' and auth.uid() is not null);
create policy "documents write" on storage.objects for insert
  with check (bucket_id = 'documents' and auth.uid() is not null);

create policy "company-assets public read" on storage.objects for select
  using (bucket_id = 'company-assets');
create policy "company-assets admin write" on storage.objects for insert
  with check (bucket_id = 'company-assets' and is_admin());

-- ----------------------------------------------------------------------------
-- Atomic "next number" generator for JOB-0001 / Q-0001 / INV-0001 / PO-0001
-- Uses row locking on company_settings to avoid collisions under concurrency.
-- ----------------------------------------------------------------------------
create or replace function next_document_number(p_kind text)
returns text
language plpgsql
as $$
declare
  v_prefix text;
  v_number int;
  v_settings_id uuid;
begin
  select id into v_settings_id from company_settings limit 1 for update;

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
