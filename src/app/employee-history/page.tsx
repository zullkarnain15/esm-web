import { EmployeeHistoryPage } from "@/components/employee-history/EmployeeHistoryPage";
import { AppShell } from "@/components/layout/AppShell";
import {
  disciplinarySource,
  hrisEmployeeMasterSource,
  hrisMutationSource,
  performanceSource,
} from "@/data/employee-history";
import type {
  EmployeeDisciplinaryRecord,
  EmployeeMutationRecord,
  EmployeePerformanceRecord,
  EmployeeProfile,
} from "@/data/employee-history";
import { prisma } from "@/lib/prisma";

type Snapshot = {
  jobCode?: string | null;
  jobDescription?: string | null;
  location?: string | null;
  company?: string | null;
};

type MonthlyValue = {
  sequence: number;
  sourceHeader: string;
  value: string | null;
};

function formatDate(date: Date | null | undefined) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function calculateLengthOfService(hireDate: Date | null) {
  if (!hireDate) {
    return "-";
  }

  const today = new Date();
  let years = today.getFullYear() - hireDate.getFullYear();
  let months = today.getMonth() - hireDate.getMonth();

  if (today.getDate() < hireDate.getDate()) {
    months -= 1;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return `${years} years ${months} months`;
}

function snapshotValue(snapshot: unknown, field: keyof Snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return undefined;
  }

  const value = (snapshot as Snapshot)[field];

  return value ?? undefined;
}

function monthlyValuesFromJson(value: unknown): MonthlyValue[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return undefined;
      }

      const entry = item as Partial<MonthlyValue>;

      if (typeof entry.sequence !== "number" || typeof entry.sourceHeader !== "string") {
        return undefined;
      }

      return {
        sequence: entry.sequence,
        sourceHeader: entry.sourceHeader,
        value: entry.value === null || entry.value === undefined ? null : String(entry.value),
      };
    })
    .filter((item): item is MonthlyValue => Boolean(item))
    .sort((left, right) => left.sequence - right.sequence);
}

