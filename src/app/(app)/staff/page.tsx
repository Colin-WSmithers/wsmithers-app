import { redirect } from "next/navigation";
import { UserCog } from "lucide-react";
import { listAllStaff } from "@/lib/data/staff";
import { requireProfile, canManageSettings } from "@/lib/data/auth";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatCurrencyGBP } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { EditStaffDialog } from "./edit-staff-dialog";
import { AddStaffDialog } from "./add-staff-dialog";
import { ResetPasswordDialog } from "./reset-password-dialog";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

const ROLE_TONE: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "info"> = {
  admin: "default", office: "info", tradesperson: "secondary", subcontractor: "warning",
};

export default async function StaffPage() {
  const profile = await requireProfile();
  if (!canManageSettings(profile.role)) redirect("/dashboard");

  const staff = await listAllStaff();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Admin"
        title="Staff"
        description="Add logins, set roles and rates, and deactivate anyone who leaves."
        actions={<AddStaffDialog />}
      />

      <div className="flex items-center gap-2 text-xs text-ink-400">
        <UserCog className="h-3.5 w-3.5" /> {staff.length} {staff.length === 1 ? "person" : "people"} ·{" "}
        {staff.filter((s) => s.is_active).length} active
      </div>

      <div className="overflow-hidden rounded-lg border border-ink-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Job title</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8"><AvatarFallback>{initials(s.full_name)}</AvatarFallback></Avatar>
                    <div>
                      <p className="font-medium text-ink-900">{s.full_name}</p>
                      <p className="text-xs text-ink-500">{s.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={ROLE_TONE[s.role] ?? "secondary"} className="capitalize">{s.role}</Badge>
                </TableCell>
                <TableCell>{s.job_title ?? "—"}</TableCell>
                <TableCell>{s.hourly_rate ? `${formatCurrencyGBP(s.hourly_rate)}/hr` : "—"}</TableCell>
                <TableCell>
                  {s.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <ResetPasswordDialog staffId={s.id} name={s.full_name} />
                    <EditStaffDialog staff={s} isSelf={s.id === profile.id} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
