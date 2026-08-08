# W Smithers and Sons — Job Management Platform

Internal job management platform for a UK trades/building company: enquiry → customer → quote →
job → scheduling → timesheets → materials/costs → invoicing → payment. Built with Next.js 16
(App Router), TypeScript, Tailwind CSS, and Supabase (Postgres, Auth, Storage, Row Level Security).

This repository implements the full 7-phase spec — **Phase 1 — Foundation**, **Phase 2 — CRM**,
**Phase 3 — Job Management**, **Phase 4 — Scheduling**, **Phase 5 — Time & Costs**,
**Phase 6 — Quotes/Invoices/Purchase Orders** and **Phase 7 — Polish**: authentication,
role-based permissions, the responsive app shell (desktop sidebar + mobile bottom nav), the full
database schema, the operational dashboard, company settings, a full Customers CRM (search,
create, sites, contacts) and Enquiries (log, filter by status, status updates, convert-to-customer),
full job management (create a job, assign staff, and a job workspace with Tasks, Notes, Photos,
Documents and a Team tab), a weekly **Schedule** with double-booking prevention when assigning
staff or subcontractors to appointments, and **Timesheets** (clock in/out on a job from your
phone, or add a manual entry; office approves hours) plus **job Costs** (materials/labour/
subcontractor spend logged per job — visible only to office/admin at the database level, though
anyone assigned can log one). The mobile-first "Today" screen lists a tradesperson's appointments
and assigned jobs, with a working "Clock in" shortcut.

Phase 6 adds **Suppliers** and **Purchase Orders**, **Quotes** (with a real accept-a-quote flow
that creates a job, links it back to the quote/enquiry, and notifies the office), and
**Invoices** (deposit/progress/final, recording payments, with `part_paid`/`paid` handled
automatically by a database trigger on payment). Phase 7 adds **Staff** management (admin-only
role/active toggles), **Subcontractor** records and assignment (to jobs and appointments,
alongside staff), an in-app **notifications** dropdown (assignment/new-task/new-appointment
alerts, mark-as-read), a working global **search** across jobs/customers/enquiries/quotes/
invoices/purchase orders, a **Reports** page (revenue, outstanding/overdue invoices, quote
conversion rate, job profitability, staff hours), a daily **Vercel Cron** job that flips
overdue invoices to `overdue` status and notifies the office (see "Overdue invoice cron" below —
it does not send email, since no email provider is wired up), and an **AI end-of-day summary**:
a second daily cron job asks Claude to turn the day's real activity (jobs completed, hours
logged, quotes/invoices sent, payments received, overdue balances) into a short plain-English
recap, shown as a card on the office/admin dashboard (see "AI end-of-day summary" below).

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

This runs the five migration files in `supabase/migrations/` in order:

- `0001_init.sql` — every table, enum, index, trigger and Row Level Security policy for the
  whole application (all phases — the schema is built up front so later phases don't need
  breaking migrations).
- `0002_storage_and_numbering.sql` — Storage buckets (`job-photos`, `documents`,
  `company-assets`) and the atomic `JOB-0001` / `Q-0001` / `INV-0001` / `PO-0001` numbering
  function.
- `0003_notifications_policy.sql` — Adds an RLS policy so office/admin actions (assigning someone
  to a job, creating a task, scheduling an appointment, accepting a quote, the overdue-invoice
  cron) can create a notification row for *another* user — the original Phase 1 policy only ever
  let a user manage their own notifications.
- `0004_daily_summaries.sql` — Adds the `daily_summaries` table the AI end-of-day summary cron
  writes to, readable by office/admin only (see "AI end-of-day summary" below).
- `0005_security_and_integrity.sql` — **required.** Security and data-integrity fixes found in a
  full backend audit. Three of them matter a great deal:
  - `next_document_number()` had no `security definer`, so it ran as the caller. Only admins can
    write `company_settings`, so for an **office** user the counter update silently matched zero
    rows and the function returned NULL — meaning office staff could not create a single job,
    quote, invoice or purchase order. Admins were unaffected, which is why it survives casual
    testing.
  - `profiles_update_self` had no `WITH CHECK`, so Postgres reused the `USING` clause as the
    check and left the `role` column unconstrained. Since the anon key is (by design) in the
    client bundle, any signed-in tradesperson could have promoted themselves to admin with a
    single REST call.
  - `is_active` was written by the Staff screen but never read anywhere, so deactivating someone
    revoked nothing — a sacked employee kept full access until their password changed.

  It also stops crew self-approving timesheets, adds money constraints (no negative quantities or
  >100% VAT), makes one quote convertible to exactly one job, and scopes Storage writes to a job
  the uploader can actually see.

