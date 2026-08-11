import type { ImportBatchStatus } from "@/generated/prisma/enums";
import { readXlsxSheets } from "@/lib/employee-master/xlsx";
import { prisma } from "@/lib/prisma";

export type EmployeeDisciplinaryRecord = {
  employeeId: string;
  employeeName: string | null;
  payGroup: string | null;
  disciplinaryType: string | null;
  description: string | null;
  reportDate: string;
  purgeDate: string | null;
  disciplinaryCategory: string | null;
  temuanIcuRaw: string | null;
  isAuditFinding: boolean;
};

export type EmployeeDisciplinaryPreview = {
  ok: boolean;
  fileName: string;
  sheetName?: string;
  totalRecords: number;
  valid: number;
  invalid: number;
  unmatchedEmployee: number;
  newDisciplinary: number;
  noChange: number;
  auditFindingCount: number;
  errors: string[];
  records: EmployeeDisciplinaryRecord[];
};

export type EmployeeDisciplinaryProcessResult = {
  ok: boolean;
  batchId?: number;
  status?: ImportBatchStatus;
  totalRecords: number;
  created: number;
  noChange: number;
  unmatchedEmployee: number;
  errors: string[];
};

type HeaderKey =
  | "payGroup"
  | "employeeId"
  | "employeeName"
  | "disciplinaryType"
  | "description"
  | "reportDate"
  | "purgeDate"
  | "disciplinaryCategory"
  | "temuanIcuRaw";

type ParsedDisciplinaryRecord = EmployeeDisciplinaryRecord & {
  reportDateValue: Date;
  purgeDateValue: Date | null;
};

const exactHeaderMapping: Record<HeaderKey, string> = {
  payGroup: "Pay Group",
  employeeId: "ID",
  employeeName: "Name",
  disciplinaryType: "Discp Type",
  description: "Descr",
  reportDate: "Report Dt",
  purgeDate: "Purge Dt",
  disciplinaryCategory: "Disciplinary",
  temuanIcuRaw: "TEMUAN_ICU",
};

const requiredFields: HeaderKey[] = ["employeeId", "reportDate"];

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
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

function normalizeAuditFinding(value: string | null) {
  if (!value) {
    return false;
  }

  return ["1", "Y", "YA", "YES"].includes(value.trim().toUpperCase());
}

