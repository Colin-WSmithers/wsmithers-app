-- ============================================================================
-- W Smithers & Sons — Job Management Platform
-- Initial schema migration
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------
create type user_role as enum ('admin', 'office', 'tradesperson', 'subcontractor');

create type enquiry_status as enum (
  'new', 'contacted', 'site_visit_required', 'quote_required', 'quote_sent', 'won', 'lost'
);

create type quote_status as enum ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired');

create type job_status as enum (
  'draft', 'scheduled', 'in_progress', 'on_hold', 'awaiting_materials',
  'awaiting_customer', 'completed', 'invoiced', 'cancelled'
);

create type job_task_status as enum ('to_do', 'in_progress', 'blocked', 'completed');
create type task_priority as enum ('low', 'medium', 'high', 'urgent');

create type appointment_status as enum ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled');

create type po_status as enum (
  'draft', 'awaiting_approval', 'approved', 'sent', 'partially_received', 'received', 'cancelled'
);

create type invoice_status as enum ('draft', 'sent', 'viewed', 'part_paid', 'paid', 'overdue', 'void');
create type invoice_kind as enum ('deposit', 'progress', 'final', 'standard');

create type payment_method as enum ('bank_transfer', 'card', 'cash', 'cheque', 'other');

create type photo_category as enum ('before', 'during', 'after', 'issue', 'evidence', 'other');

create type document_category as enum (
  'plans', 'drawings', 'contracts', 'certificates', 'supplier_quotes',
  'customer_documents', 'risk_assessments', 'method_statements', 'receipts', 'other'
);

create type job_cost_category as enum ('material', 'labour', 'subcontractor', 'other');

