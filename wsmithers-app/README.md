# W Smithers and Sons — Job Management Platform

Internal job management platform for a UK trades/building company: enquiry → customer → quote →
job → scheduling → timesheets → materials/costs → invoicing → payment. Built with Next.js 16
(App Router), TypeScript, Tailwind CSS, and Supabase (Postgres, Auth, Storage, Row Level Security).

This repository currently implements **Phase 1 — Foundation**: authentication, role-based
permissions, the responsive app shell (desktop sidebar + mobile bottom nav), the full database
schema for every phase, the operational dashboard, company settings, a real jobs list/detail view,
and the mobile-first "Today" screen for tradespeople. Sections not yet built (Enquiries, Customers,
Quotes, Scheduling, Timesheets, Purchase Orders, Invoices, etc.) show an honest "Arrives in Phase N"
placeholder rather than a broken or fake page — see `IMPLEMENTATION_PHASES` below.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com), create a new project (choose a region close to the
   UK, e.g. `eu-west-2`/London if available).
2. In **Project Settings → API**, copy the **Project URL** and the **anon public** key.
3. Copy `.env.local.example` to `.env.local` and paste those two values in.

```bash
cp .env.local.example .env.local
```

## 2. Apply the database schema

Install the Supabase CLI if you don't have it (`npm install -g supabase`), then from this
project's root:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

This runs the two migration files in `supabase/migrations/` in order:

- `0001_init.sql` — every table, enum, index, trigger and Row Level Security policy for the
  whole application (all phases — the schema is built up front so later phases don't need
  breaking migrations).
- `0002_storage_and_numbering.sql` — Storage buckets (`job-photos`, `documents`,
  `company-assets`) and the atomic `JOB-0001` / `Q-0001` / `INV-0001` / `PO-0001` numbering
  function.

If you'd rather not install the CLI, paste the contents of both files into the Supabase
dashboard's **SQL Editor** and run them in order instead.

## 3. Create your staff logins

Auth users aren't created by SQL — create them from **Authentication → Users → Add user** in the
Supabase dashboard (or via `supabase.auth.admin.createUser` from a script). A `profiles` row is
created automatically for each new user (see the `handle_new_user()` trigger), defaulting to the
`tradesperson` role. To set someone's role/name at creation time, pass user metadata:

```json
{ "full_name": "Alice Office", "role": "office" }
```

Valid roles: `admin`, `office`, `tradesperson`, `subcontractor`. You can also update the `role`
column directly on the `profiles` table afterwards (as an admin, or directly in the SQL editor for
your very first admin user — there's a chicken-and-egg problem for user #1 since only admins can
edit other admins' profiles via the app).

## 4. Load demo data (optional)

`supabase/seed/seed.sql` adds realistic UK trades-company demo data — customers, sites,
enquiries, quotes, jobs, suppliers, a purchase order, job costs and invoices. Run it after you've
created at least one staff auth user, via the SQL Editor or:

```bash
supabase db execute --file supabase/seed/seed.sql
```

## 5. Run the app

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with a user you created in step 3.
Office/admin users land on `/dashboard`; tradespeople and subcontractors land on the mobile-first
`/today` screen.

## Regenerating accurate types

`src/lib/supabase/types.ts` is hand-written to match the SQL migrations exactly. Once your
Supabase project is live, you can replace it with a generated version (same shape, so no
application code changes are needed) for guaranteed accuracy:

```bash
npx supabase gen types typescript --project-id <your-project-ref> > src/lib/supabase/types.ts
```

## Security model

- **Row Level Security is the real permission boundary**, not just hidden UI. Every table has RLS
  policies (see `0001_init.sql`) — e.g. a `tradesperson` role can only ever read/update jobs they're
  assigned to, and financial tables (invoices, payments, job costs, purchase orders) are
  admin/office-only at the database level, so a UI bug can't leak that data.
- Auth/session handling uses `@supabase/ssr` with `proxy.ts` (Next.js 16's renamed
  `middleware.ts`) refreshing the session on every request.
- All mutations go through Zod-validated Server Actions (see `src/lib/validation/`), never
  client-side-only validation.

## Project structure

```
src/
  app/
    login/                 Public login page + server action
    (app)/                 Authenticated route group (sidebar/topbar/mobile nav layout)
      dashboard/           Office/admin operational dashboard
      today/                Mobile-first "Today" screen for tradespeople/subcontractors
      jobs/                 Job list + job detail (read-only in Phase 1)
      settings/             Admin-only company settings
      enquiries/ customers/ quotes/ schedule/ timesheets/
      purchase-orders/ invoices/ staff/ subcontractors/ reports/ documents/
                            Phase 2–7 sections (honest "coming soon" placeholders for now)
  components/
    ui/                    Hand-written shadcn/ui-style primitives (button, card, table, dialog…)
    shared/                App-wide building blocks (sidebar, topbar, stat card, empty state…)
  lib/
    data/                  Server-only data-access layer, one module per domain area
    validation/            Zod schemas
    supabase/              Browser/server/proxy Supabase clients + hand-written DB types
supabase/
  migrations/               Full SQL schema (all phases) + storage/numbering
  seed/                     Realistic UK demo data
```

## A note on the shadcn/ui components

The `shadcn` CLI registry (`ui.shadcn.com`) wasn't reachable from the sandbox this was built in,
so the components in `src/components/ui/` were hand-written in the same style/convention shadcn
itself uses (plain code built on Radix primitives + `class-variance-authority`, not a runtime
dependency) rather than generated by the CLI. Functionally identical — you can still run
`npx shadcn@latest add <component>` yourself later to add more, or to regenerate these against
the latest registry versions.

## Roadmap

See the implementation phases in the original brief: Phase 2 (CRM: customers/enquiries), Phase 3
(job management: tasks/notes/photos/documents), Phase 4 (scheduling), Phase 5 (timesheets/costs),
Phase 6 (quotes/invoices/purchase orders), Phase 7 (search/notifications/reporting/polish).
