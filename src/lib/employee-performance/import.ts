import type { ImportBatchStatus } from "@/generated/prisma/enums";
import { readXlsxSheets } from "@/lib/employee-master/xlsx";
import { prisma } from "@/lib/prisma";

export type MonthlyPerformanceValue = {
  sequence: number;
  sourceHeader: string;
  value: string | null;
};

export type EmployeePerformanceRecord = {
  employeeId: string;
  employeeName: string | null;
  hireDate: string | null;
  status: string | null;
  locationDescription: string | null;
  mainBranch: string | null;
  regional: string | null;
  jobDescription: string | null;
  company: string | null;
  monthlyValues: MonthlyPerformanceValue[];
  annualPerformance: string | null;
  performance3Months: string | null;
  performance6Months: string | null;
  performance12Months: string | null;
  lastPerformance: string | null;
};

export type PerformancePeriodSummary = {
  periodLabel: string;
  year: number;
  windowStartHeader: string;
  windowEndHeader: string;
  monthlyHeaders: string[];
  annualHeader: string;
};

export type EmployeePerformancePreview = {
  ok: boolean;
  fileName: string;
  sheetName?: string;
  totalRecords: number;
  valid: number;
  invalid: number;
  unmatchedEmployee: number;
  newPerformance: number;
  noChange: number;
  changedPerformance: number;
  errors: string[];
  period?: PerformancePeriodSummary;
  records: EmployeePerformanceRecord[];
};

export type EmployeePerformanceProcessResult = {
  ok: boolean;
  batchId?: number;
  performancePeriodId?: number;
  status?: ImportBatchStatus;
  totalRecords: number;
  created: number;
  noChange: number;
  unmatchedEmployee: number;
  errors: string[];
};

type FixedHeaderKey =
  | "employeeId"
  | "employeeName"
  | "hireDate"
  | "status"
  | "locationDescription"
  | "mainBranch"
  | "regional"
  | "jobDescription"
  | "company"
  | "performance3Months"
  | "performance6Months"
  | "performance12Months"
  | "lastPerformance";

type HeaderMap = Map<
  FixedHeaderKey
  | "annualPerformance"
  | "performance3MonthsCategory"
  | "performance6MonthsCategory"
  | "performance12MonthsCategory",
  number
>;

const exactHeaderMapping: Record<FixedHeaderKey, string> = {
  employeeId: "EMPLID",
  employeeName: "NAME",
  hireDate: "HIRE_DT",
  status: "STATUS",
  locationDescription: "Location Descr",
  mainBranch: "Main Branch",
  regional: "REGIONAL",
  jobDescription: "JobCd Desc",
  company: "COMPANY",
  performance3Months: "3 Bulan",
  performance6Months: "6 Bulan",
  performance12Months: "12 Bulan",
  lastPerformance: "Last Performance",
};

const requiredFields: FixedHeaderKey[] = [
  "employeeId",
  "employeeName",
  "hireDate",
  "status",
  "locationDescription",
  "mainBranch",
  "regional",
  "jobDescription",
  "company",
  "performance3Months",
  "performance6Months",
  "performance12Months",
  "lastPerformance",
];

const monthIndexes: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

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

function parseMonthHeader(header: string) {
  const match = header.trim().match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{2})$/);

  if (!match) {
    return undefined;
  }

  const month = monthIndexes[match[1]];
  const year = 2000 + Number(match[2]);

  return { month, year };
}

function monthSerial(header: string) {
  const parsed = parseMonthHeader(header);

  return parsed ? parsed.year * 12 + parsed.month : undefined;
}

function derivePeriodSummary(monthlyHeaders: string[], annualHeader: string): PerformancePeriodSummary | undefined {
  if (monthlyHeaders.length !== 12) {
    return undefined;
  }

  const serials = monthlyHeaders.map(monthSerial);

  if (serials.some((serial) => serial === undefined)) {
    return undefined;
  }

  for (let index = 1; index < serials.length; index += 1) {
    if (serials[index] !== serials[index - 1]! + 1) {
      return undefined;
    }
  }

  const end = parseMonthHeader(monthlyHeaders[11]);

  if (!end) {
    return undefined;
  }

  return {
    periodLabel: `${monthlyHeaders[0]} -> ${monthlyHeaders[11]}`,
    year: end.year,
    windowStartHeader: monthlyHeaders[0],
    windowEndHeader: monthlyHeaders[11],
    monthlyHeaders,
    annualHeader,
  };
}