export default async function Page() {
  const employees = await prisma.employee.findMany({
    include: { currentEmployment: true },
    orderBy: { name: "asc" },
  });
  const mutations = await prisma.employeeMutation.findMany({
    include: { sourceBatch: true },
    orderBy: [{ effectiveDate: "desc" }, { id: "desc" }],
  });
  const performances = await prisma.employeePerformance.findMany({
    include: {
      performancePeriod: true,
      sourceBatch: true,
    },
    orderBy: [
      { performancePeriod: { year: "desc" } },
      { performancePeriod: { createdAt: "desc" } },
      { id: "desc" },
    ],
  });
  const disciplinaryRecords = await prisma.employeeDisciplinary.findMany({
    include: {
      employee: true,
      sourceBatch: true,
    },
    orderBy: [{ reportDate: "desc" }, { id: "desc" }],
  });
  const employeeProfiles: EmployeeProfile[] = employees.map((employee) => {
    const currentEmployment = employee.currentEmployment;

    return {
      identity: {
        employeeId: employee.employeeId,
        employeeName: employee.name,
        birthDate: formatDate(employee.birthDate),
      },
      currentEmployment: {
        company: currentEmployment?.company ?? "-",
        division:
          currentEmployment?.department ??
          currentEmployment?.businessDivision ??
          currentEmployment?.regional ??
          "-",
        position:
          currentEmployment?.positionDescription ??
          currentEmployment?.jobDescription ??
          currentEmployment?.position ??
          "-",
        jobCode: currentEmployment?.jobCode ?? undefined,
        location: currentEmployment?.location ?? "-",
        payGrade: currentEmployment?.personGrade ?? currentEmployment?.jobGrade ?? "-",
        employmentStatus: currentEmployment?.employmentStatus ?? "-",
        hireDate: formatDate(employee.hireDate),
        lengthOfService: calculateLengthOfService(employee.hireDate),
      },
      kyeSummary: {
        status: "UNKNOWN",
        lastUpdated: "Not available",
        source: hrisEmployeeMasterSource,
      },
      activeStatus: employee.activeStatus === "INACTIVE" ? "INACTIVE" : "ACTIVE",
      source: hrisEmployeeMasterSource,
    };
  });
  const mutationRecords: EmployeeMutationRecord[] = mutations.map((mutation) => ({
    id: `MUT-${mutation.id}`,
    employeeId: mutation.employeeId,
    effectiveDate: formatDate(mutation.effectiveDate),
    mutationType: "HRIS Mutation",
    previousJobCode: snapshotValue(mutation.previousSnapshot, "jobCode"),
    newJobCode: snapshotValue(mutation.newSnapshot, "jobCode") ?? mutation.jobCode ?? undefined,
    previousJobDescription: snapshotValue(mutation.previousSnapshot, "jobDescription"),
    newJobDescription:
      snapshotValue(mutation.newSnapshot, "jobDescription") ??
      mutation.jobDescription ??
      undefined,
    previousCompany: snapshotValue(mutation.previousSnapshot, "company"),
    newCompany: snapshotValue(mutation.newSnapshot, "company") ?? mutation.company ?? undefined,
    previousLocation: snapshotValue(mutation.previousSnapshot, "location"),
    newLocation: snapshotValue(mutation.newSnapshot, "location") ?? mutation.location ?? undefined,
    source: {
      ...hrisMutationSource,
      sourceBatch: mutation.sourceBatch
        ? `Batch ${mutation.sourceBatch.id}`
        : hrisMutationSource.sourceBatch,
      sourceFile: mutation.sourceBatch?.originalFileName ?? hrisMutationSource.sourceFile,
      uploadedAt: mutation.sourceBatch?.uploadedAt.toISOString() ?? hrisMutationSource.uploadedAt,
      lastUpdated: mutation.createdAt.toISOString().slice(0, 10),
    },
    recordedAt: mutation.createdAt.toISOString(),
  }));
  const performanceRecords: EmployeePerformanceRecord[] = performances.map((performance) => ({
    id: `PERF-${performance.id}`,
    employeeId: performance.employeeId,
    employeeName: "",
    hireDate: "",
    employmentStatus: "",
    locationDescription: "",
    mainBranch: "",
    regional: "",
    jobDescription: "",
    company: "",
    monthlyPerformanceLabel: "Rolling 12-month source values",
    performance2025: performance.qualitativeCategory ?? "-",
    annualPerformance: performance.qualitativeCategory ?? "-",
    threeMonthPerformance: performance.performance3Months ?? "-",
    sixMonthPerformance: performance.performance6Months ?? "-",
    twelveMonthPerformance: performance.performance12Months ?? "-",
    lastPerformance: performance.lastPerformance ?? "-",
    qualitativeCategory: performance.qualitativeCategory ?? "-",
    periodLabel: performance.performancePeriod.periodLabel,
    monthlyValues: monthlyValuesFromJson(performance.monthlyValues),
    source: {
      ...performanceSource,
      sourceBatch: performance.sourceBatch
        ? `Batch ${performance.sourceBatch.id}`
        : performanceSource.sourceBatch,
      sourceFile: performance.sourceBatch?.originalFileName ?? performanceSource.sourceFile,
      uploadedAt:
        performance.sourceBatch?.uploadedAt.toISOString() ?? performanceSource.uploadedAt,
      lastUpdated: performance.createdAt.toISOString().slice(0, 10),
    },
    recordedAt: performance.createdAt.toISOString(),
  }));
  const spRecords: EmployeeDisciplinaryRecord[] = disciplinaryRecords.map((record) => ({
    id: `SP-${record.id}`,
    employeeId: record.employeeId,
    employeeName: record.employee.name,
    payGroup: record.payGroup ?? "-",
    disciplineType: record.disciplinaryType ?? "-",
    disciplinaryType: record.disciplinaryType ?? "-",
    description: record.description ?? "-",
    reportDate: formatDate(record.reportDate),
    purgeDate: formatDate(record.purgeDate),
    disciplinary: record.disciplinaryCategory ?? "-",
    disciplinaryCategory: record.disciplinaryCategory ?? "-",
    temuanIcu: record.temuanIcuRaw ?? "-",
    temuanIcuRaw: record.temuanIcuRaw ?? "-",
    isAuditFinding: record.isAuditFinding,
    source: {
      ...disciplinarySource,
      sourceBatch: record.sourceBatch
        ? `Batch ${record.sourceBatch.id}`
        : disciplinarySource.sourceBatch,
      sourceFile: record.sourceBatch?.originalFileName ?? disciplinarySource.sourceFile,
      uploadedAt: record.sourceBatch?.uploadedAt.toISOString() ?? disciplinarySource.uploadedAt,
      lastUpdated: record.createdAt.toISOString().slice(0, 10),
    },
    recordedAt: record.createdAt.toISOString(),
  }));

  return (
    <AppShell>
      <EmployeeHistoryPage
        employeeProfiles={employeeProfiles}
        mutationRecords={mutationRecords}
        performanceRecords={performanceRecords}
        disciplinaryRecords={spRecords}
      />
    </AppShell>
  );
}