function findHeaderMap(rows: string[][]) {
  const candidates = rows.slice(0, 12);

  for (let rowIndex = 0; rowIndex < candidates.length; rowIndex += 1) {
    const normalizedHeaders = candidates[rowIndex].map(normalizeHeader);
    const headerMap = new Map<HeaderKey, number>();
    const ambiguousFields: HeaderKey[] = [];

    for (const field of Object.keys(exactHeaderMapping) as HeaderKey[]) {
      const normalized = normalizeHeader(exactHeaderMapping[field]);
      const columnIndexes = normalizedHeaders
        .map((header, index) => (header === normalized ? index : -1))
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

function findEmployeeDisciplinarySheet(buffer: Buffer) {
  const sheets = readXlsxSheets(buffer);

  for (const sheet of sheets) {
    const header = findHeaderMap(sheet.rows);

    if (header) {
      return { sheet, ...header };
    }
  }

  return undefined;
}

function naturalKey(record: Pick<ParsedDisciplinaryRecord, "employeeId" | "disciplinaryType" | "description" | "reportDate" | "purgeDate" | "disciplinaryCategory">) {
  return [
    record.employeeId,
    record.disciplinaryType ?? "",
    record.reportDate,
    record.description ?? "",
    record.disciplinaryCategory ?? "",
    record.purgeDate ?? "",
  ].join("||");
}

function parseRecordsFromRows(rows: string[][], headerMap: Map<HeaderKey, number>, startRow: number) {
  const records: ParsedDisciplinaryRecord[] = [];
  const errors: string[] = [];
  const seenKeys = new Set<string>();
  let totalRecords = 0;

  for (let rowIndex = startRow; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];

    if (!row.some((cell) => cell?.trim())) {
      continue;
    }

    totalRecords += 1;

    const employeeId = stringValue(row, headerMap.get("employeeId")) ?? "";
    const reportDateRaw = stringValue(row, headerMap.get("reportDate"));
    const purgeDateRaw = stringValue(row, headerMap.get("purgeDate"));
    const reportDateValue = parseSourceDate(reportDateRaw);
    const purgeDateValue = purgeDateRaw ? parseSourceDate(purgeDateRaw) : null;

    if (!employeeId) {
      errors.push(`Row ${rowIndex + 1}: ID / Employee ID is required.`);
      continue;
    }

    if (!reportDateValue) {
      errors.push(`INVALID_REPORT_DATE: Row ${rowIndex + 1} has invalid Report Dt for ${employeeId}.`);
      continue;
    }

    if (purgeDateRaw && !purgeDateValue) {
      errors.push(`INVALID_PURGE_DATE: Row ${rowIndex + 1} has invalid Purge Dt for ${employeeId}.`);
      continue;
    }

    const temuanIcuRaw = stringValue(row, headerMap.get("temuanIcuRaw"));
    const record: ParsedDisciplinaryRecord = {
      employeeId,
      employeeName: stringValue(row, headerMap.get("employeeName")),
      payGroup: stringValue(row, headerMap.get("payGroup")),
      disciplinaryType: stringValue(row, headerMap.get("disciplinaryType")),
      description: stringValue(row, headerMap.get("description")),
      reportDate: toIsoDate(reportDateValue),
      reportDateValue,
      purgeDate: purgeDateValue ? toIsoDate(purgeDateValue) : null,
      purgeDateValue,
      disciplinaryCategory: stringValue(row, headerMap.get("disciplinaryCategory")),
      temuanIcuRaw,
      isAuditFinding: normalizeAuditFinding(temuanIcuRaw),
    };
    const key = naturalKey(record);

    if (seenKeys.has(key)) {
      errors.push(`Row ${rowIndex + 1}: Duplicate SP / Disciplinary record in file for ${employeeId}.`);
      continue;
    }

    seenKeys.add(key);
    records.push(record);
  }

  return { records, errors, totalRecords };
}

async function buildPreview(
  fileName: string,
  records: ParsedDisciplinaryRecord[],
  errors: string[],
  totalRecords: number,
) {
  const parseErrors = [...errors];
  const employeeIds = Array.from(new Set(records.map((record) => record.employeeId)));
  const employees = await prisma.employee.findMany({
    where: { employeeId: { in: employeeIds } },
    select: { id: true, employeeId: true },
  });
  const employeesById = new Map(employees.map((employee) => [employee.employeeId, employee]));
  const existingRecords = await prisma.employeeDisciplinary.findMany({
    where: { employeeId: { in: employeeIds } },
    select: {
      employeeId: true,
      disciplinaryType: true,
      description: true,
      reportDate: true,
      purgeDate: true,
      disciplinaryCategory: true,
    },
  });
  const existingKeys = new Set(
    existingRecords.map((record) =>
      naturalKey({
        ...record,
        reportDate: record.reportDate ? toIsoDate(record.reportDate) : "",
        purgeDate: record.purgeDate ? toIsoDate(record.purgeDate) : null,
      }),
    ),
  );
  const payloadRecords: ParsedDisciplinaryRecord[] = [];
  let unmatchedEmployee = 0;
  let newDisciplinary = 0;
  let noChange = 0;

  for (const record of records) {
    if (!employeesById.has(record.employeeId)) {
      unmatchedEmployee += 1;
      errors.push(`EMPLOYEE_NOT_FOUND: ${record.employeeId} is not available in Employee Master.`);
      continue;
    }

    payloadRecords.push(record);

    if (existingKeys.has(naturalKey(record))) {
      noChange += 1;
    } else {
      newDisciplinary += 1;
    }
  }

  return {
    ok: errors.length === 0,
    fileName,
    totalRecords,
    valid: records.length - unmatchedEmployee,
    invalid: parseErrors.length,
    unmatchedEmployee,
    newDisciplinary,
    noChange,
    auditFindingCount: payloadRecords.filter((record) => record.isAuditFinding).length,
    errors,
    records: payloadRecords,
  };
}

export async function previewEmployeeDisciplinaryImport(
  file: File,
): Promise<EmployeeDisciplinaryPreview> {
  const emptyPreview: EmployeeDisciplinaryPreview = {
    ok: false,
    fileName: file.name,
    totalRecords: 0,
    valid: 0,
    invalid: 0,
    unmatchedEmployee: 0,
    newDisciplinary: 0,
    noChange: 0,
    auditFindingCount: 0,
    errors: [],
    records: [],
  };

  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return {
      ...emptyPreview,
      invalid: 1,
      errors: ["Only .xlsx files are supported for SP / Disciplinary import."],
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const matchedSheet = findEmployeeDisciplinarySheet(buffer);

  if (!matchedSheet) {
    return {
      ...emptyPreview,
      invalid: 1,
      errors: [
        "MISSING_REQUIRED_HEADER: No sheet with matching SP / Disciplinary headers was found. Required headers: ID and Report Dt.",
      ],
    };
  }

  const { records, errors, totalRecords } = parseRecordsFromRows(
    matchedSheet.sheet.rows,
    matchedSheet.headerMap,
    matchedSheet.rowIndex + 1,
  );
  const preview = await buildPreview(file.name, records, errors, totalRecords);

  return {
    ...preview,
    sheetName: matchedSheet.sheet.sheetName,
  };
}

export async function processEmployeeDisciplinaryImport(
  fileName: string,
  records: EmployeeDisciplinaryRecord[],
): Promise<EmployeeDisciplinaryProcessResult> {
  if (!records.length) {
    return {
      ok: false,
      totalRecords: 0,
      created: 0,
      noChange: 0,
      unmatchedEmployee: 0,
      errors: ["No valid SP / Disciplinary records to process."],
    };
  }

  return prisma.$transaction(async (tx) => {
    const employeeIds = Array.from(new Set(records.map((record) => record.employeeId)));
    const employees = await tx.employee.findMany({
      where: { employeeId: { in: employeeIds } },
      select: { id: true, employeeId: true },
    });
    const employeesById = new Map(employees.map((employee) => [employee.employeeId, employee]));
    const existingRecords = await tx.employeeDisciplinary.findMany({
      where: { employeeId: { in: employeeIds } },
      select: {
        employeeId: true,
        disciplinaryType: true,
        description: true,
        reportDate: true,
        purgeDate: true,
        disciplinaryCategory: true,
      },
    });
    const existingKeys = new Set(
      existingRecords.map((record) =>
        naturalKey({
          ...record,
          reportDate: record.reportDate ? toIsoDate(record.reportDate) : "",
          purgeDate: record.purgeDate ? toIsoDate(record.purgeDate) : null,
        }),
      ),
    );
    const errors: string[] = [];
    let unmatchedEmployee = 0;

    for (const record of records) {
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

    if (records.every((record) => existingKeys.has(naturalKey(record)))) {
      return {
        ok: true,
        status: "IMPORTED",
        totalRecords: records.length,
        created: 0,
        noChange: records.length,
        unmatchedEmployee: 0,
        errors: [],
      };
    }

    const batch = await tx.importBatch.create({
      data: {
        sourceType: "DISCIPLINARY",
        originalFileName: fileName,
        recordCount: records.length,
        status: "IMPORTED",
      },
    });
    let created = 0;
    let noChange = 0;

    for (const record of records) {
      const employee = employeesById.get(record.employeeId);

      if (!employee) {
        continue;
      }

      if (existingKeys.has(naturalKey(record))) {
        noChange += 1;
        continue;
      }

      await tx.employeeDisciplinary.create({
        data: {
          employeeDbId: employee.id,
          employeeId: record.employeeId,
          payGroup: record.payGroup,
          disciplinaryType: record.disciplinaryType,
          description: record.description,
          reportDate: parseSourceDate(record.reportDate),
          purgeDate: parseSourceDate(record.purgeDate),
          disciplinaryCategory: record.disciplinaryCategory,
          temuanIcuRaw: record.temuanIcuRaw,
          isAuditFinding: record.isAuditFinding,
          sourceBatchId: batch.id,
        },
      });
      existingKeys.add(naturalKey(record));
      created += 1;
    }

    return {
      ok: true,
      batchId: batch.id,
      status: batch.status,
      totalRecords: records.length,
      created,
      noChange,
      unmatchedEmployee: 0,
      errors: [],
    };
  });
}