If you already ran `0001`–`0004` for an earlier phase, you only need to run `0005` now.

If you'd rather not install the CLI, paste the contents of the files into the Supabase
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

## Overdue invoice cron

`vercel.json` schedules `GET /api/cron/mark-overdue` to run daily at 06:00 UTC once you deploy to
Vercel — no separate setup needed for the schedule itself. It flips any `sent`/`viewed`/
`part_paid` invoice past its due date to `overdue` and creates an in-app notification for
office/admin staff. It does **not** send an email or SMS to anyone — hooking up real reminder
emails would need an email provider (e.g. Resend or Postmark) wired up separately, which is
deliberately not faked here.

The route needs two extra environment variables (add these in Vercel's Project Settings →
Environment Variables, alongside the two Supabase ones you already set):

- `SUPABASE_SERVICE_ROLE_KEY` — the **service_role** secret key from Supabase Project Settings →
  API. This bypasses Row Level Security, so it's deliberately not prefixed `NEXT_PUBLIC_` and is
  only ever read server-side, from the cron route. Never expose this key to the browser.
- `CRON_SECRET` — any random string you choose. Vercel automatically sends
  `Authorization: Bearer <CRON_SECRET>` on its own scheduled cron requests once this env var is
  set, and the route rejects any request without a matching header. If you leave this unset the
  route still works but is unauthenticated — fine for local testing, not recommended in
  production.

## AI end-of-day summary

`vercel.json` schedules `GET /api/cron/end-of-day-summary` to run at 18:00 UTC on weekdays. Each
run:

1. Queries Postgres directly for that day's real activity — jobs completed/started, tasks
   completed, notes/photos added, appointments completed, hours logged (timesheets), quotes sent/
   accepted, invoices sent, payments received, costs logged, new enquiries, and the current
   overdue-invoice total.
2. Sends those exact figures to Claude (via the Anthropic API) with instructions to write a
   short (3–6 sentence) plain-English recap and to only mention things that actually happened — a
   metric of zero is left out rather than turned into a sentence, so the summary can't imply
   activity that didn't occur.
3. Saves the recap to the `daily_summaries` table (one row per day) and notifies office/admin via
   the notifications bell.

The dashboard shows the most recent saved summary as a card, visible to office/admin only — it's
never generated live from the browser, and a tradesperson's dashboard never calls the Anthropic
API or sees this card, matching the same financial-data boundary as Reports.

This needs one more environment variable, again in Vercel's Project Settings → Environment
Variables:

