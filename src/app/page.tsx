import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { homeRouteForRole } from "@/lib/data/auth";

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  redirect(homeRouteForRole(profile?.role ?? "tradesperson"));
}
