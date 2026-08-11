import Link from "next/link";
import {
  Clock3,
  Database,
  FileSpreadsheet,
  History,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { EmployeeMasterImportCard } from "@/components/settings/EmployeeMasterImportCard";
import { EmployeeMutationImportCard } from "@/components/settings/EmployeeMutationImportCard";

const dataSources = [
  {
    title: "Employee Master",
    description: "Current employee profile and current employment source.",
    status: "Available",
    isAvailable: true,
    href: "#employee-master-import",
    icon: FileSpreadsheet,
  },
  {
    title: "HRIS Mutation",
    description: "Career, job, location, and company history source.",
    status: "Available",
    isAvailable: true,
    href: "#hris-mutation-import",
    icon: History,
  },
  {
    title: "Performance",
    description: "Official yearly performance source from Performance Department.",
    status: "Coming Soon",
    isAvailable: false,
    icon: TrendingUp,
  },
  {
    title: "SP / Disciplinary",
    description: "Disciplinary records and audit finding source.",
    status: "Coming Soon",
    isAvailable: false,
    icon: ShieldAlert,
  },
];

export function EmployeeHistoryDataImportPage() {
  return (
    <section className="esm-settings-page">
      <article className="esm-card esm-settings-hero">
        <div>
          <p className="esm-eyebrow">
            <Database size={16} />
            Settings / Employee History
          </p>
          <h2>Data Import</h2>
          <span>Manage Employee 360 source data imports from controlled HR sources.</span>
        </div>
      </article>

      <article className="esm-card esm-data-source-panel">
        <div className="esm-card-header">
          <div>
            <p>Employee History Data Sources</p>
            <h3>Source readiness</h3>
          </div>
          <span>Employee 360</span>
        </div>

        <div className="esm-data-source-list">
          {dataSources.map((source) => {
            const Icon = source.icon;

            return (
              <div className="esm-data-source-row" key={source.title}>
                <span className="esm-data-source-icon">
                  <Icon size={18} />
                </span>
                <div>
                  <strong>{source.title}</strong>
                  <p>{source.description}</p>
                </div>
                <span
                  className={`esm-soft-badge ${
                    source.isAvailable ? "success" : "blue"
                  }`}
                >
                  {source.status}
                </span>
                {source.isAvailable ? (
                  <Link href={source.href ?? "#"}>Import</Link>
                ) : (
                  <button disabled type="button">
                    Not Implemented
                    <Clock3 size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </article>

      <EmployeeMasterImportCard />
      <EmployeeMutationImportCard />
    </section>
  );
}
