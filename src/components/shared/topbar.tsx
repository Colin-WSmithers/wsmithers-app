"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Search, Bell, LogOut, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { NavItem } from "@/lib/nav-config";
import type { Notification } from "@/lib/supabase/types";
import { signOutAction, markNotificationReadAction, markAllNotificationsReadAction } from "@/app/(app)/actions";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

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

export function Topbar({
  fullName,
  role,
  allNavItems,
  unreadNotifications,
  notifications,
}: {
  fullName: string;
  role: string;
  allNavItems: NavItem[];
  unreadNotifications: number;
  notifications: Notification[];
}) {
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
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4">
      {/* Mobile menu trigger — full nav list lives here since the bottom bar
          only has room for 4 shortcuts. */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <nav className="mt-4 flex flex-col gap-1">
            {allNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      <form action="/search" method="GET" className="relative hidden max-w-sm flex-1 sm:block">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          name="q"
          placeholder="Search jobs, customers, invoices…"
          className="pl-8"
          aria-label="Global search"
        />
      </form>

      <div className="ml-auto flex items-center gap-1">
        <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              {unreadNotifications > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-red-500" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between px-3 py-2">
              <DropdownMenuLabel className="p-0 text-sm">Notifications</DropdownMenuLabel>
              {unreadNotifications > 0 && (
                <button
                  type="button"
                  className="text-xs font-medium text-blue-600 hover:underline"
                  onClick={() =>
                    startTransition(() => {
                      void markAllNotificationsReadAction();
                    })
                  }
                >
                  Mark all as read
                </button>
              )}
            </div>
            <DropdownMenuSeparator className="my-0" />
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-slate-400">No notifications yet.</p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleNotificationClick(n)}
                    className={`flex w-full flex-col gap-0.5 border-b border-slate-50 px-3 py-2.5 text-left last:border-b-0 hover:bg-slate-50 ${
                      n.is_read ? "" : "bg-blue-50/60"
                    }`}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className={`text-sm ${n.is_read ? "font-medium text-slate-700" : "font-semibold text-slate-900"}`}>
                        {n.title}
                      </span>
                      {!n.is_read && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />}
                    </span>
                    {n.body && <span className="text-xs text-slate-500">{n.body}</span>}
                    <span className="text-[11px] text-slate-400">{timeAgo(n.created_at)}</span>
                  </button>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-slate-100">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initials(fullName)}</AvatarFallback>
              </Avatar>
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-medium leading-tight text-slate-900">{fullName}</span>
                <span className="block text-xs capitalize leading-tight text-slate-500">{role}</span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My account</DropdownMenuLabel>
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
