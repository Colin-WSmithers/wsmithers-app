import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Notification } from "@/lib/supabase/types";

export async function listMyNotifications(profileId: string, limit = 20): Promise<Notification[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Notification[];
}

/**
 * Notify a single person (e.g. "you've been assigned to JOB-0001"). Relies
 * on the notifications_office_insert RLS policy (0003 migration) — every
 * caller of this is already gated behind an office/admin-only action.
 */
export async function notifyProfile(params: { profileId: string; title: string; body?: string; linkPath?: string }) {
  const supabase = await createClient();
  await supabase.from("notifications").insert({
    profile_id: params.profileId,
    title: params.title,
    body: params.body ?? null,
    link_path: params.linkPath ?? null,
  });
}

export async function notifyProfiles(profileIds: string[], params: { title: string; body?: string; linkPath?: string }) {
  if (profileIds.length === 0) return;
  const supabase = await createClient();
  await supabase.from("notifications").insert(
    profileIds.map((profileId) => ({
      profile_id: profileId,
      title: params.title,
      body: params.body ?? null,
      link_path: params.linkPath ?? null,
    }))
  );
}

/** Notify every active admin/office user — used for business events like a quote being accepted or an invoice going overdue. */
export async function notifyOffice(params: { title: string; body?: string; linkPath?: string }) {
  const supabase = await createClient();
  const { data: officeStaff } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["admin", "office"])
    .eq("is_active", true);

  await notifyProfiles((officeStaff ?? []).map((p) => p.id), params);
}
