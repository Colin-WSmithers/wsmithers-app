import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin, User, ListChecks, StickyNote, Camera, FolderOpen, Users, Star, Clock, Wallet, Receipt } from "lucide-react";
import { getJobById, listJobAssignments } from "@/lib/data/jobs";
import { listJobTasks } from "@/lib/data/job-tasks";
import { listJobNotes } from "@/lib/data/job-notes";
import { listJobPhotos } from "@/lib/data/job-photos";
import { listJobDocuments } from "@/lib/data/documents";
import { listAssignableStaff } from "@/lib/data/staff";
import { listActiveSubcontractorsForPicker } from "@/lib/data/subcontractors";
import { listTimesheetsForJob } from "@/lib/data/timesheets";
import { listJobCosts } from "@/lib/data/job-costs";
import { requireProfile, canViewFinancials, isOfficeOrAdmin } from "@/lib/data/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrencyGBP, formatDateUK, formatDateTimeUK, formatDurationMinutes } from "@/lib/utils";
import { JobStatusSelect } from "./job-status-select";
import { AddTaskDialog } from "./add-task-dialog";
import { TaskStatusSelect } from "./task-status-select";
import { NoteForm } from "./note-form";
import { UploadPhotoDialog } from "./upload-photo-dialog";
import { UploadDocumentDialog } from "./upload-document-dialog";
import { AssignStaffDialog } from "./assign-staff-dialog";
import { AssignSubcontractorDialog } from "./assign-subcontractor-dialog";
import { RemoveAssignmentButton } from "./remove-assignment-button";
import { AddCostDialog } from "./add-cost-dialog";

