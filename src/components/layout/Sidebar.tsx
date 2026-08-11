"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Rocket, Sparkles } from "lucide-react";
import { navigationItems } from "@/config/navigation";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="esm-sidebar">
      <div className="esm-brand">
        <div className="esm-brand-mark">
          <Image
            src="/assets/branding/esm-logo.svg"
            alt="ESM logo"
            width={44}
            height={44}
            priority
          />
        </div>
        <div>
          <p className="esm-brand-title">ESM</p>
          <p className="esm-brand-subtitle">Employee Services Management</p>
        </div>
      </div>

      <nav className="esm-sidebar-nav" aria-label="Primary navigation">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`esm-nav-item${isActive ? " is-active" : ""}`}
            >
              <span className="esm-nav-icon">
                <Icon size={19} strokeWidth={2.1} />
              </span>
              <span>{item.label}</span>
              {isActive ? (
                <ChevronRight className="esm-nav-cue" size={16} />
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="esm-command-card">
        <span className="esm-command-orbit" />
        <div className="esm-command-icon">
          <Rocket size={18} />
        </div>
        <div>
          <p>HR Command Center</p>
          <span>Unified employee services cockpit</span>
        </div>
        <Sparkles className="esm-command-sparkle" size={15} />
      </div>

      <div className="esm-sidebar-footer">
        <div className="esm-system-pulse" />
        <div>
          <p className="esm-footer-label">System Status</p>
          <p className="esm-footer-value">Operational</p>
        </div>
      </div>
    </aside>
  );
}
