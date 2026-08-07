-- ============================================================================
-- Demo data for W Smithers and Sons
-- Run AFTER creating auth users for the demo staff (see README) so that
-- profiles rows already exist (created automatically by the
-- handle_new_user() trigger). This file seeds company settings plus
-- customers/sites/enquiries/quotes/jobs — it does not create auth users.
-- ============================================================================

insert into company_settings (
  company_name, address_line1, city, postcode, phone, email,
  company_number, vat_number, default_vat_rate,
  quote_terms, invoice_terms, payment_details
) values (
  'W Smithers and Sons',
  '14 Mount Pleasant Road',
  'Tunbridge Wells',
  'TN1 1QU',
  '01892 555 0142',
  'office@wsmithers.co.uk',
  '09876543',
  'GB123456789',
  20.00,
  'Quote valid for 30 days from issue date. 25% deposit required to confirm booking.',
  'Payment due within 14 days of invoice date. Late payments may incur interest under the Late Payment of Commercial Debts Act.',
  'Sort code: 40-47-84  Account: 12345678  Account name: W Smithers and Sons Ltd'
)
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- Customers
-- ----------------------------------------------------------------------------
insert into customers (id, display_name, first_name, last_name, email, phone, billing_address_line1, billing_city, billing_postcode, notes) values
  ('11111111-1111-1111-1111-111111111101', 'James Wilson', 'James', 'Wilson', 'james.wilson@example.co.uk', '07700 900123', '12 High Street', 'Tunbridge Wells', 'TN1 1YT', 'Referred by a previous customer. Prefers phone calls over email.'),
  ('11111111-1111-1111-1111-111111111102', 'Sarah Thompson', 'Sarah', 'Thompson', 'sarah.thompson@example.co.uk', '07700 900456', '44 London Road', 'Sevenoaks', 'TN13 1AR', null),
  ('11111111-1111-1111-1111-111111111103', 'Oakfield Property Management', null, null, 'maintenance@oakfieldpm.example.co.uk', '01732 555 0199', '3 Riverside Business Park', 'Tonbridge', 'TN9 1RA', 'Manages several rental properties — always request a PO number on invoices.'),
  ('11111111-1111-1111-1111-111111111104', 'David Harris', 'David', 'Harris', 'd.harris@example.co.uk', '07700 900789', '9 Southborough Common', 'Southborough', 'TN4 0RE', null);

insert into sites (customer_id, label, address_line1, city, postcode, access_notes) values
  ('11111111-1111-1111-1111-111111111101', 'Home', '12 High Street', 'Tunbridge Wells', 'TN1 1YT', 'Key safe by the front door, code 4471.'),
  ('11111111-1111-1111-1111-111111111102', 'Home', '44 London Road', 'Sevenoaks', 'TN13 1AR', null),
  ('11111111-1111-1111-1111-111111111103', 'Apartment 7, Example House', 'Apartment 7, Example House, 2 Bank Street', 'Tonbridge', 'TN9 1DP', 'Tenant in situ — call ahead 24h.'),
  ('11111111-1111-1111-1111-111111111103', '18 Pembury Road', '18 Pembury Road', 'Tonbridge', 'TN9 2JR', 'Vacant property, keys held at office.'),
  ('11111111-1111-1111-1111-111111111104', 'Home', '9 Southborough Common', 'Southborough', 'TN4 0RE', null);

