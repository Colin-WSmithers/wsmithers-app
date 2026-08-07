import type { UserRole } from "@/lib/supabase/types";
import {
  LayoutDashboard, Inbox, Users, FileText, Briefcase, CalendarDays,
  Clock, ShoppingCart, Receipt, HardHat, UserCog, BarChart3, FolderOpen, Settings,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[]; // which roles see this item
}

const ALL_STAFF: UserRole[] = ["admin", "office", "tradesperson", "subcontractor"];
const OFFICE_ONLY: UserRole[] = ["admin", "office"];

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: OFFICE_ONLY },
  { label: "Today", href: "/today", icon: CalendarDays, roles: ["tradesperson", "subcontractor"] },
  { label: "Enquiries", href: "/enquiries", icon: Inbox, roles: OFFICE_ONLY },
  { label: "Customers", href: "/customers", icon: Users, roles: OFFICE_ONLY },
  { label: "Quotes", href: "/quotes", icon: FileText, roles: OFFICE_ONLY },
  { label: "Jobs", href: "/jobs", icon: Briefcase, roles: ALL_STAFF },
  { label: "Schedule", href: "/schedule", icon: CalendarDays, roles: ALL_STAFF },
  { label: "Timesheets", href: "/timesheets", icon: Clock, roles: ALL_STAFF },
  { label: "Purchase Orders", href: "/purchase-orders", icon: ShoppingCart, roles: OFFICE_ONLY },
  { label: "Invoices", href: "/invoices", icon: Receipt, roles: OFFICE_ONLY },
  { label: "Staff", href: "/staff", icon: UserCog, roles: ["admin"] },
  { label: "Subcontractors", href: "/subcontractors", icon: HardHat, roles: OFFICE_ONLY },
  { label: "Reports", href: "/reports", icon: BarChart3, roles: OFFICE_ONLY },
  { label: "Documents", href: "/documents", icon: FolderOpen, roles: ALL_STAFF },
  { label: "Settings", href: "/settings", icon: Settings, roles: ["admin"] },
];

export function navItemsForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

// Small, focused set for the mobile bottom nav — full list lives in the
// slide-out sheet menu.
export function mobileNavItemsForRole(role: UserRole): NavItem[] {
  if (role === "tradesperson" || role === "subcontractor") {
    return NAV_ITEMS.filter((i) => ["/today", "/jobs", "/timesheets", "/documents"].includes(i.href));
  }
  return NAV_ITEMS.filter((i) => ["/dashboard", "/jobs", "/schedule", "/invoices"].includes(i.href));
}
