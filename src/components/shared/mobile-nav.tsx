"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { mobileNavItemsForRole } from "@/lib/nav-config";
import type { UserRole } from "@/lib/supabase/types";

// See sidebar.tsx for why nav items (with their icon components) are
// computed here from a plain `role` prop rather than passed in as data.
export function MobileNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const items = mobileNavItemsForRole(role);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-ink-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
              active ? "text-brand-700" : "text-ink-400"
            )}
          >
            <span
              className={cn(
                "absolute inset-x-5 top-0 h-[2px] rounded-b-full bg-brand-600 transition-opacity",
                active ? "opacity-100" : "opacity-0"
              )}
            />
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
