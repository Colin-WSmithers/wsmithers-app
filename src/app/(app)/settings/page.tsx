import { redirect } from "next/navigation";
import { requireProfile, canManageSettings } from "@/lib/data/auth";
import { getCompanySettings } from "@/lib/data/settings";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const profile = await requireProfile();
  if (!canManageSettings(profile.role)) {
    redirect("/dashboard");
  }

  const settings = await getCompanySettings();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="page-title text-[1.375rem] leading-tight">Company settings</h1>
        <p className="text-sm text-ink-500">
          These details appear on quotes, invoices and purchase orders, and control document numbering.
        </p>
      </div>
      <SettingsForm settings={settings} />
    </div>
  );
}
