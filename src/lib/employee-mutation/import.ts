import type { ImportBatchStatus } from "@/generated/prisma/enums";
import { readXlsxSheets } from "@/lib/employee-master/xlsx";
import { prisma } from "@/lib/prisma";

export type EmployeeMutationRecord = {
  employeeId: string;
  employeeName: string | null;
  effectiveDate: string;
  jobCode: string | null;
  jobDescription: string | null;
  location: string | null;
  company: string | null;
};

export type EmployeeMutationChange = {
  employeeId: string;
  effectiveDate: string;
  field: string;
  previousValue: string;
  newValue: string;
};

export type EmployeeMutationPreview = {
  ok: boolean;
  fileName: string;
  sheetName?: string;
  totalRecords: number;
  valid: number;
  invalid: number;
  newMutation: number;
  noChange: number;
  unmatchedEmployee: number;
  errors: string[];
  sampleChanges: EmployeeMutationChange[];
  records: EmployeeMutationRecord[];
};

export type EmployeeMutationProcessResult = {
  ok: boolean;
  batchId?: number;
  status?: ImportBatchStatus;
  totalRecords: number;
  created: number;
  noChange: number;
  unmatchedEmployee: number;
  errors: string[];
};

type HeaderKey = keyof EmployeeMutationRecord;

type DerivedMutation = EmployeeMutationRecord & {
  effectiveDateValue: Date;
  previousSnapshot: MutationSnapshot | null;
  newSnapshot: MutationSnapshot;
  isMeaningful: boolean;
};

type MutationSnapshot = {
  jobCode: string | null;
  jobDescription: string | null;
  location: string | null;
  company: string | null;
};

const requiredFields: HeaderKey[] = [
  "employeeId",
  "employeeName",
  "effectiveDate",
  "jobCode",
  "jobDescription",
  "location",
  "company",
];

const exactHeaderMapping: Record<HeaderKey, string> = {
  employeeId: "ID",
  effectiveDate: "Eff Date",
  employeeName: "Name",
  jobCode: "Job Code",
  jobDescription: "Job Code Descr",
  location: "Location",
  company: "Company",
};

const approvedHeaderAliases: Partial<Record<HeaderKey, string[]>> = {};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function aliasesFor(field: HeaderKey) {
  return [
    exactHeaderMapping[field],
    ...(approvedHeaderAliases[field] ?? []),
  ].map(normalizeHeader);
}

function stringValue(row: string[], index: number | undefined) {
  if (index === undefined) {
    return null;
  }

  const value = row[index]?.trim();

  return value ? value : null;
}

function parseSourceDate(value: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  const excelSerial = /^[0-9]+(?:\.[0-9]+)?$/.test(trimmed) ? Number(trimmed) : null;

  if (excelSerial && excelSerial > 20000 && excelSerial < 80000) {
    const epoch = Date.UTC(1899, 11, 30);
    return new Date(epoch + excelSerial * 86_400_000);
  }

  const parsed = new Date(trimmed);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function snapshotFromRecord(record: EmployeeMutationRecord): MutationSnapshot {
  return {
    jobCode: record.jobCode,
    jobDescription: record.jobDescription,
    location: record.location,
    company: record.company,
  };
}

function snapshotsEqual(previous: MutationSnapshot, next: MutationSnapshot) {
  return (
    previous.jobCode === next.jobCode &&
    previous.jobDescription === next.jobDescription &&
    previous.location === next.location &&
    previous.company === next.company
  );
}

function valueForCompare(value: unknown) {
  if (value instanceof Date) {
    return toIsoDate(value);
  }

  return value === null || value === undefined ? "" : String(value).trim();
}

function findHeaderMap(rows: string[][]) {
  const candidates = rows.slice(0, 12);

  for (let rowIndex = 0; rowIndex < candidates.length; rowIndex += 1) {
    const normalizedHeaders = candidates[rowIndex].map(normalizeHeader);
    const headerMap = new Map<HeaderKey, number>();
    const ambiguousFields: HeaderKey[] = [];

    for (const field of Object.keys(exactHeaderMapping) as HeaderKey[]) {
      const aliases = aliasesFor(field);
      const columnIndexes = normalizedHeaders
        .map((header, index) => (aliases.includes(header) ? index : -1))
        .filter((index) => index >= 0);

      if (columnIndexes.length === 1) {
        headerMap.set(field, columnIndexes[0]);
      }

      if (columnIndexes.length > 1) {
        ambiguousFields.push(field);
      }
    }

    if (!ambiguousFields.length && requiredFields.every((field) => headerMap.has(field))) {
      return { rowIndex, headerMap };
    }
  }

  return undefined;
}

function parseRecordsFromRows(rows: string[][], headerMap: Map<HeaderKey, number>, startRow: number) {
  const records: EmployeeMutationRecord[] = [];
  const errors: string[] = [];

  for (let rowIndex = startRow; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];

    if (!row.some((cell) => cell?.trim())) {
      continue;
    }

    const record: EmployeeMutationRecord = {
      employeeId: stringValue(row, headerMap.get("employeeId")) ?? "",
      employeeName: stringValue(row, headerMap.get("employeeName")),
      effectiveDate: stringValue(row, headerMap.get("effectiveDate")) ?? "",
      jobCode: stringValue(row, headerMap.get("jobCode")),
      jobDescription: stringValue(row, headerMap.get("jobDescription")),
      location: stringValue(row, headerMap.get("location")),
      company: stringValue(row, headerMap.get("company")),
    };

    if (!record.employeeId) {
      errors.push(`Row ${rowIndex + 1}: ID / Employee ID is required.`);
      continue;
    }

    if (!record.effectiveDate || !parseSourceDate(record.effectiveDate)) {
      errors.push(`Row ${rowIndex + 1}: Eff Date is invalid for ${record.employeeId}.`);
      continue;
    }

    records.push(record);
  }

  return { records, errors };
}

