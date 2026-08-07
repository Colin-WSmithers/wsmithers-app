import { redirect } from "next/navigation";
import { HardHat } from "lucide-react";
import { listSubcontractors } from "@/lib/data/subcontractors";
import { requireProfile, isOfficeOrAdmin } from "@/lib/data/auth";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatCurrencyGBP } from "@/lib/utils";
import { AddSubcontractorDialog } from "./add-subcontractor-dialog";
import { ActiveToggle } from "./active-toggle";

export default async function SubcontractorsPage() {
  const profile = await requireProfile();
  if (!isOfficeOrAdmin(profile.role)) redirect("/dashboard");

  const subcontractors = await listSubcontractors();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Subcontractors</h1>
          <p className="text-sm text-slate-500">Trades and rates — assignable to jobs and appointments alongside staff.</p>
        </div>
        <AddSubcontractorDialog />
      </div>

      {subcontractors.length === 0 ? (
        <EmptyState
          icon={HardHat}
          title="No subcontractors yet"
          description="Add a subcontractor to start assigning them to jobs and appointments."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Trade</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Day rate</TableHead>
                <TableHead>Hourly rate</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subcontractors.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <p className="font-medium text-slate-900">{s.name}</p>
                    {s.company_name && <p className="text-xs text-slate-500">{s.company_name}</p>}
                  </TableCell>
                  <TableCell>{s.trade ?? "—"}</TableCell>
                  <TableCell>{[s.phone, s.email].filter(Boolean).join(" · ") || "—"}</TableCell>
                  <TableCell>{s.day_rate ? formatCurrencyGBP(s.day_rate) : "—"}</TableCell>
                  <TableCell>{s.hourly_rate ? `${formatCurrencyGBP(s.hourly_rate)}/hr` : "—"}</TableCell>
                  <TableCell>
                    <ActiveToggle id={s.id} isActive={s.is_active} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
