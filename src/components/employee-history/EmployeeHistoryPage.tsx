"use client";

import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  FileText,
  MapPin,
  Search,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { dummyEmployeeProfiles, getEmployee360View } from "@/data/employee-history";
import type {
  EmployeeDisciplinaryRecord,
  EmployeeMutationRecord,
  EmployeePerformanceRecord,
  EmployeeProfile,
  KyeStatus,
} from "@/data/employee-history";

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

function renderOverviewPortfolio(
  employee: EmployeeProfile,
  performanceRecords: EmployeePerformanceRecord[],
  disciplinaryRecords: EmployeeDisciplinaryRecord[],
) {
  const { currentEmployment, identity, kyeSummary } = employee;
  const latestPerformance = performanceRecords[0];
  const auditFindingCount = disciplinaryRecords.filter((record) => record.isAuditFinding).length;
  const spSummary = disciplinaryRecords.length
    ? `${disciplinaryRecords.length} record${disciplinaryRecords.length === 1 ? "" : "s"}`
    : "No active record";
  const highlights = [
    ["Company", currentEmployment.company],
    ["Division", currentEmployment.division],
    ["Position", currentEmployment.position],
    ["Location", currentEmployment.location],
    ["PG", currentEmployment.payGrade],
    ["Last Performance", latestPerformance?.lastPerformance ?? "-"],
    ["SP Record", spSummary],
    ["Audit Finding", auditFindingCount ? `${auditFindingCount} finding` : "Clear"],
  ];
  const profileFacts = [
    ["Employee ID", identity.employeeId],
    ["Hire Date", currentEmployment.hireDate],
    ["Length of Service", currentEmployment.lengthOfService],
    ["KYE Status", kyeSummary.status],
  ];

  return (
    <article className="esm-card esm-overview-portfolio">
      <div className="esm-overview-portfolio-main">
        <div className="esm-overview-portfolio-title">
          <span>
            <BriefcaseBusiness size={20} />
          </span>
          <div>
            <p>Employee 360 Overview</p>
            <h3>{currentEmployment.position}</h3>
            <small>
              {currentEmployment.division} / {currentEmployment.company} /{" "}
              {currentEmployment.location}
            </small>
          </div>
        </div>

        <div className="esm-overview-highlight-grid">
          {highlights.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </div>

      <aside className="esm-overview-portfolio-side">
        <div className="esm-overview-status-row">
          <span className={`esm-soft-badge ${getKyeBadgeClass(kyeSummary.status)}`}>
            KYE {kyeSummary.status}
          </span>
          <span className="esm-soft-badge blue">{kyeSummary.source.sourceName}</span>
        </div>

        <div className="esm-overview-fact-list">
          {profileFacts.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <div className="esm-overview-summary-strip">
          <div>
            <strong>Career</strong>
            <span>HRIS Mutation ready</span>
          </div>
          <div>
            <strong>Performance</strong>
            <span>{latestPerformance?.periodLabel ?? "Not available"}</span>
          </div>
          <div className={auditFindingCount ? "has-audit" : ""}>
            <strong>SP</strong>
            <span>
              {disciplinaryRecords.length
                ? `${spSummary}${auditFindingCount ? ` / ${auditFindingCount} audit` : ""}`
                : "No disciplinary history"}
            </span>
          </div>
        </div>
      </aside>
    </article>
  );
}

const emptyStateCopy: Record<Exclude<EmployeeHistoryTab, "overview">, string> = {
  career: "Career history from HRIS Mutation will be displayed here.",
  performance: "Performance source records will be displayed here.",
  sp: "SP / disciplinary source records will be displayed here.",
  services: "Service history will be displayed here.",
};

function hasChanged(previousValue?: string, newValue?: string) {
  return Boolean(previousValue && newValue && previousValue !== newValue);
}

function parseDisplayDate(value: string) {
  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function monthDiff(from: Date, to: Date) {
  let months =
    (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth();

  if (to.getDate() < from.getDate()) {
    months -= 1;
  }

  return Math.max(months, 0);
}

function formatDuration(from: Date | null, to: Date | null) {
  if (!from || !to) {
    return "-";
  }

  const totalMonths = monthDiff(from, to);
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  if (years && months) {
    return `${years} ${years === 1 ? "Yr" : "Yrs"} ${months} Mo`;
  }

  if (years) {
    return `${years} ${years === 1 ? "Yr" : "Yrs"}`;
  }

  return `${months} Mo`;
}

function ChangeCell({
  previousValue,
  newValue,
}: {
  previousValue?: string;
  newValue?: string;
}) {
  const changed = hasChanged(previousValue, newValue);

  return (
    <span className={`esm-career-value${changed ? " has-change" : ""}`}>
      {changed ? (
        <>
          <span>{previousValue}</span>
          <em aria-hidden="true">-&gt;</em>
          <strong>{newValue}</strong>
        </>
      ) : (
        <strong>{newValue ?? previousValue ?? "-"}</strong>
      )}
    </span>
  );
}

function renderCareerTable(records: EmployeeMutationRecord[]) {
  if (!records.length) {
    return (
      <article className="esm-card esm-history-empty">
        <span>
          <FileText size={24} />
        </span>
        <h3>Career</h3>
        <p>{emptyStateCopy.career}</p>
      </article>
    );
  }

  const sortedRecords = [...records].sort((left, right) => {
    const leftDate = parseDisplayDate(left.effectiveDate)?.getTime() ?? 0;
    const rightDate = parseDisplayDate(right.effectiveDate)?.getTime() ?? 0;

    return rightDate - leftDate;
  });

  return (
    <article className="esm-card esm-career-table-card">
      <div className="esm-career-table-header">
        <div>
          <p>HRIS Mutation</p>
          <h3>Career History</h3>
        </div>
        <span>{sortedRecords.length} records</span>
      </div>

      <div className="esm-career-table-wrap">
        <table className="esm-career-table">
          <thead>
            <tr>
              <th>Effective Date</th>
              <th>Job Description</th>
              <th>Company</th>
              <th>Location</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            {sortedRecords.map((record, index) => {
              const isCurrent = index === 0;
              const isFirst = index === sortedRecords.length - 1;
              const effectiveDate = parseDisplayDate(record.effectiveDate);
              const nextEffectiveDate = isCurrent
                ? new Date()
                : parseDisplayDate(sortedRecords[index - 1].effectiveDate);
              const duration = formatDuration(effectiveDate, nextEffectiveDate);

              return (
                <tr
                  className={`${isCurrent ? "is-current" : ""}${
                    isFirst ? " is-first" : ""
                  }`}
                  key={record.id}
                >
                  <td>
                    <strong>{record.effectiveDate}</strong>
                  </td>
                  <td>
                    <span className="esm-career-value">
                      <strong>{record.newJobDescription ?? record.previousJobDescription ?? "-"}</strong>
                    </span>
                  </td>
                  <td>
                    <ChangeCell
                      previousValue={record.previousCompany}
                      newValue={record.newCompany}
                    />
                  </td>
                  <td>
                    <ChangeCell
                      previousValue={record.previousLocation}
                      newValue={record.newLocation}
                    />
                  </td>
                  <td>
                    <span className="esm-career-duration">
                      <strong>{isCurrent ? "Current" : duration}</strong>
                      <small>
                        {isCurrent ? duration : isFirst ? "First Position" : "Historical"}
                      </small>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function renderPerformancePanel(records: EmployeePerformanceRecord[]) {
  if (!records.length) {
    return (
      <article className="esm-card esm-history-empty">
        <span>
          <FileText size={24} />
        </span>
        <h3>Performance</h3>
        <p>{emptyStateCopy.performance}</p>
      </article>
    );
  }

  const sortedRecords = [...records].sort((left, right) => {
    const leftDate = parseDisplayDate(left.recordedAt)?.getTime() ?? 0;
    const rightDate = parseDisplayDate(right.recordedAt)?.getTime() ?? 0;

    return rightDate - leftDate;
  });
  const latest = sortedRecords[0];
  const monthlyValues = latest.monthlyValues ?? [];
  const formatPerformanceNumber = (value: string | null | undefined) => {
    if (!value) {
      return "-";
    }

    const numeric = Number(value);

    if (Number.isNaN(numeric)) {
      return value;
    }

    return `${(numeric * 100).toFixed(1)}%`;
  };
  const summary = [
    ["Performance Period", latest.periodLabel ?? "-"],
    ["Annual Result", formatPerformanceNumber(latest.annualPerformance ?? latest.performance2025)],
    ["3 Months", latest.threeMonthPerformance],
    ["6 Months", latest.sixMonthPerformance],
    ["12 Months", latest.twelveMonthPerformance],
    ["Last Performance", latest.lastPerformance],
  ];

  return (
    <article className="esm-card esm-performance-panel">
      <div className="esm-performance-header">
        <div>
          <p>Performance Department</p>
          <h3>Performance Snapshot</h3>
          <small>{latest.source.sourceName}</small>
        </div>
        <span>{sortedRecords.length} period{sortedRecords.length === 1 ? "" : "s"}</span>
      </div>

      <div className="esm-performance-summary-grid">
        {summary.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="esm-performance-month-grid" aria-label="Monthly performance values">
        {monthlyValues.map((item) => (
          <div key={`${item.sequence}-${item.sourceHeader}`}>
            <span>
              M{item.sequence} <small>{item.sourceHeader}</small>
            </span>
            <strong>{formatPerformanceNumber(item.value)}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}

function renderDisciplinaryTable(records: EmployeeDisciplinaryRecord[]) {
  if (!records.length) {
    return (
      <article className="esm-card esm-history-empty">
        <span>
          <ShieldAlert size={24} />
        </span>
        <h3>SP</h3>
        <p>No disciplinary history found.</p>
      </article>
    );
  }

  const sortedRecords = [...records].sort((left, right) => {
    const leftDate = parseDisplayDate(left.reportDate)?.getTime() ?? 0;
    const rightDate = parseDisplayDate(right.reportDate)?.getTime() ?? 0;

    return rightDate - leftDate;
  });
  const auditCount = sortedRecords.filter((record) => record.isAuditFinding).length;

  return (
    <article className="esm-card esm-career-table-card esm-sp-table-card">
      <div className="esm-career-table-header esm-sp-table-header">
        <div>
          <p>SP / Disciplinary</p>
          <h3>Disciplinary History</h3>
        </div>
        <span>
          {sortedRecords.length} records / {auditCount} audit finding
          {auditCount === 1 ? "" : "s"}
        </span>
      </div>

      <div className="esm-career-table-wrap">
        <table className="esm-career-table esm-sp-table">
          <thead>
            <tr>
              <th>Report Date</th>
              <th>SP Type</th>
              <th>Description</th>
              <th>Category</th>
              <th>Purge Date</th>
              <th>Audit</th>
            </tr>
          </thead>
          <tbody>
            {sortedRecords.map((record) => (
              <tr className={record.isAuditFinding ? "is-audit" : ""} key={record.id}>
                <td>
                  <strong>{record.reportDate}</strong>
                </td>
                <td>
                  <span className="esm-sp-type">{record.disciplinaryType ?? record.disciplineType}</span>
                </td>
                <td>
                  <span className="esm-sp-description">{record.description}</span>
                </td>
                <td>
                  <span className="esm-sp-category">
                    {record.disciplinaryCategory ?? record.disciplinary}
                  </span>
                </td>
                <td>
                  <span className="esm-sp-purge">{record.purgeDate}</span>
                </td>
                <td>
                  {record.isAuditFinding ? (
                    <span className="esm-soft-badge warning">Audit Finding</span>
                  ) : (
                    <span className="esm-soft-badge blue">No</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

type EmployeeHistoryPageProps = {
  employeeProfiles?: EmployeeProfile[];
  mutationRecords?: EmployeeMutationRecord[];
  performanceRecords?: EmployeePerformanceRecord[];
  disciplinaryRecords?: EmployeeDisciplinaryRecord[];
};

export function EmployeeHistoryPage({
  employeeProfiles = dummyEmployeeProfiles,
  mutationRecords = [],
  performanceRecords = [],
  disciplinaryRecords = [],
}: EmployeeHistoryPageProps) {
  const [activeTab, setActiveTab] = useState<EmployeeHistoryTab>("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeProfile | null>(null);
  const searchableEmployees = employeeProfiles.length ? employeeProfiles : dummyEmployeeProfiles;
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const canSearch = normalizedSearch.length >= 2;
  const searchResults = searchableEmployees.filter((employee) => {
    const identity = employee.identity;

    return `${identity.employeeId} ${identity.employeeName}`
      .toLowerCase()
      .includes(normalizedSearch);
  });
  const visibleEmployees = canSearch ? searchResults.slice(0, 3) : [];
  const employee360 = selectedEmployee
    ? {
        ...(getEmployee360View(selectedEmployee.identity.employeeId) ?? {
          profile: selectedEmployee,
          performanceRecords: [],
          disciplinaryRecords: [],
        }),
        profile: selectedEmployee,
        mutations: mutationRecords.filter(
          (record) => record.employeeId === selectedEmployee.identity.employeeId,
        ),
        performanceRecords: performanceRecords.filter(
          (record) => record.employeeId === selectedEmployee.identity.employeeId,
        ),
        disciplinaryRecords: disciplinaryRecords.filter(
          (record) => record.employeeId === selectedEmployee.identity.employeeId,
        ),
      }
    : undefined;

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

          {activeTab === "overview" && employee360
            ? renderOverviewPortfolio(
                employee360.profile,
                employee360.performanceRecords,
                employee360.disciplinaryRecords,
              )
            : null}

          {activeTab === "career" && employee360
            ? renderCareerTable(employee360.mutations)
            : null}

          {activeTab === "performance" && employee360
            ? renderPerformancePanel(employee360.performanceRecords)
            : null}

          {activeTab === "sp" && employee360
            ? renderDisciplinaryTable(employee360.disciplinaryRecords)
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