function findEmployeeMutationSheet(buffer: Buffer) {
  const sheets = readXlsxSheets(buffer);

  for (const sheet of sheets) {
    const header = findHeaderMap(sheet.rows);

    if (header) {
      return { sheet, ...header };
    }
  }

  return undefined;
}

function deriveMutationSequence(records: EmployeeMutationRecord[]) {
  const grouped = new Map<string, EmployeeMutationRecord[]>();

  for (const record of records) {
    const group = grouped.get(record.employeeId) ?? [];
    group.push(record);
    grouped.set(record.employeeId, group);
  }

  const derived: DerivedMutation[] = [];

  for (const group of grouped.values()) {
    const sorted = [...group].sort((left, right) => {
      const leftDate = parseSourceDate(left.effectiveDate)?.getTime() ?? 0;
      const rightDate = parseSourceDate(right.effectiveDate)?.getTime() ?? 0;

      return leftDate - rightDate;
    });
    let previousSnapshot: MutationSnapshot | null = null;

    for (const record of sorted) {
      const effectiveDateValue = parseSourceDate(record.effectiveDate);

      if (!effectiveDateValue) {
        continue;
      }

      const newSnapshot = snapshotFromRecord(record);
      const isMeaningful =
        !previousSnapshot || !snapshotsEqual(previousSnapshot, newSnapshot);

      derived.push({
        ...record,
        effectiveDateValue,
        effectiveDate: toIsoDate(effectiveDateValue),
        previousSnapshot,
        newSnapshot,
        isMeaningful,
      });

      previousSnapshot = newSnapshot;
    }
  }

  return derived;
}

function mutationKey(record: Pick<DerivedMutation, "employeeId" | "effectiveDate" | "jobCode" | "jobDescription" | "location" | "company">) {
  return [
    record.employeeId,
    record.effectiveDate,
    valueForCompare(record.jobCode),
    valueForCompare(record.jobDescription),
    valueForCompare(record.location),
    valueForCompare(record.company),
  ].join("||");
}

async function buildPreview(fileName: string, records: EmployeeMutationRecord[], errors: string[]) {
  const parseErrors = [...errors];
  const derivedRecords = deriveMutationSequence(records);
  const employeeIds = Array.from(new Set(derivedRecords.map((record) => record.employeeId)));
  const employees = await prisma.employee.findMany({
    where: { employeeId: { in: employeeIds } },
    select: { id: true, employeeId: true },
  });
  const employeesById = new Map(employees.map((employee) => [employee.employeeId, employee]));
  const existingMutations = await prisma.employeeMutation.findMany({
    where: { employeeId: { in: employeeIds } },
    select: {
      employeeId: true,
      effectiveDate: true,
      jobCode: true,
      jobDescription: true,
      location: true,
      company: true,
    },
  });
  const existingKeys = new Set(
    existingMutations.map((record) =>
      mutationKey({
        ...record,
        effectiveDate: toIsoDate(record.effectiveDate),
      }),
    ),
  );
  const sampleChanges: EmployeeMutationChange[] = [];
  const payloadRecords: EmployeeMutationRecord[] = [];
  let unmatchedEmployee = 0;
  let noChange = 0;
  let newMutation = 0;

  for (const record of derivedRecords) {
    if (!employeesById.has(record.employeeId)) {
      unmatchedEmployee += 1;
      errors.push(`EMPLOYEE_NOT_FOUND: ${record.employeeId} is not available in Employee Master.`);
      continue;
    }

    payloadRecords.push(record);

    if (!record.isMeaningful || existingKeys.has(mutationKey(record))) {
      noChange += 1;
      continue;
    }

    newMutation += 1;

    for (const field of ["jobCode", "jobDescription", "location", "company"] as const) {
      const previousValue = valueForCompare(record.previousSnapshot?.[field]);
      const newValue = valueForCompare(record.newSnapshot[field]);

      if (previousValue !== newValue) {
        sampleChanges.push({
          employeeId: record.employeeId,
          effectiveDate: record.effectiveDate,
          field,
          previousValue,
          newValue,
        });
      }
    }
  }

  return {
    ok: errors.length === 0,
    fileName,
    totalRecords: records.length,
    valid: records.length - unmatchedEmployee,
    invalid: parseErrors.length,
    newMutation,
    noChange,
    unmatchedEmployee,
    errors,
    sampleChanges: sampleChanges.slice(0, 8),
    records: payloadRecords,
  };
}