- `ANTHROPIC_API_KEY` — a key from [console.anthropic.com](https://console.anthropic.com). Each
  run is one short API call (roughly a few hundred tokens in, a few hundred out), so cost per day
  is a fraction of a cent — but you do need a funded Anthropic Console account for this to work in
  production.
- `ANTHROPIC_SUMMARY_MODEL` (optional) — overrides the Claude model used (defaults to
  `claude-sonnet-4-5-20250929`). Only set this if you want a different model.

If `ANTHROPIC_API_KEY` isn't set, the route returns an error and simply doesn't save a summary for
that day — it never fakes one, and the dashboard card shows "No summary yet" until the next
successful run.

You can trigger a run manually any time (e.g. to test locally) by hitting the route directly:

```bash
curl "http://localhost:3000/api/cron/end-of-day-summary"
```

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
      jobs/                 Job list, create (with crew assignment), and a full job workspace
                            (Overview, Tasks, Notes, Photos, Documents, Timesheets, Costs, Team tabs)
      settings/             Admin-only company settings
      customers/            Customer list/search, create, detail (sites + contacts + real jobs list)
      enquiries/            Enquiry list/status filter, create, detail (status update, convert-to-customer)
      documents/             Global searchable documents list (every job document you have access to)
      schedule/              Weekly appointment calendar, create/assign/cancel, overlap prevention
      timesheets/            Clock in/out, manual entries, office approval queue
      quotes/                Quote list/create/detail, status updates, accept-quote-to-job flow
      purchase-orders/       Suppliers + purchase order list/create/detail, status updates
      invoices/              Invoice list/create/detail, record payments
      staff/                 Admin-only staff list, role/active edits
      subcontractors/        Subcontractor records, active toggle, job/appointment assignment
      reports/               Revenue/outstanding/overdue/job-profitability/staff-hours reporting
      search/                Global search results across jobs/customers/enquiries/quotes/invoices/POs
    api/
      cron/mark-overdue/          Vercel Cron route — see "Overdue invoice cron" above
      cron/end-of-day-summary/    Vercel Cron route — see "AI end-of-day summary" above
  components/
    ui/                    Hand-written shadcn/ui-style primitives (button, card, table, dialog…)
    shared/                App-wide building blocks (sidebar, topbar w/ notifications, stat card, empty state…)
  lib/
    data/                  Server-only data-access layer, one module per domain area (incl.
                            dashboard.ts's getLatestDailySummary())
    validation/            Zod schemas
    supabase/              Browser/server/proxy/admin Supabase clients + hand-written DB types
supabase/
  migrations/               Full SQL schema (all phases) + storage/numbering + notifications policy
                            + daily_summaries table
  seed/                     Realistic UK demo data
```

## Design system

The interface is built around the company's own identity rather than a generic admin theme. The
brand terracotta is lifted straight from the logo (`#c63e29`, exposed as the `brand-*` scale in
`src/app/globals.css`), and the neutral ramp is a warm stone (`ink-*`) rather than the cool
blue-grey most component libraries ship with, so the two sit together instead of fighting.

Type is Outfit for display (page titles, figures, the small letter-spaced uppercase "eyebrow"
labels that echo the `EST. 1955` lockup) over Inter for everything else. Both are self-hosted via
`@fontsource-variable/*` npm packages rather than `next/font/google`, so there's no build-time
fetch to Google and no third-party request at runtime.

The logo assets live in `public/`: `logo.png` is the full lockup used on the login screen, and
`mark.png` is the monogram alone, used in the sidebar, the mobile header and as the favicon.

Shared building blocks worth knowing about:

- `components/shared/page-header.tsx` — the standard masthead (eyebrow / title / description /
  actions slot) used across pages.
- `components/shared/stat-card.tsx` — KPI tile with tonal variants (`default`, `brand`, `warning`,
  `danger`) and tabular figures.
- `components/shared/logo.tsx` — `LogoMark` and `LogoLockup`.
- The `.eyebrow`, `.page-title` and `.tnum` utility classes in `globals.css`.

## A note on the shadcn/ui components

The `shadcn` CLI registry (`ui.shadcn.com`) wasn't reachable from the sandbox this was built in,
so the components in `src/components/ui/` were hand-written in the same style/convention shadcn
itself uses (plain code built on Radix primitives + `class-variance-authority`, not a runtime
dependency) rather than generated by the CLI. Functionally identical — you can still run
`npx shadcn@latest add <component>` yourself later to add more, or to regenerate these against
the latest registry versions.

## Roadmap

All 7 phases are done: Phase 1 (foundation), Phase 2 (CRM: customers/enquiries), Phase 3 (job
management: tasks/notes/photos/documents), Phase 4 (scheduling), Phase 5 (timesheets/costs),
Phase 6 (quotes/invoices/purchase orders, including the accept-a-quote-becomes-a-job flow and the
automatic paid/part-paid invoice trigger), Phase 7 (staff/subcontractor management, notifications,
global search, reporting, and the overdue-invoice cron). On top of the 7 phases: an **AI
end-of-day summary**, generated daily from real activity data (see above).

Deliberately out of scope, and not faked anywhere in the UI: sending real emails/SMS (invoice
reminders, quote-sent notifications to customers) — that needs an email provider like Resend or
Postmark wired up as a follow-on; and a Sage (or other accounting package) export/sync
integration. Both were flagged as follow-on work rather than part of the original 7-phase brief,
and remain so — only the AI end-of-day summary was pulled forward and built.

## No new database changes for Phases 4–5

Phases 4 and 5 use tables and Storage buckets that were already created by the two migration files
you ran during setup (`0001_init.sql` and `0002_storage_and_numbering.sql`) — there's nothing new
to run in the Supabase SQL Editor for those two phases.

## Timezone handling

The server and database run in UTC but the business runs in UK local time, and the UK is on BST
(UTC+1) for roughly seven months of the year. Deriving "today" from `toISOString()` or
`setHours(0,0,0,0)` therefore puts the day boundary an hour late all summer: a shift clocked at
00:30 BST would be counted against the previous day. Every day/week/month boundary in the app goes
through the `london*` helpers in `src/lib/utils.ts` instead, which pin boundaries to actual London
local time and handle both DST changeover days (the 23-hour and 25-hour days) correctly.

## Database changes for Phase 7 and the AI summary

Phase 6 needs no new SQL — it only uses tables already created by `0001_init.sql`. Phase 7 needs
`0003_notifications_policy.sql`, the AI end-of-day summary needs `0004_daily_summaries.sql`, and
`0005_security_and_integrity.sql` is required for the app to work correctly for office staff at
all (see step 2 above) — run whichever of those you haven't already in the SQL Editor, then
redeploy the updated code (push to GitHub — Vercel will rebuild automatically) and add the
environment
variables described in "Overdue invoice cron" and "AI end-of-day summary" above.