-- ----------------------------------------------------------------------------
-- Enquiries
-- ----------------------------------------------------------------------------
insert into enquiries (customer_id, first_name, last_name, email, phone, site_address, source, description, estimated_value, date_received, status, next_action_date, notes) values
  ('11111111-1111-1111-1111-111111111104', 'David', 'Harris', 'd.harris@example.co.uk', '07700 900789', '9 Southborough Common, Southborough, TN4 0RE', 'Website', 'Roof repair after storm damage — several slipped tiles and a leak in the loft.', 850.00, current_date - interval '2 days', 'quote_required', current_date + interval '1 day', 'Customer says it is not urgent but would like it done before more rain.'),
  (null, 'Emma', 'Clarke', 'emma.clarke@example.co.uk', '07700 900321', '27 Vale Road, Tunbridge Wells, TN1 1BS', 'Referral', 'Full bathroom refurbishment, ensuite. Wants a site visit to discuss layout.', 6500.00, current_date - interval '5 days', 'site_visit_required', current_date + interval '2 days', 'Referred by James Wilson.');

-- ----------------------------------------------------------------------------
-- Quotes
-- ----------------------------------------------------------------------------
insert into quotes (id, quote_number, customer_id, site_id, issue_date, expiry_date, description, vat_rate, subtotal, vat_total, grand_total, status)
select
  '22222222-2222-2222-2222-222222222201', 'Q-0001', '11111111-1111-1111-1111-111111111101', s.id,
  current_date - interval '10 days', current_date + interval '20 days',
  'Kitchen renovation — supply and fit', 20.00, 8200.00, 1640.00, 9840.00, 'accepted'
from sites s where s.customer_id = '11111111-1111-1111-1111-111111111101' limit 1;

insert into quote_items (quote_id, category, description, quantity, unit, unit_price, vat_rate, line_total) values
  ('22222222-2222-2222-2222-222222222201', 'Labour', 'Kitchen strip-out and installation labour', 1, 'item', 3200.00, 20.00, 3200.00),
  ('22222222-2222-2222-2222-222222222201', 'Materials', 'Kitchen units, worktop and fittings', 1, 'item', 4200.00, 20.00, 4200.00),
  ('22222222-2222-2222-2222-222222222201', 'Electrical work', 'Rewire sockets and under-cabinet lighting', 1, 'item', 500.00, 20.00, 500.00),
  ('22222222-2222-2222-2222-222222222201', 'Waste removal', 'Skip hire and disposal', 1, 'item', 300.00, 20.00, 300.00);

insert into quotes (id, quote_number, customer_id, site_id, issue_date, expiry_date, description, vat_rate, subtotal, vat_total, grand_total, status)
select
  '22222222-2222-2222-2222-222222222202', 'Q-0002', '11111111-1111-1111-1111-111111111103', s.id,
  current_date - interval '3 days', current_date + interval '27 days',
  'Bathroom refurbishment, Apartment 7', 20.00, 4100.00, 820.00, 4920.00, 'sent'
from sites s where s.customer_id = '11111111-1111-1111-1111-111111111103' and s.label like 'Apartment%' limit 1;

insert into quote_item_templates (category, description, default_unit, default_unit_price, default_vat_rate) values
  ('Labour', 'General labour (per day)', 'day', 220.00, 20.00),
  ('Materials', 'Materials allowance', 'item', 0.00, 20.00),
  ('Plant hire', 'Skip hire (8 yard)', 'item', 280.00, 20.00),
  ('Waste removal', 'Waste removal and disposal', 'item', 150.00, 20.00),
  ('Electrical work', 'Rewire — per room', 'room', 450.00, 20.00),
  ('Plumbing', 'Bathroom plumbing installation', 'item', 900.00, 20.00),
  ('Decoration', 'Painting and decorating — per room', 'room', 320.00, 20.00);

-- ----------------------------------------------------------------------------
-- Jobs (converted from the accepted quote, plus a couple of others)
-- ----------------------------------------------------------------------------
insert into jobs (id, job_number, job_name, customer_id, site_id, quote_id, description, status, start_date, expected_completion_date, estimated_value, estimated_cost)
select
  '33333333-3333-3333-3333-333333333301', 'JOB-0001', 'Kitchen Renovation - Tunbridge Wells',
  '11111111-1111-1111-1111-111111111101', s.id, '22222222-2222-2222-2222-222222222201',
  'Full kitchen strip-out and re-fit including new units, worktop and electrics.',
  'in_progress', current_date - interval '4 days', current_date + interval '6 days', 9840.00, 7100.00