export async function previewEmployeeMutationImport(file: File): Promise<EmployeeMutationPreview> {
  const emptyPreview: EmployeeMutationPreview = {
    ok: false,
    fileName: file.name,
    totalRecords: 0,
    valid: 0,
    invalid: 0,
    newMutation: 0,
    noChange: 0,
    unmatchedEmployee: 0,
    errors: [],
    sampleChanges: [],
    records: [],
  };

  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return {
      ...emptyPreview,
      invalid: 1,
      errors: ["Only .xlsx files are supported for HRIS Mutation import."],
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const matchedSheet = findEmployeeMutationSheet(buffer);

  if (!matchedSheet) {
    return {
      ...emptyPreview,
      invalid: 1,
      errors: [
        "No sheet with matching HRIS Mutation headers was found. Required headers: ID, Eff Date, Name, Job Code, Job Code Descr, Location, Company.",
      ],
    };
  }

  const { records, errors } = parseRecordsFromRows(
    matchedSheet.sheet.rows,
    matchedSheet.headerMap,
    matchedSheet.rowIndex + 1,
  );
  const preview = await buildPreview(file.name, records, errors);

  return {
    ...preview,
    sheetName: matchedSheet.sheet.sheetName,
  };
}

export async function processEmployeeMutationImport(
  fileName: string,
  records: EmployeeMutationRecord[],
): Promise<EmployeeMutationProcessResult> {
  if (!records.length) {
    return {
      ok: false,
      totalRecords: 0,
      created: 0,
      noChange: 0,
      unmatchedEmployee: 0,
      errors: ["No new valid mutation records to process."],
    };
  }

  return prisma.$transaction(async (tx) => {
    const derivedRecords = deriveMutationSequence(records).filter((record) => record.isMeaningful);
    const employeeIds = Array.from(new Set(derivedRecords.map((record) => record.employeeId)));
    const employees = await tx.employee.findMany({
      where: { employeeId: { in: employeeIds } },
      select: { id: true, employeeId: true },
    });
    const employeesById = new Map(employees.map((employee) => [employee.employeeId, employee]));
    const existingMutations = await tx.employeeMutation.findMany({
      where: { employeeId: { in: employeeIds } },
      select: {
        employeeId: true,
        effectiveDate: true,
        jobCode: true,
        jobDescription: true,
        location: true,
        company: true,
      },
    });
    const existingKeys = new Set(
      existingMutations.map((record) =>
        mutationKey({
          ...record,
          effectiveDate: toIsoDate(record.effectiveDate),
        }),
      ),
    );
    const errors: string[] = [];
    let unmatchedEmployee = 0;
    let created = 0;
    let noChange = 0;

    for (const record of derivedRecords) {
      if (!employeesById.has(record.employeeId)) {
        unmatchedEmployee += 1;
        errors.push(`EMPLOYEE_NOT_FOUND: ${record.employeeId} is not available in Employee Master.`);
      }
    }

    if (errors.length) {
      return {
        ok: false,
        totalRecords: records.length,
        created: 0,
        noChange: 0,
        unmatchedEmployee,
        errors,
      };
    }

    const batch = await tx.importBatch.create({
      data: {
        sourceType: "HRIS_MUTATION",
        originalFileName: fileName,
        recordCount: records.length,
        status: "IMPORTED",
      },
    });

    for (const record of derivedRecords) {
      const employee = employeesById.get(record.employeeId);

      if (!employee || existingKeys.has(mutationKey(record))) {
        noChange += 1;
        continue;
      }

      await tx.employeeMutation.create({
        data: {
          employeeDbId: employee.id,
          employeeId: record.employeeId,
          effectiveDate: record.effectiveDateValue,
          jobCode: record.jobCode,
          jobDescription: record.jobDescription,
          location: record.location,
          company: record.company,
          previousSnapshot: record.previousSnapshot ?? undefined,
          newSnapshot: record.newSnapshot,
          sourceBatchId: batch.id,
        },
      });
      existingKeys.add(mutationKey(record));
      created += 1;
    }

    return {
      ok: true,
      batchId: batch.id,
      status: batch.status,
      totalRecords: records.length,
      created,
      noChange,
      unmatchedEmployee,
      errors: [],
    };
  });
}
