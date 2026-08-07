import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/supabase/types";

/**
 * Loads the signed-in user's profile (role, name, etc). Redirects to /login
 * if there is no session — use this at the top of any protected page/layout
 * instead of trusting middleware alone (defence in depth).
 */
export async function requireProfile(): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    redirect("/login");
  }

  return profile as Profile;
}

const FINANCIAL_ROLES: UserRole[] = ["admin", "office"];

export function canViewFinancials(role: UserRole): boolean {
  return FINANCIAL_ROLES.includes(role);
}

export function canManageSettings(role: UserRole): boolean {
  return role === "admin";
}

export function isOfficeOrAdmin(role: UserRole): boolean {
  return role === "admin" || role === "office";
}

/**
 * Default landing page per role — tradespeople/subcontractors land straight
 * on the mobile-first "Today" screen, office staff land on the dashboard.
 */
export function homeRouteForRole(role: UserRole): string {
  return role === "tradesperson" || role === "subcontractor" ? "/today" : "/dashboard";
}
