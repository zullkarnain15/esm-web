"use client";

import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  FileText,
  IdCard,
  MapPin,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { dummyEmployeeProfiles, getEmployee360View } from "@/data/employee-history";
import type { EmployeeProfile, KyeStatus } from "@/data/employee-history";

type EmployeeHistoryTab = "overview" | "career" | "performance" | "sp" | "services";

const tabs: { id: EmployeeHistoryTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "career", label: "Career" },
  { id: "performance", label: "Performance" },
  { id: "sp", label: "SP" },
  { id: "services", label: "Services" },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getKyeBadgeClass(status: KyeStatus) {
  const statusClass: Record<KyeStatus, string> = {
    CLEAR: "success",
    OVERDUE: "warning",
    UNKNOWN: "blue",
  };

  return statusClass[status];
}

function createOverviewCards(employee: EmployeeProfile) {
  const { currentEmployment, identity, kyeSummary } = employee;

  return [
    {
      title: "Current Employment",
      icon: BriefcaseBusiness,
      tone: "blue",
      items: [
        ["Company", currentEmployment.company],
        ["Division", currentEmployment.division],
        ["Position", currentEmployment.position],
        ["Location", currentEmployment.location],
      ],
    },
    {
      title: "Employment Information",
      icon: IdCard,
      tone: "cyan",
      items: [
        ["Employee ID", identity.employeeId],
        ["PG", currentEmployment.payGrade],
        ["Status", currentEmployment.employmentStatus],
        ["Hire Date", currentEmployment.hireDate],
      ],
    },
    {
      title: "KYE Status",
      icon: ShieldCheck,
      tone: "purple",
      items: [
        ["Current Status", kyeSummary.status],
        ["Last Review", kyeSummary.lastUpdated],
        ["Source", kyeSummary.source.sourceName],
        ["Source Batch", kyeSummary.source.sourceBatch],
      ],
    },
    {
      title: "Quick Summary",
      icon: FileText,
      tone: "green",
      items: [
        ["Career Movement", "2 records"],
        ["Performance Notes", "3 cycles"],
        ["SP Record", "No active record"],
        ["Service History", "12 requests"],
      ],
    },
  ];
}

const emptyStateCopy: Record<Exclude<EmployeeHistoryTab, "overview">, string> = {
  career: "Career history from HRIS Mutation will be displayed here.",
  performance: "Performance source records will be displayed here.",
  sp: "SP / disciplinary source records will be displayed here.",
  services: "Service history will be displayed here.",
};