const STATUS_TONE: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "info"> = {
  draft: "secondary", scheduled: "info", in_progress: "warning", on_hold: "destructive",
  awaiting_materials: "warning", awaiting_customer: "warning", completed: "success",
  invoiced: "success", cancelled: "destructive",
};
const PRIORITY_TONE: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "info"> = {
  low: "secondary", medium: "info", high: "warning", urgent: "destructive",
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const job = await getJobById(id);
  if (!job) notFound();

  const office = isOfficeOrAdmin(profile.role);
  const showFinancials = canViewFinancials(profile.role);

  const [tasks, notes, photos, documents, team, staff, subcontractors, timesheets, costs] = await Promise.all([
    listJobTasks(id),
    listJobNotes(id),
    listJobPhotos(id),
    listJobDocuments(id),
    listJobAssignments(id),
    office ? listAssignableStaff() : Promise.resolve([]),
    office ? listActiveSubcontractorsForPicker() : Promise.resolve([]),
    listTimesheetsForJob(id),
    showFinancials ? listJobCosts(id) : Promise.resolve([]),
  ]);

  const costsTotal = costs.reduce((sum, c) => sum + c.total, 0);
  const costsVatTotal = costs.reduce((sum, c) => sum + (c.total * c.vat_rate) / 100, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg border border-ink-200 bg-white p-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title text-[1.375rem] leading-tight">{job.job_number} — {job.job_name}</h1>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-500">
            <span className="inline-flex items-center gap-1">
              <User className="h-3.5 w-3.5" /> {job.customer?.display_name ?? "No customer"}
            </span>
            {job.site && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {job.site.address_line1}, {job.site.postcode}
              </span>
            )}
          </p>
        </div>
        {office ? (
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <JobStatusSelect jobId={job.id} currentStatus={job.status} />
            <Button asChild size="sm" variant="outline">
              <Link href={`/invoices/new?job_id=${job.id}`}><Receipt className="h-3.5 w-3.5" /> Create invoice</Link>
            </Button>
          </div>
        ) : (
          <Badge variant={STATUS_TONE[job.status] ?? "secondary"} className="w-fit capitalize">
            {job.status.replace(/_/g, " ")}
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Detail label="Description" value={job.description ?? "—"} full />
          <Detail label="Start date" value={formatDateUK(job.start_date)} />
          <Detail label="Expected completion" value={formatDateUK(job.expected_completion_date)} />
          {showFinancials && (
            <>
              <Detail label="Estimated value" value={formatCurrencyGBP(job.estimated_value)} />
              <Detail label="Estimated cost" value={formatCurrencyGBP(job.estimated_cost)} />
            </>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks"><ListChecks className="mr-1.5 h-3.5 w-3.5" /> Tasks</TabsTrigger>
          <TabsTrigger value="notes"><StickyNote className="mr-1.5 h-3.5 w-3.5" /> Notes</TabsTrigger>
          <TabsTrigger value="photos"><Camera className="mr-1.5 h-3.5 w-3.5" /> Photos</TabsTrigger>
          <TabsTrigger value="documents"><FolderOpen className="mr-1.5 h-3.5 w-3.5" /> Documents</TabsTrigger>
          <TabsTrigger value="timesheets"><Clock className="mr-1.5 h-3.5 w-3.5" /> Timesheets</TabsTrigger>
          <TabsTrigger value="costs"><Wallet className="mr-1.5 h-3.5 w-3.5" /> Costs</TabsTrigger>
          <TabsTrigger value="team"><Users className="mr-1.5 h-3.5 w-3.5" /> Team</TabsTrigger>
        </TabsList>

        {/* Tasks */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Tasks</CardTitle>
              {office && <AddTaskDialog jobId={id} staff={staff} />}
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <EmptyState icon={ListChecks} title="No tasks yet" description="Break this job down into tasks so the crew know what's next." />
              ) : (
                <ul className="divide-y divide-ink-100">
                  {tasks.map((task) => {
                    const canEdit = office || task.assigned_to?.id === profile.id;
                    return (
                      <li key={task.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-ink-900">{task.title}</p>
                            <Badge variant={PRIORITY_TONE[task.priority]} className="capitalize">{task.priority}</Badge>
                          </div>
                          {task.description && <p className="text-xs text-ink-500">{task.description}</p>}
                          <p className="mt-0.5 text-xs text-ink-400">
                            {task.assigned_to?.full_name ?? "Unassigned"}
                            {task.due_date && ` · Due ${formatDateUK(task.due_date)}`}
                          </p>
                        </div>
                        {canEdit ? (
                          <TaskStatusSelect taskId={task.id} jobId={id} currentStatus={task.status} />
                        ) : (
                          <Badge variant="secondary" className="w-fit capitalize">{task.status.replace(/_/g, " ")}</Badge>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <NoteForm jobId={id} />
              {notes.length === 0 ? (
                <EmptyState icon={StickyNote} title="No notes yet" description="Notes here are visible to the office and everyone assigned to this job." />
              ) : (
                <ul className="flex flex-col gap-3">
                  {notes.map((note) => (
                    <li key={note.id} className="rounded-md border border-ink-100 bg-ink-50 p-3">
                      <p className="whitespace-pre-wrap text-sm text-ink-800">{note.body}</p>
                      <p className="mt-1.5 text-xs text-ink-400">
                        {note.author?.full_name ?? "Unknown"} · {formatDateTimeUK(note.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Photos */}
        <TabsContent value="photos">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Photos</CardTitle>
              <UploadPhotoDialog jobId={id} />
            </CardHeader>
            <CardContent>
              {photos.length === 0 ? (
                <EmptyState icon={Camera} title="No photos yet" description="Before/during/after photos and site issues will show up here." />
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {photos.map((photo) => (
                    <a
                      key={photo.id}
                      href={photo.signed_url ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex flex-col gap-1 overflow-hidden rounded-md border border-ink-200"
                    >
                      <div className="relative aspect-square w-full overflow-hidden bg-ink-100">
                        {photo.signed_url ? (
                          // eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URLs are per-project and expire, not worth wiring into next/image's remote-pattern allowlist
                          <img
                            src={photo.signed_url}
                            alt={photo.description ?? photo.category}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        ) : null}
                      </div>
                      <div className="px-2 pb-2">
                        <Badge variant="secondary" className="capitalize">{photo.category}</Badge>
                        {photo.description && <p className="mt-1 truncate text-xs text-ink-500">{photo.description}</p>}
                        <p className="text-[11px] text-ink-400">{formatDateUK(photo.created_at)}</p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Documents</CardTitle>
              {office && <UploadDocumentDialog jobId={id} />}
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <EmptyState icon={FolderOpen} title="No documents yet" description="Plans, contracts, certificates and other paperwork for this job go here." />
              ) : (
                <ul className="divide-y divide-ink-100">
                  {documents.map((doc) => (
                    <li key={doc.id} className="flex items-center justify-between py-2.5">
                      <div>
                        {doc.signed_url ? (
                          <a href={doc.signed_url} target="_blank" rel="noreferrer" className="text-sm font-medium text-ink-900 hover:underline">
                            {doc.filename}
                          </a>
                        ) : (
                          <p className="text-sm font-medium text-ink-900">{doc.filename}</p>
                        )}
                        <p className="text-xs text-ink-500">
                          {doc.uploaded_by?.full_name ?? "Unknown"} · {formatDateUK(doc.created_at)}
                        </p>
                      </div>
                      <Badge variant="secondary" className="capitalize">{doc.category.replace(/_/g, " ")}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timesheets */}
        <TabsContent value="timesheets">
          <Card>
            <CardHeader>
              <CardTitle>Timesheets</CardTitle>
            </CardHeader>
            <CardContent>
              {timesheets.length === 0 ? (
                <EmptyState
                  icon={Clock}
                  title="No hours logged yet"
                  description={office ? "Hours clocked by the crew on this job will show up here." : "Clock in on this job from the Timesheets page to log your hours."}
                />
              ) : (
                <ul className="divide-y divide-ink-100">
                  {timesheets.map((t) => (
                    <li key={t.id} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="text-sm font-medium text-ink-900">{t.profile?.full_name ?? "—"}</p>
                        <p className="text-xs text-ink-500">
                          {formatDateTimeUK(t.started_at)} · {formatDurationMinutes(t.duration_minutes)}
                        </p>
                      </div>
                      {!t.ended_at ? (
                        <Badge variant="info">In progress</Badge>
                      ) : t.is_approved ? (
                        <Badge variant="success">Approved</Badge>
                      ) : (
                        <Badge variant="secondary">Pending approval</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Costs */}
        <TabsContent value="costs">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Materials &amp; costs</CardTitle>
              <AddCostDialog jobId={id} />
            </CardHeader>
            <CardContent>
              {showFinancials ? (
                costs.length === 0 ? (
                  <EmptyState icon={Wallet} title="No costs logged yet" description="Materials, labour and subcontractor spend logged against this job will show up here." />
                ) : (
                  <div className="flex flex-col gap-4">
                    <ul className="divide-y divide-ink-100">
                      {costs.map((c) => (
                        <li key={c.id} className="flex items-center justify-between py-2.5">
                          <div>
                            <p className="text-sm font-medium text-ink-900">{c.item}</p>
                            <p className="text-xs text-ink-500">
                              {c.added_by?.full_name ?? "—"} · {formatDateUK(c.incurred_date)} · {c.quantity} × {formatCurrencyGBP(c.unit_cost)}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary" className="capitalize">{c.category}</Badge>
                            <p className="mt-1 text-sm font-medium text-ink-900">{formatCurrencyGBP(c.total)}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="flex justify-end gap-6 border-t border-ink-100 pt-3 text-sm">
                      <span className="text-ink-500">VAT: {formatCurrencyGBP(costsVatTotal)}</span>
                      <span className="font-semibold text-ink-900">Total: {formatCurrencyGBP(costsTotal)}</span>
                    </div>
                  </div>
                )
              ) : (
                <p className="text-sm text-ink-500">
                  You can log a material or other cost against this job above — the office manages the full cost breakdown and margin.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team */}
        <TabsContent value="team">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Team</CardTitle>
              {office && (
                <div className="flex gap-2">
                  <AssignStaffDialog jobId={id} staff={staff} />
                  <AssignSubcontractorDialog jobId={id} subcontractors={subcontractors} />
                </div>
              )}
            </CardHeader>
            <CardContent>
              {team.length === 0 ? (
                <EmptyState icon={Users} title="No one assigned yet" description="Assign staff so this job appears on their Today screen." />
              ) : (
                <ul className="divide-y divide-ink-100">
                  {team.map((member) => {
                    const name = member.profile?.full_name ?? member.subcontractor?.name ?? "Unknown";
                    return (
                      <li key={member.assignment_id} className="flex items-center justify-between py-2.5">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>{initials(name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-ink-900">{name}</p>
                            <p className="text-xs text-ink-500 capitalize">
                              {member.role_on_job || member.profile?.role || (member.subcontractor ? "Subcontractor" : "")}
                            </p>
                          </div>
                        </div>
                        {office && <RemoveAssignmentButton assignmentId={member.assignment_id} jobId={id} />}
                      </li>
                    );
                  })}
                </ul>
              )}
              {office && subcontractors.length === 0 && (
                <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-400">
                  <Star className="h-3 w-3" /> Add a subcontractor in the Subcontractors section to assign them here too.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Detail({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</p>
      <p className="whitespace-pre-wrap text-sm text-ink-800">{value}</p>
    </div>
  );
}
