import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/auth";
import { listMyNotifications } from "@/lib/data/notifications";
import { Sidebar } from "@/components/shared/sidebar";
import { MobileNav } from "@/components/shared/mobile-nav";
import { Topbar } from "@/components/shared/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("company_settings")
    .select("company_name")
    .limit(1)
    .single();

  const [{ count: unreadCount }, notifications] = await Promise.all([
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profile.id)
      .eq("is_read", false),
    listMyNotifications(profile.id, 15),
  ]);

  // Only plain, serializable data (role, name, counts) crosses from this
  // Server Component into the client Sidebar/Topbar/MobileNav below — each
  // of those computes its own nav items (icons included) internally from
  // `role`. See sidebar.tsx for why.
  return (
    <div className="flex min-h-screen bg-ink-50">
      <Sidebar role={profile.role} companyName={settings?.company_name ?? "W Smithers and Sons"} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar
          fullName={profile.full_name}
          role={profile.role}
          unreadNotifications={unreadCount ?? 0}
          notifications={notifications}
        />
        <main className="flex-1 px-4 pb-24 pt-5 lg:px-8 lg:pb-10 lg:pt-7">
          <div className="mx-auto w-full max-w-[88rem]">{children}</div>
        </main>
        <MobileNav role={profile.role} />
      </div>
    </div>
  );
}
