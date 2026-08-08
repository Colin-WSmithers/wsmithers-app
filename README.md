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
it does not send email, since no email provider is wired up), and **AI end-of-day summaries**:
each weekday evening Claude writes up what happened on every job — from the notes the crew logged
on site and the hours they booked — so the whole team can see where every job stands, plus a
separate office-only money digest (see "AI end-of-day summaries" below).

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

This runs the six migration files in `supabase/migrations/` in order:

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
  writes to.
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

- `0006_daily_summary_kinds.sql` — **required for the summaries.** Splits `daily_summaries` into
  two kinds — `operations` (the job rundown, readable by every signed-in staff member) and
  `financial` (money, office/admin only) — with a kind-aware read policy.

If you already ran `0001`–`0004` for an earlier phase, you only need `0005` and `0006` now.

If you'd rather not install the CLI, paste the contents of the files into the Supabase
dashboard's **SQL Editor** and run them in order instead.

## 3. Create your first admin login

You only ever have to do this once, in the Supabase dashboard — after that, staff are managed
entirely inside the app (see "Managing staff" below).

Go to **Authentication → Users → Add user**, enter an email and password, and — importantly — set
this user metadata so the account comes out as an admin rather than the default `tradesperson`:

```json
{ "full_name": "Colin Smithers", "role": "admin" }
```

A `profiles` row is created automatically by the `handle_new_user()` trigger. If you forget the
metadata, fix it once in the SQL editor:

```sql
update profiles set role = 'admin' where email = 'you@wsmithers.co.uk';
```

(There's a chicken-and-egg problem for user #1 — only an admin can create admins, so the first one
has to come from outside the app.)

## Managing staff

Everyone after that first admin is added from **Staff** inside the app — no Supabase dashboard
required, which matters because that dashboard has no safe "just add a user" permission level to
hand to an office manager.

Admins can:

- **Add a staff member** — name, email, role, job title, phone and hourly rate. The app creates the
  login and shows a one-time first password to pass on. There's no email provider wired up, so
  nothing is emailed: you read the password out or hand it over, and they change it once in.
- **Reset a password** — issues a new one-time password, shown once, for when someone's locked out.
- **Edit** roles, rates and details, and **deactivate** anyone who leaves. Since migration 0005,
  deactivating genuinely revokes access on their next request rather than being cosmetic.

Two guards worth knowing about: you can't demote or deactivate yourself, and you can't remove the
last active admin — either would lock the company out with no route back in through the app.

Valid roles: `admin` (everything, incl. staff and settings), `office` (everything except staff and
settings), `tradesperson` and `subcontractor` (their own jobs, timesheets and photos — no financial
data at all, enforced by RLS rather than just hidden).

This uses `SUPABASE_SERVICE_ROLE_KEY` — the same variable the cron routes need. If it isn't set,
the Staff screen says so plainly instead of failing silently.

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

## AI end-of-day summaries

Two summaries are written each weekday evening (17:00 UTC — 6pm BST / 5pm GMT) by
`GET /api/cron/end-of-day-summary`, and both appear on the dashboard.

**"Today on the jobs"** is the important one, and everyone sees it — office and crew alike. It is
assembled from what the crew actually recorded during the day: the **notes they wrote on each job**,
the **hours** from their timesheets, and any **tasks they ticked off**, all grouped by job. Claude
turns that into a short rundown — a paragraph per job saying what happened, who was on it, and
anything that's now blocked or waiting — followed by what's booked for tomorrow and a "needs
chasing" line. The point is that at 6pm everybody can see where every job stands without ringing
round.

It deliberately contains **no money at all**, which is what makes it safe to show the whole team.
Tradespeople and subcontractors see it on both `/dashboard` and their `/today` screen.

**"Money today"** is the office-only digest: quotes sent and accepted, invoices sent, payments
received, costs logged, new enquiries and anything overdue.

Both are built from real rows only. Claude is instructed never to invent activity — if a job has
hours logged but nobody wrote a note, the summary says exactly that rather than making something
up. (That case is also flagged as an attention item, since it usually means someone forgot.)

Office and admin can press **Generate now** on the dashboard card to write both summaries
immediately rather than waiting for the evening run — handy for checking the setup works, or for
an up-to-date picture mid-afternoon.

### What it needs

- `ANTHROPIC_API_KEY` — from [console.anthropic.com](https://console.anthropic.com), set in Vercel.
  Each evening is two short API calls, so cost is a fraction of a penny per day, but the account
  needs billing enabled.
- `ANTHROPIC_SUMMARY_MODEL` (optional) — defaults to `claude-sonnet-4-5-20250929`.
- `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET`, as for the overdue-invoice cron.

Without the key nothing is faked: the cards read "No summary yet", and pressing Generate now says
plainly that the key is missing.

### Getting the most out of it

The summary is only as good as what goes into it, and the input is the crew's job notes. A note
like "waiting on the worktop fabricator, 10 working days" is what makes the rundown worth reading;
no notes means the entry just says hours were logged. Worth telling the crew that the notes tab on
a job is what feeds the 6pm summary everyone reads.

## Printable documents (quotes, invoices, POs, job sheets)

Four printable documents, each behind a **Print / PDF** button on the relevant detail page.
Cmd/Ctrl+P → "Save as PDF" produces a clean A4 file you can email, post or hand out.

| Document | Route | Goes to |
|---|---|---|
| Quotation | `/quotes/[id]/print` | the customer |
| Invoice / Receipt | `/invoices/[id]/print` | the customer |
| Purchase order | `/purchase-orders/[id]/print` | the supplier |
| Job sheet | `/jobs/[id]/print` | the crew, on site |

The **job sheet** is the odd one out: it's for the van, not the customer. It carries the site
address, access notes, the customer's phone number, the scope, who's on the crew, and the
outstanding tasks as tick boxes — plus ruled space to write hours and materials by hand, and
signature lines. It deliberately contains **no money at all**, so a sheet left on site can't leak
your margins, and tradespeople can open it (everything else here is office/admin only).

The document is rendered from the same data as the app (no PDF library, so what you see on screen
is exactly what prints) and pulls your letterhead, VAT number, company number, default terms and
bank details from **company settings** — fill those in at `/settings` before you send the first
one, or the document will simply omit them.

Behaviour worth knowing:

- A paid invoice prints as a **Receipt** rather than an Invoice, and lists the payments received.
- A part-paid invoice shows "Paid to date" and "Amount due", not just the total.
- Draft quotes and invoices print with a visible note reminding you they're still drafts; that
  note is the only thing on the page that isn't customer-facing, and it disappears once you mark
  the document as sent.
- Print styles hide the sidebar, topbar and buttons, repeat the table header across pages, and
  avoid splitting a line item across a page break.

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