function findHeaderMap(rows: string[][]) {
  const candidates = rows.slice(0, 12);

  for (let rowIndex = 0; rowIndex < candidates.length; rowIndex += 1) {
    const headers = candidates[rowIndex].map((header) => header.trim());
    const normalizedHeaders = headers.map(normalizeHeader);
    const headerMap: HeaderMap = new Map();
    const ambiguousFields: string[] = [];

    for (const field of Object.keys(exactHeaderMapping) as FixedHeaderKey[]) {
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

    const annualIndexes = headers
      .map((header, index) => (/^Perf \d{4}$/.test(header) ? index : -1))
      .filter((index) => index >= 0);
    const performance3MonthsCategoryIndexes = headers
      .map((header, index) => (/^3 Bulan\d+$/.test(header) ? index : -1))
      .filter((index) => index >= 0);
    const performance6MonthsCategoryIndexes = headers
      .map((header, index) => (/^6 Bulan\d+$/.test(header) ? index : -1))
      .filter((index) => index >= 0);
    const performance12MonthsCategoryIndexes = headers
      .map((header, index) => (/^12 Bulan\d+$/.test(header) ? index : -1))
      .filter((index) => index >= 0);
    const monthIndexesInSheet = headers
      .map((header, index) => (parseMonthHeader(header) ? index : -1))
      .filter((index) => index >= 0);

    if (annualIndexes.length === 1) {
      headerMap.set("annualPerformance", annualIndexes[0]);
    }

    if (performance3MonthsCategoryIndexes.length === 1) {
      headerMap.set("performance3MonthsCategory", performance3MonthsCategoryIndexes[0]);
    }

    if (performance6MonthsCategoryIndexes.length === 1) {
      headerMap.set("performance6MonthsCategory", performance6MonthsCategoryIndexes[0]);
    }

    if (performance12MonthsCategoryIndexes.length === 1) {
      headerMap.set("performance12MonthsCategory", performance12MonthsCategoryIndexes[0]);
    }

    const monthlyHeaders = monthIndexesInSheet.map((index) => headers[index]);
    const annualHeader = annualIndexes.length === 1 ? headers[annualIndexes[0]] : "";
    const period = derivePeriodSummary(monthlyHeaders, annualHeader);

    if (
      !ambiguousFields.length &&
      annualIndexes.length === 1 &&
      performance3MonthsCategoryIndexes.length === 1 &&
      performance6MonthsCategoryIndexes.length === 1 &&
      performance12MonthsCategoryIndexes.length === 1 &&
      period &&
      requiredFields.every((field) => headerMap.has(field))
    ) {
      return { rowIndex, headerMap, monthIndexes: monthIndexesInSheet, period };
    }
  }

  return undefined;
}

function findEmployeePerformanceSheet(buffer: Buffer) {
  const sheets = readXlsxSheets(buffer);

  for (const sheet of sheets) {
    const header = findHeaderMap(sheet.rows);

    if (header) {
      return { sheet, ...header };
    }
  }

  return undefined;
}

function parseRecordsFromRows(
  rows: string[][],
  headerMap: HeaderMap,
  monthColumnIndexes: number[],
  period: PerformancePeriodSummary,
  startRow: number,
) {
  const records: EmployeePerformanceRecord[] = [];
  const errors: string[] = [];
  const seenEmployeeIds = new Set<string>();

  for (let rowIndex = startRow; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];

    if (!row.some((cell) => cell?.trim())) {
      continue;
    }

    const employeeId = stringValue(row, headerMap.get("employeeId")) ?? "";

    if (!employeeId) {
      errors.push(`Row ${rowIndex + 1}: EMPLID is required.`);
      continue;
    }

    if (seenEmployeeIds.has(employeeId)) {
      errors.push(`Row ${rowIndex + 1}: Duplicate EMPLID ${employeeId} in file.`);
      continue;
    }

    seenEmployeeIds.add(employeeId);

    const monthlyValues = monthColumnIndexes.map((columnIndex, index) => ({
      sequence: index + 1,
      sourceHeader: period.monthlyHeaders[index],
      value: stringValue(row, columnIndex),
    }));

    if (monthlyValues.length !== 12) {
      errors.push(`Row ${rowIndex + 1}: Expected 12 monthly values for ${employeeId}.`);
      continue;
    }

    records.push({
      employeeId,
      employeeName: stringValue(row, headerMap.get("employeeName")),
      hireDate: stringValue(row, headerMap.get("hireDate")),
      status: stringValue(row, headerMap.get("status")),
      locationDescription: stringValue(row, headerMap.get("locationDescription")),
      mainBranch: stringValue(row, headerMap.get("mainBranch")),
      regional: stringValue(row, headerMap.get("regional")),
      jobDescription: stringValue(row, headerMap.get("jobDescription")),
      company: stringValue(row, headerMap.get("company")),
      monthlyValues,
      annualPerformance: stringValue(row, headerMap.get("annualPerformance")),
      performance3Months: stringValue(row, headerMap.get("performance3MonthsCategory")),
      performance6Months: stringValue(row, headerMap.get("performance6MonthsCategory")),
      performance12Months: stringValue(row, headerMap.get("performance12MonthsCategory")),
      lastPerformance: stringValue(row, headerMap.get("lastPerformance")),
    });
  }

  return { records, errors };
}

