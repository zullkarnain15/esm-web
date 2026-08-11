import {
  Archive,
  ChartNoAxesColumn,
  ContactRound,
  LayoutDashboard,
  Settings,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  isActive?: boolean;
};

export const navigationItems: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    isActive: true,
  },
  {
    label: "Employee History",
    href: "/employee-history",
    icon: ContactRound,
  },
  {
    label: "SLIK / KYE",
    href: "/slik-kye",
    icon: ShieldCheck,
  },
  {
    label: "BPKB Inventory",
    href: "/bpkb-inventory",
    icon: Archive,
  },
  {
    label: "Reports",
    href: "/reports",
    icon: ChartNoAxesColumn,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];