-- ----------------------------------------------------------------------------
-- HELPER: updated_at trigger
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ----------------------------------------------------------------------------
-- PROFILES  (1:1 with auth.users)
-- ----------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  role user_role not null default 'tradesperson',
  avatar_url text,
  job_title text,
  hourly_rate numeric(10,2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

-- Convenience function used throughout RLS policies.
create or replace function current_role_name()
returns user_role
language sql stable
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_admin_or_office()
returns boolean
language sql stable
as $$
  select coalesce((select role in ('admin', 'office') from profiles where id = auth.uid()), false);
$$;

create or replace function is_admin()
returns boolean
language sql stable
as $$
  select coalesce((select role = 'admin' from profiles where id = auth.uid()), false);
$$;

-- ----------------------------------------------------------------------------
-- COMPANY SETTINGS (singleton)
-- ----------------------------------------------------------------------------
create table company_settings (
  id uuid primary key default gen_random_uuid(),
  company_name text not null default 'W Smithers and Sons',
  logo_url text,
  address_line1 text,
  address_line2 text,
  city text,
  postcode text,
  phone text,
  email text,
  company_number text,
  vat_number text,
  default_vat_rate numeric(5,2) not null default 20.00,
  quote_terms text,
  invoice_terms text,
  payment_details text,
  job_number_prefix text not null default 'JOB',
  quote_number_prefix text not null default 'Q',
  invoice_number_prefix text not null default 'INV',
  po_number_prefix text not null default 'PO',
  next_job_number int not null default 1,
  next_quote_number int not null default 1,
  next_invoice_number int not null default 1,
  next_po_number int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_company_settings_updated_at before update on company_settings
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- CUSTOMERS / CONTACTS / SITES
-- ----------------------------------------------------------------------------
create table customers (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  company_name text,
  first_name text,
  last_name text,
  email text,
  phone text,
  billing_address_line1 text,
  billing_address_line2 text,
  billing_city text,
  billing_postcode text,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_customers_display_name on customers using gin (to_tsvector('english', display_name));
create trigger trg_customers_updated_at before update on customers
  for each row execute function set_updated_at();

create table customer_contacts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  full_name text not null,
  role text,
  email text,
  phone text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_customer_contacts_customer on customer_contacts(customer_id);

create table sites (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  label text not null,
  address_line1 text not null,
  address_line2 text,
  city text,
  postcode text not null,
  access_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_sites_customer on sites(customer_id);
create trigger trg_sites_updated_at before update on sites
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- ENQUIRIES
-- ----------------------------------------------------------------------------
create table enquiries (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id),
  first_name text,
  last_name text,
  company_name text,
  email text,
  phone text,
  site_address text,
  source text,
  description text,
  estimated_value numeric(12,2),
  date_received date not null default current_date,
  assigned_to uuid references profiles(id),
  next_action_date date,
  notes text,
  status enquiry_status not null default 'new',
  converted_customer_id uuid references customers(id),
  converted_quote_id uuid,
  converted_job_id uuid,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_enquiries_status on enquiries(status);
create index idx_enquiries_assigned_to on enquiries(assigned_to);
create trigger trg_enquiries_updated_at before update on enquiries
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- QUOTES
-- ----------------------------------------------------------------------------
create table quotes (
  id uuid primary key default gen_random_uuid(),
  quote_number text not null unique,
  customer_id uuid not null references customers(id),
  site_id uuid references sites(id),
  enquiry_id uuid references enquiries(id),
  issue_date date not null default current_date,
  expiry_date date,
  description text,
  notes text,
  terms text,
  discount_amount numeric(12,2) not null default 0,
  vat_rate numeric(5,2) not null default 20.00,
  subtotal numeric(12,2) not null default 0,
  vat_total numeric(12,2) not null default 0,
  grand_total numeric(12,2) not null default 0,
  status quote_status not null default 'draft',
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  converted_job_id uuid,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_quotes_customer on quotes(customer_id);
create index idx_quotes_status on quotes(status);
create trigger trg_quotes_updated_at before update on quotes
  for each row execute function set_updated_at();

create table quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  sort_order int not null default 0,
  category text,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit text not null default 'item',
  unit_price numeric(12,2) not null default 0,
  vat_rate numeric(5,2) not null default 20.00,
  line_total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);
create index idx_quote_items_quote on quote_items(quote_id);

-- Reusable line-item templates (Labour, Materials, Plant hire, etc.)
create table quote_item_templates (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  description text not null,
  default_unit text not null default 'item',
  default_unit_price numeric(12,2) not null default 0,
  default_vat_rate numeric(5,2) not null default 20.00,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- JOBS
-- ----------------------------------------------------------------------------
create table jobs (
  id uuid primary key default gen_random_uuid(),
  job_number text not null unique,
  job_name text not null,
  customer_id uuid not null references customers(id),
  site_id uuid references sites(id),
  quote_id uuid references quotes(id),
  primary_contact_id uuid references customer_contacts(id),
  description text,
  status job_status not null default 'draft',
  start_date date,
  expected_completion_date date,
  actual_completion_date date,
  estimated_value numeric(12,2),
  estimated_cost numeric(12,2),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_jobs_customer on jobs(customer_id);
create index idx_jobs_status on jobs(status);
create index idx_jobs_site on jobs(site_id);
create trigger trg_jobs_updated_at before update on jobs
  for each row execute function set_updated_at();

alter table enquiries add constraint fk_enquiries_converted_job foreign key (converted_job_id) references jobs(id);
alter table enquiries add constraint fk_enquiries_converted_quote foreign key (converted_quote_id) references quotes(id);
alter table quotes add constraint fk_quotes_converted_job foreign key (converted_job_id) references jobs(id);

create table job_assignments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  profile_id uuid references profiles(id),
  subcontractor_id uuid, -- fk added after subcontractors table
  role_on_job text,
  created_at timestamptz not null default now(),
  constraint chk_assignee_present check (profile_id is not null or subcontractor_id is not null)
);
create index idx_job_assignments_job on job_assignments(job_id);
create index idx_job_assignments_profile on job_assignments(profile_id);

create table job_tasks (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  title text not null,
  description text,
  assigned_to uuid references profiles(id),
  due_date date,
  priority task_priority not null default 'medium',
  status job_task_status not null default 'to_do',
  notes text,
  sort_order int not null default 0,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_job_tasks_job on job_tasks(job_id);
create index idx_job_tasks_assigned_to on job_tasks(assigned_to);
create trigger trg_job_tasks_updated_at before update on job_tasks
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- SUBCONTRACTORS  (after job_assignments so we can add the FK)
-- ----------------------------------------------------------------------------
create table subcontractors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company_name text,
  trade text,
  phone text,
  email text,
  day_rate numeric(10,2),
  hourly_rate numeric(10,2),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger trg_subcontractors_updated_at before update on subcontractors
  for each row execute function set_updated_at();

alter table job_assignments
  add constraint fk_job_assignments_subcontractor foreign key (subcontractor_id) references subcontractors(id);

-- ----------------------------------------------------------------------------
-- APPOINTMENTS / SCHEDULE
-- ----------------------------------------------------------------------------
create table appointments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  site_id uuid references sites(id),
  title text,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status appointment_status not null default 'scheduled',
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_appointment_time check (ends_at > starts_at)
);
create index idx_appointments_job on appointments(job_id);
create index idx_appointments_starts_at on appointments(starts_at);
create trigger trg_appointments_updated_at before update on appointments
  for each row execute function set_updated_at();

create table appointment_assignments (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  profile_id uuid references profiles(id),
  subcontractor_id uuid references subcontractors(id),
  created_at timestamptz not null default now(),
  constraint chk_appt_assignee_present check (profile_id is not null or subcontractor_id is not null)
);
create index idx_appt_assignments_appointment on appointment_assignments(appointment_id);
create index idx_appt_assignments_profile on appointment_assignments(profile_id);
-- Prevent the same employee being double-booked for overlapping appointments
-- is enforced in the application layer (needs range overlap check across rows);
-- this index supports that check efficiently.
create index idx_appt_assignments_profile_time on appointment_assignments(profile_id, appointment_id);

-- ----------------------------------------------------------------------------
-- TIMESHEETS
-- ----------------------------------------------------------------------------
create table timesheets (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  profile_id uuid not null references profiles(id),
  started_at timestamptz not null,
  ended_at timestamptz,
  break_minutes int not null default 0,
  duration_minutes int generated always as (
    case when ended_at is not null
      then greatest(0, (extract(epoch from (ended_at - started_at)) / 60)::int - break_minutes)
      else null
    end
  ) stored,
  is_manual_entry boolean not null default false,
  notes text,
  is_approved boolean not null default false,
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_timesheets_job on timesheets(job_id);
create index idx_timesheets_profile on timesheets(profile_id);
create trigger trg_timesheets_updated_at before update on timesheets
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- NOTES / PHOTOS / DOCUMENTS / ACTIVITY
-- ----------------------------------------------------------------------------
create table job_notes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  author_id uuid references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);
create index idx_job_notes_job on job_notes(job_id);

create table job_photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  storage_path text not null,
  category photo_category not null default 'other',
  description text,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index idx_job_photos_job on job_photos(job_id);

create table documents (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade,
  customer_id uuid references customers(id),
  filename text not null,
  storage_path text not null,
  category document_category not null default 'other',
  description text,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index idx_documents_job on documents(job_id);
create index idx_documents_customer on documents(customer_id);

create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade,
  actor_id uuid references profiles(id),
  action text not null,
  detail text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index idx_activity_logs_job on activity_logs(job_id);
create index idx_activity_logs_created_at on activity_logs(created_at desc);

-- ----------------------------------------------------------------------------
-- SUPPLIERS / PURCHASE ORDERS / JOB COSTS
-- ----------------------------------------------------------------------------
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  phone text,
  email text,
  address text,
  account_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger trg_suppliers_updated_at before update on suppliers
  for each row execute function set_updated_at();

create table purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text not null unique,
  supplier_id uuid not null references suppliers(id),
  job_id uuid references jobs(id),
  issue_date date not null default current_date,
  expected_delivery_date date,
  status po_status not null default 'draft',
  vat_rate numeric(5,2) not null default 20.00,
  subtotal numeric(12,2) not null default 0,
  vat_total numeric(12,2) not null default 0,
  grand_total numeric(12,2) not null default 0,
  notes text,
  created_by uuid references profiles(id),
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_purchase_orders_job on purchase_orders(job_id);
create index idx_purchase_orders_supplier on purchase_orders(supplier_id);
create trigger trg_purchase_orders_updated_at before update on purchase_orders
  for each row execute function set_updated_at();

create table purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references purchase_orders(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  vat_rate numeric(5,2) not null default 20.00,
  line_total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);
create index idx_po_items_po on purchase_order_items(purchase_order_id);

create table job_costs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  category job_cost_category not null,
  item text not null,
  supplier_id uuid references suppliers(id),
  purchase_order_id uuid references purchase_orders(id),
  quantity numeric(10,2) not null default 1,
  unit_cost numeric(12,2) not null default 0,
  vat_rate numeric(5,2) not null default 20.00,
  total numeric(12,2) not null default 0,
  receipt_storage_path text,
  added_by uuid references profiles(id),
  incurred_date date not null default current_date,
  created_at timestamptz not null default now()
);
create index idx_job_costs_job on job_costs(job_id);

-- ----------------------------------------------------------------------------
-- INVOICES / PAYMENTS
-- ----------------------------------------------------------------------------
create table invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  customer_id uuid not null references customers(id),
  site_id uuid references sites(id),
  job_id uuid references jobs(id),
  kind invoice_kind not null default 'standard',
  issue_date date not null default current_date,
  due_date date not null,
  notes text,
  terms text,
  vat_rate numeric(5,2) not null default 20.00,
  subtotal numeric(12,2) not null default 0,
  vat_total numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  status invoice_status not null default 'draft',
  sent_at timestamptz,
  viewed_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_invoices_customer on invoices(customer_id);
create index idx_invoices_job on invoices(job_id);
create index idx_invoices_status on invoices(status);
create trigger trg_invoices_updated_at before update on invoices
  for each row execute function set_updated_at();

create table invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  sort_order int not null default 0,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  vat_rate numeric(5,2) not null default 20.00,
  line_total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);
create index idx_invoice_items_invoice on invoice_items(invoice_id);

create table payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  amount numeric(12,2) not null,
  paid_date date not null default current_date,
  method payment_method not null default 'bank_transfer',
  reference text,
  notes text,
  recorded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index idx_payments_invoice on payments(invoice_id);

-- Keep invoice.amount_paid / status in sync with payments automatically.
create or replace function recalc_invoice_paid_status()
returns trigger as $$
declare
  v_invoice_id uuid;
  v_total numeric(12,2);
  v_paid numeric(12,2);
begin
  v_invoice_id := coalesce(new.invoice_id, old.invoice_id);
  select total into v_total from invoices where id = v_invoice_id;
  select coalesce(sum(amount), 0) into v_paid from payments where invoice_id = v_invoice_id;

  update invoices
  set amount_paid = v_paid,
      status = case
        when v_paid <= 0 then (case when status = 'draft' then status else status end)
        when v_paid >= v_total then 'paid'::invoice_status
        else 'part_paid'::invoice_status
      end
  where id = v_invoice_id;

  return null;
end;
$$ language plpgsql;

create trigger trg_payments_recalc
after insert or update or delete on payments
for each row execute function recalc_invoice_paid_status();

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS
-- ----------------------------------------------------------------------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text,
  link_path text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notifications_profile on notifications(profile_id, is_read);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table profiles enable row level security;
alter table company_settings enable row level security;
alter table customers enable row level security;
alter table customer_contacts enable row level security;
alter table sites enable row level security;
alter table enquiries enable row level security;
alter table quotes enable row level security;
alter table quote_items enable row level security;
alter table quote_item_templates enable row level security;
alter table jobs enable row level security;
alter table job_assignments enable row level security;
alter table job_tasks enable row level security;
alter table subcontractors enable row level security;
alter table appointments enable row level security;
alter table appointment_assignments enable row level security;
alter table timesheets enable row level security;
alter table job_notes enable row level security;
alter table job_photos enable row level security;
alter table documents enable row level security;
alter table activity_logs enable row level security;
alter table suppliers enable row level security;
alter table purchase_orders enable row level security;
alter table purchase_order_items enable row level security;
alter table job_costs enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table payments enable row level security;
alter table notifications enable row level security;

-- PROFILES: everyone signed in can see teammates (needed for assignment UI);
-- only admins can edit others, users can edit their own basic fields.
create policy profiles_select_all on profiles for select using (auth.uid() is not null);
create policy profiles_update_self on profiles for update using (id = auth.uid());
create policy profiles_admin_all on profiles for all using (is_admin()) with check (is_admin());

-- COMPANY SETTINGS: admins manage; everyone signed-in can read (needed for
-- branding/VAT rate on quotes, invoices etc).
create policy company_settings_select on company_settings for select using (auth.uid() is not null);
create policy company_settings_admin_write on company_settings for all using (is_admin()) with check (is_admin());

-- CUSTOMERS / SITES / CONTACTS / ENQUIRIES / QUOTES: full access for
-- admin+office; tradespeople/subcontractors only see customers/sites tied to
-- a job they are assigned to.
create policy customers_office_all on customers for all using (is_admin_or_office()) with check (is_admin_or_office());
create policy customers_assigned_read on customers for select using (
  exists (
    select 1 from jobs j
    join job_assignments ja on ja.job_id = j.id
    where j.customer_id = customers.id and ja.profile_id = auth.uid()
  )
);

create policy sites_office_all on sites for all using (is_admin_or_office()) with check (is_admin_or_office());
create policy sites_assigned_read on sites for select using (
  exists (
    select 1 from jobs j join job_assignments ja on ja.job_id = j.id
    where j.site_id = sites.id and ja.profile_id = auth.uid()
  )
);

create policy customer_contacts_office_all on customer_contacts for all using (is_admin_or_office()) with check (is_admin_or_office());

create policy enquiries_office_all on enquiries for all using (is_admin_or_office()) with check (is_admin_or_office());
create policy enquiries_assigned_read on enquiries for select using (assigned_to = auth.uid());

create policy quotes_office_all on quotes for all using (is_admin_or_office()) with check (is_admin_or_office());
create policy quote_items_office_all on quote_items for all using (is_admin_or_office()) with check (is_admin_or_office());
create policy quote_item_templates_office_all on quote_item_templates for all using (is_admin_or_office()) with check (is_admin_or_office());

-- JOBS: office+admin full access. Assigned tradespeople/subcontractors can
-- read+update (status/progress) only jobs they are assigned to — no delete.
create policy jobs_office_all on jobs for all using (is_admin_or_office()) with check (is_admin_or_office());
create policy jobs_assigned_select on jobs for select using (
  exists (select 1 from job_assignments ja where ja.job_id = jobs.id and ja.profile_id = auth.uid())
);
create policy jobs_assigned_update on jobs for update using (
  exists (select 1 from job_assignments ja where ja.job_id = jobs.id and ja.profile_id = auth.uid())
) with check (
  exists (select 1 from job_assignments ja where ja.job_id = jobs.id and ja.profile_id = auth.uid())
);

create policy job_assignments_office_all on job_assignments for all using (is_admin_or_office()) with check (is_admin_or_office());
create policy job_assignments_self_select on job_assignments for select using (profile_id = auth.uid());

create policy job_tasks_office_all on job_tasks for all using (is_admin_or_office()) with check (is_admin_or_office());
create policy job_tasks_assigned_all on job_tasks for all using (
  exists (select 1 from job_assignments ja where ja.job_id = job_tasks.job_id and ja.profile_id = auth.uid())
) with check (
  exists (select 1 from job_assignments ja where ja.job_id = job_tasks.job_id and ja.profile_id = auth.uid())
);

create policy subcontractors_office_all on subcontractors for all using (is_admin_or_office()) with check (is_admin_or_office());

create policy appointments_office_all on appointments for all using (is_admin_or_office()) with check (is_admin_or_office());
create policy appointments_assigned_select on appointments for select using (
  exists (
    select 1 from appointment_assignments aa
    where aa.appointment_id = appointments.id and aa.profile_id = auth.uid()
  )
);
create policy appointment_assignments_office_all on appointment_assignments for all using (is_admin_or_office()) with check (is_admin_or_office());
create policy appointment_assignments_self_select on appointment_assignments for select using (profile_id = auth.uid());

-- TIMESHEETS: office/admin see & approve all; individuals manage their own.
create policy timesheets_office_all on timesheets for all using (is_admin_or_office()) with check (is_admin_or_office());
create policy timesheets_self_all on timesheets for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- NOTES / PHOTOS / DOCUMENTS: office/admin full; assigned crew can
-- create/read on their jobs.
create policy job_notes_office_all on job_notes for all using (is_admin_or_office()) with check (is_admin_or_office());
create policy job_notes_assigned_all on job_notes for all using (
  exists (select 1 from job_assignments ja where ja.job_id = job_notes.job_id and ja.profile_id = auth.uid())
) with check (
  exists (select 1 from job_assignments ja where ja.job_id = job_notes.job_id and ja.profile_id = auth.uid())
);

create policy job_photos_office_all on job_photos for all using (is_admin_or_office()) with check (is_admin_or_office());
create policy job_photos_assigned_all on job_photos for all using (
  exists (select 1 from job_assignments ja where ja.job_id = job_photos.job_id and ja.profile_id = auth.uid())
) with check (
  exists (select 1 from job_assignments ja where ja.job_id = job_photos.job_id and ja.profile_id = auth.uid())
);

create policy documents_office_all on documents for all using (is_admin_or_office()) with check (is_admin_or_office());
create policy documents_assigned_select on documents for select using (
  job_id is not null and exists (
    select 1 from job_assignments ja where ja.job_id = documents.job_id and ja.profile_id = auth.uid()
  )
);

create policy activity_logs_office_all on activity_logs for select using (is_admin_or_office());
create policy activity_logs_assigned_select on activity_logs for select using (
  job_id is not null and exists (
    select 1 from job_assignments ja where ja.job_id = activity_logs.job_id and ja.profile_id = auth.uid()
  )
);
create policy activity_logs_insert on activity_logs for insert with check (auth.uid() is not null);
-- No update/delete policy = activity logs are effectively append-only.

-- FINANCIAL TABLES: office/admin only. Tradespeople/subcontractors get no
-- access at all — enforced here, not just hidden in the UI.
create policy suppliers_office_all on suppliers for all using (is_admin_or_office()) with check (is_admin_or_office());
create policy purchase_orders_office_all on purchase_orders for all using (is_admin_or_office()) with check (is_admin_or_office());
create policy po_items_office_all on purchase_order_items for all using (is_admin_or_office()) with check (is_admin_or_office());
create policy job_costs_office_all on job_costs for all using (is_admin_or_office()) with check (is_admin_or_office());
-- Tradespeople may still log a material cost against their own job (quantity/item),
-- but cannot read cost/margin data back.
create policy job_costs_assigned_insert on job_costs for insert with check (
  exists (select 1 from job_assignments ja where ja.job_id = job_costs.job_id and ja.profile_id = auth.uid())
);

create policy invoices_office_all on invoices for all using (is_admin_or_office()) with check (is_admin_or_office());
create policy invoice_items_office_all on invoice_items for all using (is_admin_or_office()) with check (is_admin_or_office());
create policy payments_office_all on payments for all using (is_admin_or_office()) with check (is_admin_or_office());

-- NOTIFICATIONS: users see & manage only their own.
create policy notifications_self_all on notifications for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Auto-create a profile row when a new auth user is created.
-- ----------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'tradesperson')
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
