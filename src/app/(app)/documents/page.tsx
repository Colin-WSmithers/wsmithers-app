import Link from "next/link";
import { FolderOpen, Search } from "lucide-react";
import { listAllDocuments } from "@/lib/data/documents";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatDateUK } from "@/lib/utils";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const documents = await listAllDocuments(q);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Documents</h1>
        <p className="text-sm text-slate-500">Every job document you have access to, in one place.</p>
      </div>

      <form className="flex max-w-sm items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input name="q" defaultValue={q} placeholder="Search by filename…" className="pl-8" />
        </div>
        <Button type="submit" variant="outline" size="sm">Search</Button>
      </form>

      {documents.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={q ? "No documents match your search" : "No documents yet"}
          description={q ? "Try a different filename." : "Documents uploaded to a job (plans, contracts, certificates and more) will show up here."}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Uploaded by</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    {doc.signed_url ? (
                      <a href={doc.signed_url} target="_blank" rel="noreferrer" className="font-medium text-slate-900 hover:underline">
                        {doc.filename}
                      </a>
                    ) : (
                      doc.filename
                    )}
                    {doc.description && <p className="text-xs text-slate-500">{doc.description}</p>}
                  </TableCell>
                  <TableCell>
                    {doc.job ? (
                      <Link href={`/jobs/${doc.job.id}`} className="text-slate-600 hover:underline">
                        {doc.job.job_number}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">{doc.category.replace(/_/g, " ")}</Badge>
                  </TableCell>
                  <TableCell>{doc.uploaded_by?.full_name ?? "—"}</TableCell>
                  <TableCell>{formatDateUK(doc.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