function normalizeMonthlyValues(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return undefined;
      }

      const entry = item as Partial<MonthlyPerformanceValue>;

      if (typeof entry.sequence !== "number" || typeof entry.sourceHeader !== "string") {
        return undefined;
      }

      return {
        sequence: entry.sequence,
        sourceHeader: entry.sourceHeader,
        value: entry.value === null || entry.value === undefined ? null : String(entry.value),
      };
    })
    .filter((item): item is MonthlyPerformanceValue => Boolean(item))
    .sort((left, right) => left.sequence - right.sequence);
}

function recordSignature(record: EmployeePerformanceRecord) {
  return JSON.stringify({
    monthlyValues: normalizeMonthlyValues(record.monthlyValues),
    annualPerformance: record.annualPerformance,
    performance3Months: record.performance3Months,
    performance6Months: record.performance6Months,
    performance12Months: record.performance12Months,
    lastPerformance: record.lastPerformance,
  });
}

function existingSignature(record: {
  monthlyValues: unknown;
  lastPerformance: string | null;
  performance3Months: string | null;
  performance6Months: string | null;
  performance12Months: string | null;
  qualitativeCategory: string | null;
}) {
  return JSON.stringify({
    monthlyValues: normalizeMonthlyValues(record.monthlyValues),
    annualPerformance: record.qualitativeCategory,
    performance3Months: record.performance3Months,
    performance6Months: record.performance6Months,
    performance12Months: record.performance12Months,
    lastPerformance: record.lastPerformance,
  });
}

async function buildPreview(
  fileName: string,
  period: PerformancePeriodSummary,
  records: EmployeePerformanceRecord[],
  errors: string[],
) {
  const employeeIds = records.map((record) => record.employeeId);
  const employees = await prisma.employee.findMany({
    where: { employeeId: { in: employeeIds } },
    select: { id: true, employeeId: true },
  });
  const employeesById = new Map(employees.map((employee) => [employee.employeeId, employee]));
  const existingPeriod = await prisma.performancePeriod.findFirst({
    where: {
      periodLabel: period.periodLabel,
      year: period.year,
    },
    include: {
      employeePerformances: true,
    },
  });
  const existingByEmployeeId = new Map(
    existingPeriod?.employeePerformances.map((record) => [record.employeeId, record]) ?? [],
  );
  let unmatchedEmployee = 0;
  let newPerformance = 0;
  let noChange = 0;
  let changedPerformance = 0;
  const payloadRecords: EmployeePerformanceRecord[] = [];

  for (const record of records) {
    if (!employeesById.has(record.employeeId)) {
      unmatchedEmployee += 1;
      errors.push(`EMPLOYEE_NOT_FOUND: ${record.employeeId} is not available in Employee Master.`);
      continue;
    }

    payloadRecords.push(record);

    const existing = existingByEmployeeId.get(record.employeeId);

    if (!existing) {
      newPerformance += 1;
      continue;
    }

    if (existingSignature(existing) === recordSignature(record)) {
      noChange += 1;
    } else {
      changedPerformance += 1;
      errors.push(
        `PERFORMANCE_PERIOD_CHANGE_REQUIRES_DECISION: ${record.employeeId} already has data for ${period.periodLabel}.`,
      );
    }
  }

  return {
    ok: errors.length === 0,
    fileName,
    totalRecords: records.length,
    valid: records.length - unmatchedEmployee,
    invalid: errors.filter((error) => !error.startsWith("EMPLOYEE_NOT_FOUND")).length,
    unmatchedEmployee,
    newPerformance,
    noChange,
    changedPerformance,
    errors,
    period,
    records: payloadRecords,
  };
}

