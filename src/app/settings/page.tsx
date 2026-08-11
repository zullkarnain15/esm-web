import Link from "next/link";
import { Database, Settings2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

export default function SettingsPage() {
  return (
    <AppShell>
      <section className="esm-settings-page">
        <article className="esm-card esm-settings-hero">
          <div>
            <p className="esm-eyebrow">
              <Settings2 size={16} />
              Settings
            </p>
            <h2>Employee service configuration</h2>
            <span>
              Manage source configuration and operational setup for Employee 360.
            </span>
          </div>
        </article>

        <section className="esm-settings-grid" aria-label="Settings areas">
          <Link
            className="esm-card esm-settings-link-card"
            href="/settings/employee-history/data-import"
          >
            <span>
              <Database size={20} />
            </span>
            <div>
              <p>Employee History</p>
              <h3>Data Import</h3>
              <small>Manage Employee 360 source imports.</small>
            </div>
          </Link>
        </section>
      </section>
    </AppShell>
  );
}
