import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/auth";
import { NAV_ITEMS, navItemsForRole, mobileNavItemsForRole } from "@/lib/nav-config";
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

  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profile.id)
    .eq("is_read", false);

  const items = navItemsForRole(profile.role);
  const mobileItems = mobileNavItemsForRole(profile.role);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar items={items} companyName={settings?.company_name ?? "W Smithers and Sons"} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar
          fullName={profile.full_name}
          role={profile.role}
          allNavItems={NAV_ITEMS.filter((i) => i.roles.includes(profile.role))}
          unreadNotifications={unreadCount ?? 0}
        />
        <main className="flex-1 px-4 pb-20 pt-4 lg:px-6 lg:pb-6 lg:pt-6">{children}</main>
        <MobileNav items={mobileItems} />
      </div>
    </div>
  );
}
