import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FolderKanban,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Settings,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Today", href: "/today", icon: CalendarClock },
  { label: "Upcoming", href: "/upcoming", icon: CalendarDays },
  { label: "Completed", href: "/completed", icon: CheckCircle2 },
];

export const secondaryNavItems: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings },
];
