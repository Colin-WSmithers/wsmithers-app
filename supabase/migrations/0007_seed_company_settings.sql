-- ============================================================================
-- Seed the company_settings singleton row if it's missing.
--
-- Found in the wild: 0001_init.sql creates the company_settings table but
-- never inserts a row into it, and the Settings page can only UPDATE an
-- existing row ("Company settings record not found" otherwise) — there is
-- no path in the app that INSERTs the first one. Every document-numbering
-- call (jobs, quotes, invoices, purchase orders) does
-- `select id into v_settings_id from company_settings limit 1 for update`
-- and raises "company_settings row is missing" when the table is empty, so
-- on a project where the optional demo seed (supabase/seed/seed.sql) was
-- never run, nobody — not even an admin — can create a single job, quote,
-- invoice or PO. This inserts one default row, and only if none exists
-- already, so it's a no-op on any project that already has one (e.g. from
-- the demo seed).
-- ============================================================================

insert into company_settings (company_name)
select 'W Smithers and Sons'
where not exists (select 1 from company_settings);
