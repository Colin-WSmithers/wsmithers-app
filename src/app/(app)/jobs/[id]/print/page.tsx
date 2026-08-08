import { notFound } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canViewFinancials } from "@/lib/data/auth";
import { PrintButton } from "@/components/shared/print-button";
import { formatDateUK } from "@/lib/utils";

export const metadata = { title: "Job sheet" };

/**
 * The paper job sheet the crew take to site: what the job is, where it is, who
 * to ring, what needs doing, and space to write hours and notes by hand.
 *
 * Deliberately contains NO money — job costs and values are office-only at the
 * database level, and a sheet left in a van shouldn't leak margins either.
 */
export default async function JobSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireProfile();
  const { id } = await params;
  const supabase = await createClient();

  // RLS already limits this to jobs the signed-in user can see.
  const { data } = await supabase
    .from("jobs")
    .select(
      `id, job_number, job_name, description, status, start_date, expected_completion_date,
       customer:customers(display_name, phone, email),
       site:sites(label, address_line1, address_line2, city, postcode, access_notes),
       tasks:job_tasks(id, title, description, status, priority, due_date, sort_order),
       assignments:job_assignments(id, role_on_job, profile:profiles(full_name, phone), subcontractor:subcontractors(name, phone))`
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!data) notFound();

  const job = data as unknown as {
    id: string; job_number: string; job_name: string; description: string | null; status: string;
    start_date: string | null; expected_completion_date: string | null;
    customer: { display_name: string; phone: string | null; email: string | null } | null;
    site: { label: string; address_line1: string; address_line2: string | null; city: string | null; postcode: string; access_notes: string | null } | null;
    tasks: { id: string; title: string; description: string | null; status: string; priority: string; due_date: string | null; sort_order: number }[];
    assignments: { id: string; role_on_job: string | null; profile: { full_name: string; phone: string | null } | null; subcontractor: { name: string; phone: string | null } | null }[];
  };

  const openTasks = (job.tasks ?? [])
    .filter((t) => t.status !== "completed")
    .sort((a, b) => a.sort_order - b.sort_order);

  const crew = (job.assignments ?? []).map((a) => ({
    name: a.profile?.full_name ?? a.subcontractor?.name ?? "—",
    phone: a.profile?.phone ?? a.subcontractor?.phone ?? null,
    role: a.role_on_job,
  }));

  const siteLines = [job.site?.address_line1, job.site?.address_line2, job.site?.city, job.site?.postcode]
    .map((s) => (s ?? "").trim())
    .filter(Boolean);

  return (
    <div className="print-page mx-auto w-full max-w-[210mm] bg-white text-ink-900">
      <div className="no-print mb-4 flex items-center justify-between gap-3">
        <a href={`/jobs/${job.id}`} className="text-sm font-medium text-ink-500 hover:text-ink-800">
          ← Back
        </a>
        <PrintButton />
      </div>

      <div className="rounded-card border border-ink-200/80 p-8 shadow-subtle print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="flex items-start justify-between gap-6 border-b border-ink-200 pb-5">
          <div>
            <Image src="/mark.png" alt="" width={360} height={260} className="mb-2 h-12 w-auto object-contain object-left" />
            <p className="font-display text-2xl font-semibold uppercase tracking-[0.12em] text-brand-600">
              Job Sheet
            </p>
          </div>
          <div className="text-right">
            <p className="tnum font-display text-2xl font-semibold text-ink-900">{job.job_number}</p>
            <p className="text-sm text-ink-600">{job.job_name}</p>
            <p className="mt-1 text-xs capitalize text-ink-400">{job.status.replace(/_/g, " ")}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 py-5 text-xs">
          <div>
            <p className="eyebrow mb-1.5">Customer</p>
            <p className="text-sm font-semibold text-ink-900">{job.customer?.display_name ?? "—"}</p>
            {job.customer?.phone ? <p className="tnum mt-0.5 text-ink-700">{job.customer.phone}</p> : null}
          </div>
          <div>
            <p className="eyebrow mb-1.5">Site</p>
            <p className="text-sm font-semibold text-ink-900">{job.site?.label ?? "—"}</p>
            <div className="mt-0.5 leading-relaxed text-ink-700">
              {siteLines.map((l) => (
                <div key={l}>{l}</div>
              ))}
            </div>
          </div>
          <div>
            <p className="eyebrow mb-1.5">Dates</p>
            <p className="text-ink-700">Start: <span className="tnum">{job.start_date ? formatDateUK(job.start_date) : "—"}</span></p>
            <p className="text-ink-700">Due: <span className="tnum">{job.expected_completion_date ? formatDateUK(job.expected_completion_date) : "—"}</span></p>
          </div>
        </div>

        {job.site?.access_notes ? (
          <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 print:border-ink-300">
            <p className="eyebrow mb-0.5 text-amber-700">Access</p>
            <p className="text-xs leading-relaxed text-ink-800">{job.site.access_notes}</p>
          </div>
        ) : null}

        {job.description ? (
          <div className="mb-5">
            <p className="eyebrow mb-1">Scope of works</p>
            <p className="whitespace-pre-line text-xs leading-relaxed text-ink-700">{job.description}</p>
          </div>
        ) : null}

        {crew.length > 0 ? (
          <div className="mb-5">
            <p className="eyebrow mb-1.5">Crew</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-700">
              {crew.map((c, i) => (
                <span key={i}>
                  <span className="font-medium text-ink-900">{c.name}</span>
                  {c.role ? <span className="text-ink-500"> · {c.role}</span> : null}
                  {c.phone ? <span className="tnum text-ink-500"> · {c.phone}</span> : null}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* Tasks with a tick box the crew fill in on site */}
        <div className="mb-6">
          <p className="eyebrow mb-2">Tasks outstanding</p>
          {openTasks.length === 0 ? (
            <p className="text-xs text-ink-400">No outstanding tasks listed.</p>
          ) : (
            <ul className="space-y-1.5">
              {openTasks.map((t) => (
                <li key={t.id} className="flex break-inside-avoid items-start gap-2.5 border-b border-ink-100 pb-1.5">
                  <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-[3px] border border-ink-400" />
                  <span className="text-xs leading-relaxed text-ink-800">
                    <span className="font-medium">{t.title}</span>
                    {t.priority === "urgent" || t.priority === "high" ? (
                      <span className="ml-1.5 font-display text-[0.625rem] font-semibold uppercase tracking-wider text-brand-600">
                        {t.priority}
                      </span>
                    ) : null}
                    {t.description ? <span className="block text-ink-500">{t.description}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Hand-written capture — this is why it's printed */}
        <div className="grid grid-cols-2 gap-6 break-inside-avoid border-t border-ink-200 pt-5">
          <div>
            <p className="eyebrow mb-2">Hours worked</p>
            <table className="w-full text-[0.6875rem]">
              <thead>
                <tr className="text-left text-ink-400">
                  <th className="pb-1 font-medium">Date</th>
                  <th className="pb-1 font-medium">Name</th>
                  <th className="pb-1 font-medium">Start</th>
                  <th className="pb-1 font-medium">Finish</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="h-6 border-b border-ink-200" />
                    <td className="h-6 border-b border-ink-200" />
                    <td className="h-6 border-b border-ink-200" />
                    <td className="h-6 border-b border-ink-200" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <p className="eyebrow mb-2">Notes / materials used</p>
            <div className="space-y-[1.15rem]">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="border-b border-ink-200" />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex break-inside-avoid items-end justify-between gap-8 text-[0.6875rem] text-ink-500">
          <div className="flex-1">
            <div className="mb-1 h-8 border-b border-ink-300" />
            Signed (crew)
          </div>
          <div className="flex-1">
            <div className="mb-1 h-8 border-b border-ink-300" />
            Signed (customer)
          </div>
          <div className="w-28">
            <div className="mb-1 h-8 border-b border-ink-300" />
            Date
          </div>
        </div>

        <p className="mt-5 border-t border-ink-200 pt-2 text-[10px] text-ink-400">
          {job.job_number} · Printed {formatDateUK(new Date())} by {profile.full_name}
          {canViewFinancials(profile.role) ? "" : ""}
        </p>
      </div>
    </div>
  );
}
