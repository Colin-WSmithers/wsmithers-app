"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Menu, Search, Bell, LogOut, Settings as SettingsIcon, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { navItemsForRole } from "@/lib/nav-config";
import { LogoMark } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import type { Notification, UserRole } from "@/lib/supabase/types";
import { signOutAction, markNotificationReadAction, markAllNotificationsReadAction } from "@/app/(app)/actions";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(iso));
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// See sidebar.tsx for why nav items (with their icon components) are
// computed here from a plain `role` prop rather than passed in as data.
export function Topbar({
  fullName,
  role,
  unreadNotifications,
  notifications,
}: {
  fullName: string;
  role: UserRole;
  unreadNotifications: number;
  notifications: Notification[];
}) {
  const allNavItems = navItemsForRole(role);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const router = useRouter();
  const [, startTransition] = useTransition();

  function handleNotificationClick(notification: Notification) {
    if (!notification.is_read) {
      startTransition(() => {
        void markNotificationReadAction(notification.id);
      });
    }
    setNotifOpen(false);
    if (notification.link_path) {
      router.push(notification.link_path);
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-200/80 bg-white/90 px-4 backdrop-blur-md lg:px-6">
      {/* Mobile menu — the bottom bar only has room for 4 shortcuts, so the
          full role-filtered nav lives in this slide-out sheet. */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <LogoMark className="h-6" />
              <span className="font-display text-sm font-semibold tracking-tight">Menu</span>
            </SheetTitle>
          </SheetHeader>
          <nav className="mt-5 flex flex-col gap-0.5">
            {allNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-800"
              >
                <item.icon className="h-[1.125rem] w-[1.125rem] text-ink-400" />
                {item.label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      <LogoMark className="h-7 lg:hidden" />

      <form action="/search" method="GET" className="relative hidden max-w-md flex-1 sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <Input
          name="q"
          placeholder="Search jobs, customers, invoices…"
          className="h-10 rounded-full bg-ink-50 pl-9 shadow-none"
          aria-label="Global search"
        />
      </form>

      <div className="ml-auto flex items-center gap-1">
        <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${unreadNotifications > 0 ? ` (${unreadNotifications} unread)` : ""}`}>
              <Bell className="h-5 w-5" />
              {unreadNotifications > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[21rem] overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-2.5">
              <DropdownMenuLabel className="p-0 font-display text-sm font-semibold tracking-tight">
                Notifications
              </DropdownMenuLabel>
              {unreadNotifications > 0 && (
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
                  onClick={() =>
                    startTransition(() => {
                      void markAllNotificationsReadAction();
                    })
                  }
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-[24rem] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-1.5 px-4 py-10 text-center">
                  <Bell className="h-6 w-6 text-ink-300" />
                  <p className="text-sm text-ink-400">Nothing yet.</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleNotificationClick(n)}
                    className={cn(
                      "flex w-full flex-col gap-0.5 border-b border-ink-100 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-ink-50",
                      !n.is_read && "bg-brand-50/50"
                    )}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className={cn("text-sm leading-snug", n.is_read ? "font-medium text-ink-700" : "font-semibold text-ink-900")}>
                        {n.title}
                      </span>
                      {!n.is_read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />}
                    </span>
                    {n.body && <span className="text-xs leading-relaxed text-ink-500">{n.body}</span>}
                    <span className="mt-0.5 text-[11px] text-ink-400">{timeAgo(n.created_at)}</span>
                  </button>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-ink-100">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initials(fullName)}</AvatarFallback>
              </Avatar>
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-medium leading-tight text-ink-900">{fullName}</span>
                <span className="block font-display text-[0.625rem] font-semibold uppercase leading-tight tracking-[0.1em] text-brand-600">
                  {role}
                </span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-ink-900">{fullName}</span>
              <span className="text-xs font-normal capitalize text-ink-500">{role}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {role === "admin" && (
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <SettingsIcon className="h-4 w-4" /> Company settings
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem destructive onSelect={() => signOutAction()}>
              <LogOut className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