from sites s where s.customer_id = '11111111-1111-1111-1111-111111111101' limit 1;

update quotes set converted_job_id = '33333333-3333-3333-3333-333333333301' where id = '22222222-2222-2222-2222-222222222201';

insert into jobs (id, job_number, job_name, customer_id, site_id, description, status, start_date, expected_completion_date, estimated_value, estimated_cost)
select
  '33333333-3333-3333-3333-333333333302', 'JOB-0002', 'Rear Extension - Sevenoaks',
  '11111111-1111-1111-1111-111111111102', s.id,
  'Single-storey rear extension, approx 18sqm, including plastering and first-fix electrics.',
  'scheduled', current_date + interval '10 days', current_date + interval '45 days', 28500.00, 21000.00
from sites s where s.customer_id = '11111111-1111-1111-1111-111111111102' limit 1;

insert into jobs (id, job_number, job_name, customer_id, site_id, description, status, start_date, expected_completion_date, actual_completion_date, estimated_value, estimated_cost)
select
  '33333333-3333-3333-3333-333333333303', 'JOB-0003', 'Roof Repair - Southborough',
  '11111111-1111-1111-1111-111111111104', s.id,
  'Replace slipped tiles, repair felt and check guttering after storm damage.',
  'completed', current_date - interval '20 days', current_date - interval '18 days', current_date - interval '18 days', 850.00, 520.00
from sites s where s.customer_id = '11111111-1111-1111-1111-111111111104' limit 1;

insert into jobs (id, job_number, job_name, customer_id, site_id, description, status, start_date, expected_completion_date, estimated_value, estimated_cost)
select
  '33333333-3333-3333-3333-333333333304', 'JOB-0004', 'Bathroom Refurbishment - Tonbridge',
  '11111111-1111-1111-1111-111111111103', s.id,
  'Full bathroom refit for tenanted apartment — supply and fit only, tenant liaison required.',
  'draft', null, null, 4920.00, null
from sites s where s.customer_id = '11111111-1111-1111-1111-111111111103' and s.label like 'Apartment%' limit 1;

-- Job tasks for the in-progress kitchen job
insert into job_tasks (job_id, title, description, priority, status, sort_order) values
  ('33333333-3333-3333-3333-333333333301', 'Prepare site', 'Protect floors, disconnect appliances', 'medium', 'completed', 1),
  ('33333333-3333-3333-3333-333333333301', 'Remove existing kitchen', 'Strip out old units and worktop', 'high', 'completed', 2),
  ('33333333-3333-3333-3333-333333333301', 'First fix electrics', 'New sockets and lighting circuit', 'high', 'in_progress', 3),
  ('33333333-3333-3333-3333-333333333301', 'Plumbing', 'Reroute sink and dishwasher plumbing', 'medium', 'to_do', 4),
  ('33333333-3333-3333-3333-333333333301', 'Install units', 'Fit base and wall units, worktop', 'medium', 'to_do', 5),
  ('33333333-3333-3333-3333-333333333301', 'Second fix electrics', 'Connect appliances, test circuits', 'medium', 'to_do', 6),
  ('33333333-3333-3333-3333-333333333301', 'Final inspection', 'Snag list and customer walk-through', 'low', 'to_do', 7);

-- Suppliers
insert into suppliers (id, name, contact_name, phone, email, address, account_number) values
  ('44444444-4444-4444-4444-444444444401', 'Wickes Trade — Tunbridge Wells', 'Trade Counter', '01892 555 0111', 'tradecounter.tw@example-wickes.co.uk', 'Longfield Road, Tunbridge Wells, TN2 3EY', 'WS-3391'),
  ('44444444-4444-4444-4444-444444444402', 'Howdens Joinery — Tonbridge', 'Mark Fielding', '01732 555 0122', 'tonbridge@example-howdens.co.uk', 'Vale Road, Tonbridge, TN9 1SW', 'HD-1187');