export async function previewEmployeePerformanceImport(file: File): Promise<EmployeePerformancePreview> {
  const emptyPreview: EmployeePerformancePreview = {
    ok: false,
    fileName: file.name,
    totalRecords: 0,
    valid: 0,
    invalid: 0,
    unmatchedEmployee: 0,
    newPerformance: 0,
    noChange: 0,
    changedPerformance: 0,
    errors: [],
    records: [],
  };

  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return {
      ...emptyPreview,
      invalid: 1,
      errors: ["Only .xlsx files are supported for Performance import."],
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const matchedSheet = findEmployeePerformanceSheet(buffer);

  if (!matchedSheet) {
    return {
      ...emptyPreview,
      invalid: 1,
      errors: [
        "No sheet with matching Performance headers was found. Required: 12 consecutive MMM-YY headers, one Perf YYYY header, and category headers for 3/6/12 months.",
      ],
    };
  }

  const { records, errors } = parseRecordsFromRows(
    matchedSheet.sheet.rows,
    matchedSheet.headerMap,
    matchedSheet.monthIndexes,
    matchedSheet.period,
    matchedSheet.rowIndex + 1,
  );
  const preview = await buildPreview(file.name, matchedSheet.period, records, errors);

  return {
    ...preview,
    sheetName: matchedSheet.sheet.sheetName,
  };
}

export async function processEmployeePerformanceImport(
  fileName: string,
  period: PerformancePeriodSummary,
  records: EmployeePerformanceRecord[],
): Promise<EmployeePerformanceProcessResult> {
  if (!records.length) {
    return {
      ok: false,
      totalRecords: 0,
      created: 0,
      noChange: 0,
      unmatchedEmployee: 0,
      errors: ["No valid Performance records to process."],
    };
  }

  return prisma.$transaction(async (tx) => {
    const employeeIds = records.map((record) => record.employeeId);
    const employees = await tx.employee.findMany({
      where: { employeeId: { in: employeeIds } },
      select: { id: true, employeeId: true },
    });
    const employeesById = new Map(employees.map((employee) => [employee.employeeId, employee]));
    const existingPeriod = await tx.performancePeriod.findFirst({
      where: {
        periodLabel: period.periodLabel,
        year: period.year,
      },
      include: { employeePerformances: true },
    });
    const existingByEmployeeId = new Map(
      existingPeriod?.employeePerformances.map((record) => [record.employeeId, record]) ?? [],
    );
    const errors: string[] = [];
    let unmatchedEmployee = 0;
    let created = 0;
    let noChange = 0;

    for (const record of records) {
      if (!employeesById.has(record.employeeId)) {
        unmatchedEmployee += 1;
        errors.push(`EMPLOYEE_NOT_FOUND: ${record.employeeId} is not available in Employee Master.`);
        continue;
      }

      const existing = existingByEmployeeId.get(record.employeeId);

      if (existing && existingSignature(existing) !== recordSignature(record)) {
        errors.push(
          `PERFORMANCE_PERIOD_CHANGE_REQUIRES_DECISION: ${record.employeeId} already has data for ${period.periodLabel}.`,
        );
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

    if (existingPeriod && records.every((record) => existingByEmployeeId.has(record.employeeId))) {
      return {
        ok: true,
        performancePeriodId: existingPeriod.id,
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
        sourceType: "PERFORMANCE",
        originalFileName: fileName,
        sourcePeriod: period.periodLabel,
        recordCount: records.length,
        status: "IMPORTED",
      },
    });
    const performancePeriod =
      existingPeriod ??
      (await tx.performancePeriod.create({
        data: {
          periodLabel: period.periodLabel,
          year: period.year,
          sourceBatchId: batch.id,
        },
      }));

    for (const record of records) {
      const employee = employeesById.get(record.employeeId);

      if (!employee) {
        continue;
      }

      if (existingByEmployeeId.has(record.employeeId)) {
        noChange += 1;
        continue;
      }

      await tx.employeePerformance.create({
        data: {
          employeeDbId: employee.id,
          employeeId: record.employeeId,
          performancePeriodId: performancePeriod.id,
          monthlyValues: record.monthlyValues,
          lastPerformance: record.lastPerformance,
          performance3Months: record.performance3Months,
          performance6Months: record.performance6Months,
          performance12Months: record.performance12Months,
          qualitativeCategory: record.annualPerformance,
          sourceBatchId: batch.id,
        },
      });
      created += 1;
    }

    return {
      ok: true,
      batchId: batch.id,
      performancePeriodId: performancePeriod.id,
      status: batch.status,
      totalRecords: records.length,
      created,
      noChange,
      unmatchedEmployee: 0,
      errors: [],
    };
  });
}
