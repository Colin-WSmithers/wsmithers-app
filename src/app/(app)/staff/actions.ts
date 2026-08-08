"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile, canManageSettings } from "@/lib/data/auth";
import { staffUpdateSchema, staffCreateSchema, staffPasswordResetSchema } from "@/lib/validation/staff";
import { generateTempPassword } from "@/lib/temp-password";

export interface FormState {
  error?: string;
  /** Shown once, immediately after creating a login or resetting a password. */
  tempPassword?: string;
  tempPasswordFor?: string;
}

function emptyToNull(value: string | undefined) {
  return value && value.trim() !== "" ? value : null;
}

export async function updateStaffAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();
  if (!canManageSettings(profile.role)) {
    return { error: "Only admins can edit staff." };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = staffUpdateSchema.safeParse({ ...raw, is_active: raw.is_active === "on" });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  // An admin can't demote themselves out of admin — avoids locking everyone out.
  if (parsed.data.id === profile.id && parsed.data.role !== "admin") {
    return { error: "You can't change your own role away from admin." };
  }
  // ...nor deactivate themselves, which since 0005 revokes access immediately.
  if (parsed.data.id === profile.id && parsed.data.is_active === false) {
    return { error: "You can't deactivate your own account." };
  }

  const supabase = await createClient();

  // Don't let the last active admin be demoted or switched off by another
  // admin — that would leave nobody able to manage staff or settings, and
  // there's no recovery path inside the app.
  const losingAdmin = parsed.data.role !== "admin" || parsed.data.is_active === false;
  if (losingAdmin) {
    const { data: target } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", parsed.data.id)
      .maybeSingle();

    if (target?.role === "admin" && target.is_active) {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin")
        .eq("is_active", true);

      if ((count ?? 0) <= 1) {
        return {
          error: "This is the last active admin — promote someone else to admin first.",
        };
      }
    }
  }
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      role: parsed.data.role,
      job_title: emptyToNull(parsed.data.job_title),
      phone: emptyToNull(parsed.data.phone),
      hourly_rate: parsed.data.hourly_rate,
      is_active: parsed.data.is_active ?? false,
    })
    .eq("id", parsed.data.id);

  if (error) {
    return { error: "Could not update this profile — please try again." };
  }

  revalidatePath("/staff");
  return {};
}

// ---------------------------------------------------------------------------
// Creating logins
//
// Auth users can't be created with the browser (anon) client, so these two
// actions use the service-role admin client. That key bypasses RLS entirely,
// which is exactly why both actions re-check `canManageSettings` first and
// live behind "use server" — the admin client is never reachable from the
// browser. Requires SUPABASE_SERVICE_ROLE_KEY (the same one the cron routes
// use — see README).
// ---------------------------------------------------------------------------

export async function createStaffAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();
  if (!canManageSettings(profile.role)) {
    return { error: "Only admins can add staff." };
  }

  const parsed = staffCreateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error:
        "SUPABASE_SERVICE_ROLE_KEY isn't set on this deployment, so logins can't be created from here yet. Add it in Vercel and redeploy.",
    };
  }

  const tempPassword = generateTempPassword();

  // The on_auth_user_created trigger reads full_name/role out of user metadata
  // and creates the matching profiles row, so set them here rather than
  // patching the profile afterwards and briefly having the wrong role.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: tempPassword,
    email_confirm: true, // no confirmation email to send — there's no mail provider wired up
    user_metadata: { full_name: parsed.data.full_name, role: parsed.data.role },
  });

  if (createError || !created?.user) {
    const message = createError?.message ?? "";
    if (/already/i.test(message) && /regist|exist/i.test(message)) {
      return { error: "Someone already has an account with that email address." };
    }
    return { error: `Could not create the login — ${message || "please try again."}` };
  }

  // Fill in the details the trigger doesn't know about.
  const { error: profileError } = await admin
    .from("profiles")
    .update({
      job_title: parsed.data.job_title?.trim() || null,
      phone: parsed.data.phone?.trim() || null,
      hourly_rate: parsed.data.hourly_rate,
      is_active: true,
    })
    .eq("id", created.user.id);

  if (profileError) {
    // Roll the auth user back so a half-made account doesn't linger.
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "Could not save the profile details — please try again." };
  }

  revalidatePath("/staff");
  return { tempPassword, tempPasswordFor: parsed.data.email };
}

export async function resetStaffPasswordAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();
  if (!canManageSettings(profile.role)) {
    return { error: "Only admins can reset passwords." };
  }

  const parsed = staffPasswordResetSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: "Invalid request." };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error:
        "SUPABASE_SERVICE_ROLE_KEY isn't set on this deployment, so passwords can't be reset from here yet.",
    };
  }

  const { data: target } = await admin
    .from("profiles")
    .select("email")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!target) {
    return { error: "That person no longer exists." };
  }

  const tempPassword = generateTempPassword();
  const { error } = await admin.auth.admin.updateUserById(parsed.data.id, { password: tempPassword });
  if (error) {
    return { error: "Could not reset the password — please try again." };
  }

  revalidatePath("/staff");
  return { tempPassword, tempPasswordFor: target.email };
}