insert into purchase_orders (id, po_number, supplier_id, job_id, issue_date, expected_delivery_date, status, vat_rate, subtotal, vat_total, grand_total, notes) values
  ('55555555-5555-5555-5555-555555555501', 'PO-0001', '44444444-4444-4444-4444-444444444402', '33333333-3333-3333-3333-333333333301', current_date - interval '6 days', current_date - interval '1 day', 'received', 20.00, 3800.00, 760.00, 4560.00, 'Kitchen units and worktop for Wilson job.');

insert into purchase_order_items (purchase_order_id, description, quantity, unit_price, vat_rate, line_total) values
  ('55555555-5555-5555-5555-555555555501', 'Base and wall unit carcasses', 12, 145.00, 20.00, 1740.00),
  ('55555555-5555-5555-5555-555555555501', 'Laminate worktop, 3m length', 2, 210.00, 20.00, 420.00),
  ('55555555-5555-5555-5555-555555555501', 'Integrated appliance pack', 1, 1640.00, 20.00, 1640.00);

insert into job_costs (job_id, category, item, supplier_id, purchase_order_id, quantity, unit_cost, vat_rate, total, incurred_date) values
  ('33333333-3333-3333-3333-333333333301', 'material', 'Kitchen units and worktop (PO-0001)', '44444444-4444-4444-4444-444444444402', '55555555-5555-5555-5555-555555555501', 1, 4560.00, 20.00, 4560.00, current_date - interval '1 day'),
  ('33333333-3333-3333-3333-333333333301', 'material', 'Electrical consumables', '44444444-4444-4444-4444-444444444401', null, 1, 180.00, 20.00, 180.00, current_date - interval '2 days');

-- Invoice: deposit already raised for the kitchen job
insert into invoices (id, invoice_number, customer_id, site_id, job_id, kind, issue_date, due_date, vat_rate, subtotal, vat_total, total, status)
select
  '66666666-6666-6666-6666-666666666601', 'INV-0001', '11111111-1111-1111-1111-111111111101', s.id, '33333333-3333-3333-3333-333333333301',
  'deposit', current_date - interval '4 days', current_date + interval '10 days', 20.00, 2050.00, 410.00, 2460.00, 'paid'
from sites s where s.customer_id = '11111111-1111-1111-1111-111111111101' limit 1;

insert into invoice_items (invoice_id, description, quantity, unit_price, vat_rate, line_total) values
  ('66666666-6666-6666-6666-666666666601', 'Deposit — 25% of kitchen renovation quote Q-0001', 1, 2050.00, 20.00, 2050.00);

insert into payments (invoice_id, amount, paid_date, method, reference) values
  ('66666666-6666-6666-6666-666666666601', 2460.00, current_date - interval '3 days', 'bank_transfer', 'WILSON-DEP-01');

-- Overdue invoice example (roof repair, completed job)
insert into invoices (id, invoice_number, customer_id, site_id, job_id, kind, issue_date, due_date, vat_rate, subtotal, vat_total, total, status)
select
  '66666666-6666-6666-6666-666666666602', 'INV-0002', '11111111-1111-1111-1111-111111111104', s.id, '33333333-3333-3333-3333-333333333303',
  'final', current_date - interval '25 days', current_date - interval '11 days', 20.00, 708.33, 141.67, 850.00, 'overdue'
from sites s where s.customer_id = '11111111-1111-1111-1111-111111111104' limit 1;

insert into invoice_items (invoice_id, description, quantity, unit_price, vat_rate, line_total) values
  ('66666666-6666-6666-6666-666666666602', 'Roof repair — replace tiles, repair felt, check guttering', 1, 708.33, 20.00, 708.33);
