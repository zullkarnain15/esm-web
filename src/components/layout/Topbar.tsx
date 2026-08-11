"use client";

import { Bell, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { navigationItems } from "@/config/navigation";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function Topbar() {
  const pathname = usePathname();
  const activeItem =
    navigationItems.find((item) =>
      item.href === "/" ? pathname === item.href : pathname.startsWith(item.href),
    ) ?? navigationItems[0];

  return (
    <header className="esm-topbar">
      <div className="esm-page-context">
        <p className="esm-breadcrumb">Home / {activeItem.label}</p>
        <h1>{activeItem.label}</h1>
      </div>

      <div className="esm-topbar-actions">
        <label className="esm-search" aria-label="Search employee services">
          <Search size={18} />
          <input type="search" placeholder="Search services, employees..." />
        </label>

        <button className="esm-icon-button" type="button" aria-label="Notifications">
          <Bell size={20} />
          <span className="esm-notification-dot" />
        </button>

        <ThemeToggle />

        <div className="esm-user-profile">
          <div className="esm-avatar">EA</div>
          <div>
            <p>ESM Administrator</p>
            <span>Super Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
}
