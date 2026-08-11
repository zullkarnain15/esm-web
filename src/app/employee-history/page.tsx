import { EmployeeHistoryPage } from "@/components/employee-history/EmployeeHistoryPage";
import { AppShell } from "@/components/layout/AppShell";
import { hrisEmployeeMasterSource, hrisMutationSource } from "@/data/employee-history";
import type { EmployeeMutationRecord, EmployeeProfile } from "@/data/employee-history";
import { prisma } from "@/lib/prisma";

type Snapshot = {
  jobCode?: string | null;
  jobDescription?: string | null;
  location?: string | null;
  company?: string | null;
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

export default async function Page() {
  const employees = await prisma.employee.findMany({
    include: { currentEmployment: true },
    orderBy: { name: "asc" },
  });
  const mutations = await prisma.employeeMutation.findMany({
    include: { sourceBatch: true },
    orderBy: [{ effectiveDate: "desc" }, { id: "desc" }],
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

  return (
    <AppShell>
      <EmployeeHistoryPage
        employeeProfiles={employeeProfiles}
        mutationRecords={mutationRecords}
      />
    </AppShell>
  );
}