function renderRecordList<TRecord extends { id: string; source: { sourceName: string; sourceBatch: string } }>(
  title: string,
  description: string,
  records: TRecord[],
  getItems: (record: TRecord) => [string, string][],
) {
  if (!records.length) {
    return (
      <article className="esm-card esm-history-empty">
        <span>
          <FileText size={24} />
        </span>
        <h3>{title}</h3>
        <p>{description}</p>
      </article>
    );
  }

  return (
    <section className="esm-source-record-grid" aria-label={title}>
      {records.map((record) => (
        <article className="esm-card esm-source-record-card" key={record.id}>
          <div className="esm-overview-card-title">
            <span>
              <FileText size={18} />
            </span>
            <div>
              <h3>{record.id}</h3>
              <p>{record.source.sourceName}</p>
            </div>
          </div>
          <div className="esm-overview-list">
            {getItems(record).map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
            <div>
              <span>Source Batch</span>
              <strong>{record.source.sourceBatch}</strong>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

export function EmployeeHistoryPage() {
  const [activeTab, setActiveTab] = useState<EmployeeHistoryTab>("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeProfile | null>(null);
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const canSearch = normalizedSearch.length >= 2;
  const searchResults = dummyEmployeeProfiles.filter((employee) => {
    const identity = employee.identity;

    return `${identity.employeeId} ${identity.employeeName}`
      .toLowerCase()
      .includes(normalizedSearch);
  });
  const visibleEmployees = canSearch ? searchResults : [];
  const employee360 = selectedEmployee
    ? getEmployee360View(selectedEmployee.identity.employeeId)
    : undefined;
  const overviewCards = employee360 ? createOverviewCards(employee360.profile) : [];

  return (
    <section className="esm-employee-page">
      <article className="esm-card esm-employee-search-card">
        <div className="esm-card-header">
          <div>
            <p>Employee Lookup</p>
            <h3>Find employee service records</h3>
            <small>
              Search profile, career journey, performance, disciplinary records,
              and service history.
            </small>
          </div>
          <span>Dummy data</span>
        </div>
        <label className="esm-history-search" aria-label="Search employee history">
          <Search size={18} />
          <input
            placeholder="Search by Employee ID / NIK or Employee Name"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>
        <div className="esm-employee-results">
          {!normalizedSearch ? (
            <div className="esm-lookup-helper">
              <Search size={20} />
              <span>Type an Employee ID / NIK or name to start searching.</span>
            </div>
          ) : null}

          {normalizedSearch && !canSearch ? (
            <div className="esm-lookup-helper">
              <Search size={20} />
              <span>Enter at least 2 characters to search employee records.</span>
            </div>
          ) : null}

          {canSearch && visibleEmployees.length === 0 ? (
            <div className="esm-lookup-helper">
              <FileText size={20} />
              <span>No employee found</span>
            </div>
          ) : null}

          {visibleEmployees.map((employee) => {
            const isSelected =
              employee.identity.employeeId === selectedEmployee?.identity.employeeId;

            return (
              <button
                className={`esm-employee-result${isSelected ? " is-selected" : ""}`}
                key={employee.identity.employeeId}
                type="button"
                onClick={() => setSelectedEmployee(employee)}
              >
                <span className="esm-result-avatar">
                  {getInitials(employee.identity.employeeName)}
                </span>
                <span>
                  <strong>{employee.identity.employeeName}</strong>
                  <small>
                    {employee.identity.employeeId} / {employee.currentEmployment.division}
                  </small>
                </span>
                <BadgeCheck size={18} />
              </button>
            );
          })}
        </div>
      </article>

      {selectedEmployee ? (
        <>
          <article className="esm-card esm-profile-card">
            <div className="esm-profile-avatar" aria-hidden="true">
              {getInitials(selectedEmployee.identity.employeeName)}
            </div>
            <div className="esm-profile-main">
              <div className="esm-profile-title-row">
                <div>
                  <p>{selectedEmployee.identity.employeeId}</p>
                  <h3>{selectedEmployee.identity.employeeName}</h3>
                </div>
                <div className="esm-profile-badges">
                  <span className="esm-soft-badge success">
                    {selectedEmployee.activeStatus === "ACTIVE" ? "Active" : "Inactive"}
                  </span>
                  <span
                    className={`esm-soft-badge ${getKyeBadgeClass(
                      selectedEmployee.kyeSummary.status,
                    )}`}
                  >
                    KYE {selectedEmployee.kyeSummary.status}
                  </span>
                </div>
              </div>
              <div className="esm-profile-meta-grid">
                <div>
                  <BriefcaseBusiness size={16} />
                  <span>{selectedEmployee.currentEmployment.company}</span>
                </div>
                <div>
                  <UserRound size={16} />
                  <span>{selectedEmployee.currentEmployment.position}</span>
                </div>
                <div>
                  <MapPin size={16} />
                  <span>{selectedEmployee.currentEmployment.location}</span>
                </div>
                <div>
                  <CalendarDays size={16} />
                  <span>Hire Date: {selectedEmployee.currentEmployment.hireDate}</span>
                </div>
                <div>
                  <Clock3 size={16} />
                  <span>
                    Length of Service: {selectedEmployee.currentEmployment.lengthOfService}
                  </span>
                </div>
              </div>
            </div>
          </article>

          <div
            className="esm-history-tabs"
            role="tablist"
            aria-label="Employee history sections"
          >
            {tabs.map((tab) => (
              <button
                className={activeTab === tab.id ? "is-active" : ""}
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "overview" && employee360 ? (
            <section className="esm-overview-grid" aria-label="Employee overview">
              {overviewCards.map((card) => {
                const Icon = card.icon;

                return (
                  <article
                    className={`esm-card esm-overview-card tone-${card.tone}`}
                    key={card.title}
                  >
                    <div className="esm-overview-card-title">
                      <span>
                        <Icon size={18} />
                      </span>
                      <h3>{card.title}</h3>
                    </div>
                    <div className="esm-overview-list">
                      {card.items.map(([label, value]) => (
                        <div key={label}>
                          <span>{label}</span>
                          <strong>{value}</strong>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}
            </section>
          ) : null}

          {activeTab === "career" && employee360
            ? renderRecordList(
                "Career",
                emptyStateCopy.career,
                employee360.mutations,
                (record) => [
                  ["Effective Date", record.effectiveDate],
                  ["Mutation Type", record.mutationType],
                  ["Previous Position", record.previousPosition ?? "-"],
                  ["New Position", record.newPosition ?? "-"],
                  ["Previous Location", record.previousLocation ?? "-"],
                  ["New Location", record.newLocation ?? "-"],
                ],
              )
            : null}

          {activeTab === "performance" && employee360
            ? renderRecordList(
                "Performance",
                emptyStateCopy.performance,
                employee360.performanceRecords,
                (record) => [
                  ["Perf 2025", record.performance2025],
                  ["3 Bulan", record.threeMonthPerformance],
                  ["6 Bulan", record.sixMonthPerformance],
                  ["12 Bulan", record.twelveMonthPerformance],
                  ["Last Performance", record.lastPerformance],
                  ["Category", record.qualitativeCategory],
                ],
              )
            : null}

          {activeTab === "sp" && employee360
            ? renderRecordList(
                "SP",
                emptyStateCopy.sp,
                employee360.disciplinaryRecords,
                (record) => [
                  ["Pay Group", record.payGroup],
                  ["Discipline Type", record.disciplineType],
                  ["Description", record.description],
                  ["Report Date", record.reportDate],
                  ["Purge Date", record.purgeDate],
                  ["TEMUAN_ICU", record.temuanIcu],
                ],
              )
            : null}

          {activeTab === "services" ? (
            <article className="esm-card esm-history-empty">
              <span>
                <FileText size={24} />
              </span>
              <h3>Services</h3>
              <p>{emptyStateCopy.services}</p>
            </article>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
