"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItemsForRole } from "@/lib/nav-config";
import { LogoMark } from "@/components/shared/logo";
import type { UserRole } from "@/lib/supabase/types";

/**
 * Nav items (including their icon components) are computed HERE, inside the
 * client component, from a plain `role` string prop — not passed in from
 * the server layout. Icon components are function references, and React
 * Server Components cannot pass functions as props to Client Components
 * (only plain data, React elements, or "use server" actions) — this only
 * fails at request time, not at build time, so it's easy to miss.
 */
export function Sidebar({ role, companyName }: { role: UserRole; companyName: string }) {
  const pathname = usePathname();
  const items = navItemsForRole(role);

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-ink-200/80 bg-white lg:flex">
      <div className="flex h-16 items-center gap-3 border-b border-ink-200/80 px-5">
        <LogoMark className="h-9" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-[0.8125rem] font-semibold leading-tight tracking-tight text-ink-900">
            {companyName}
          </span>
          <span className="block font-display text-[0.5625rem] font-semibold uppercase leading-tight tracking-[0.18em] text-brand-600">
            Est. 1955
          </span>
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-brand-50 text-brand-800"
                  : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
              )}
            >
              <span
                className={cn(
                  "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-600 transition-all duration-150",
                  active ? "opacity-100" : "opacity-0"
                )}
              />
              <Icon
                className={cn(
                  "h-[1.125rem] w-[1.125rem] shrink-0 transition-colors",
                  active ? "text-brand-600" : "text-ink-400 group-hover:text-ink-600"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-ink-200/80 px-5 py-3">
        <p className="font-display text-[0.625rem] font-medium uppercase tracking-[0.12em] text-ink-400">
          Job Management
        </p>
      </div>
    </aside>
  );
}
