import type { ImportBatchStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { readXlsxSheets } from "@/lib/employee-master/xlsx";

export type EmployeeMasterRecord = {
  employeeId: string;
  name: string;
  birthDate: string | null;
  hireDate: string | null;
  sex: string | null;
  company: string | null;
  location: string | null;
  hireLocation: string | null;
  regional: string | null;
  department: string | null;
  businessDivision: string | null;
  jobCode: string | null;
  jobDescription: string | null;
  position: string | null;
  positionDescription: string | null;
  personGrade: string | null;
  jobGrade: string | null;
  employmentStatus: string | null;
  payGroup: string | null;
  costCentre: string | null;
};

export type EmployeeMasterChange = {
  employeeId: string;
  name: string;
  field: string;
  previousValue: string;
  newValue: string;
};

export type EmployeeMasterPreview = {
  ok: boolean;
  fileName: string;
  sheetName?: string;
  totalRecords: number;
  newEmployee: number;
  changedEmployee: number;
  noChange: number;
  invalid: number;
  errors: string[];
  sampleChanges: EmployeeMasterChange[];
  records: EmployeeMasterRecord[];
};

export type EmployeeMasterProcessResult = {
  ok: boolean;
  batchId?: number;
  status?: ImportBatchStatus;
  totalRecords: number;
  created: number;
  updated: number;
  noChange: number;
  errors: string[];
};

type HeaderKey = keyof EmployeeMasterRecord;

const requiredFields: HeaderKey[] = ["employeeId", "name", "company"];

const exactHeaderMapping: Record<HeaderKey, string> = {
  employeeId: "EMPLID",
  name: "NAME",
  birthDate: "BIRTHDATE",
  hireDate: "HIRE_DT",
  sex: "Sex",
  company: "Company",
  location: "Location Descr",
  hireLocation: "Hire Location",
  regional: "REGIONAL",
  department: "Dept Desc",
  businessDivision: "Bus. Desc.",
  jobCode: "JOB STATUS",
  jobDescription: "JobCd Desc",
  position: "Position",
  positionDescription: "Position Descr",
  personGrade: "Person Grade",
  jobGrade: "Job Grade",
  employmentStatus: "STATUS",
  payGroup: "Pay Group",
  costCentre: "Cost Centre",
};

const approvedHeaderAliases: Partial<Record<HeaderKey, string[]>> = {
  employeeId: ["Employee ID", "Employee ID / NIK"],
  name: ["Employee Name", "Nama", "Nama Karyawan"],
  birthDate: ["Birth Date", "BirthDate", "Tanggal Lahir", "Tgl Lahir"],
  hireDate: ["Hire Date", "Hire DT", "Tanggal Masuk", "Tgl Masuk"],
  sex: ["Gender", "Jenis Kelamin"],
  company: ["Perusahaan"],
  location: ["Lokasi"],
  hireLocation: ["Lokasi Hire"],
  regional: ["Region"],
  department: ["Department", "Dept", "Division", "Divisi"],
  businessDivision: ["Business Division", "Division Bisnis"],
  jobCode: ["Job Code", "JobCode", "JobCd", "Job CD"],
  jobDescription: ["Job Description", "Job Desc", "JobCd Descr"],
  position: ["Jabatan"],
  positionDescription: ["Position Description", "Position Desc", "Descr Posisi"],
  personGrade: ["PG", "Grade / PG", "Grade"],
  costCentre: ["Cost Center", "CostCentre", "CostCenter"],
};

const comparedFields: HeaderKey[] = [
  "name",
  "birthDate",
  "hireDate",
  "sex",
  "company",
  "location",
  "hireLocation",
  "regional",
  "department",
  "businessDivision",
  "jobCode",
  "jobDescription",
  "position",
  "positionDescription",
  "personGrade",
  "jobGrade",
  "employmentStatus",
  "payGroup",
  "costCentre",
];

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function aliasesFor(field: HeaderKey) {
  return [
    exactHeaderMapping[field],
    ...(approvedHeaderAliases[field] ?? []),
  ].map(normalizeHeader);
}

function emptyRecord(): EmployeeMasterRecord {
  return {
    employeeId: "",
    name: "",
    birthDate: null,
    hireDate: null,
    sex: null,
    company: null,
    location: null,
    hireLocation: null,
    regional: null,
    department: null,
    businessDivision: null,
    jobCode: null,
    jobDescription: null,
    position: null,
    positionDescription: null,
    personGrade: null,
    jobGrade: null,
    employmentStatus: null,
    payGroup: null,
    costCentre: null,
  };
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

function stringValue(row: string[], index: number | undefined) {
  if (index === undefined) {
    return null;
  }

  const value = row[index]?.trim();

  return value ? value : null;
}

function parseRecordsFromRows(rows: string[][], headerMap: Map<HeaderKey, number>, startRow: number) {
  const records: EmployeeMasterRecord[] = [];
  const errors: string[] = [];
  const seenEmployeeIds = new Set<string>();

  for (let rowIndex = startRow; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];

    if (!row.some((cell) => cell?.trim())) {
      continue;
    }

    const record = emptyRecord();

    for (const field of Object.keys(exactHeaderMapping) as HeaderKey[]) {
      const value = stringValue(row, headerMap.get(field));

      if (value !== null) {
        record[field] = value;
      }
    }

    if (!record.employeeId) {
      errors.push(`Row ${rowIndex + 1}: Employee ID / EMPLID is required.`);
      continue;
    }

    if (!record.name) {
      errors.push(`Row ${rowIndex + 1}: Employee Name is required for ${record.employeeId}.`);
      continue;
    }

    if (!record.company) {
      errors.push(`Row ${rowIndex + 1}: Company is required for ${record.employeeId}.`);
      continue;
    }

    if (seenEmployeeIds.has(record.employeeId)) {
      errors.push(`Row ${rowIndex + 1}: Duplicate Employee ID ${record.employeeId} in file.`);
      continue;
    }

    seenEmployeeIds.add(record.employeeId);
    records.push(record);
  }

  return { records, errors };
}

function findEmployeeMasterSheet(buffer: Buffer) {
  const sheets = readXlsxSheets(buffer);

  for (const sheet of sheets) {
    const header = findHeaderMap(sheet.rows);

    if (header) {
      return { sheet, ...header };
    }
  }

  return undefined;
}

function valueForCompare(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value === null || value === undefined ? "" : String(value).trim();
}

function sourceValueForCompare(record: EmployeeMasterRecord, field: HeaderKey) {
  if (field === "birthDate" || field === "hireDate") {
    return valueForCompare(parseSourceDate(record[field]));
  }

  return valueForCompare(record[field]);
}

function getExistingValue(
  employee: {
    name: string;
    birthDate: Date | null;
    hireDate: Date | null;
    sex: string | null;
    currentEmployment: Partial<Record<HeaderKey, string | null>> | null;
  },
  field: HeaderKey,
) {
  if (field === "name" || field === "birthDate" || field === "hireDate" || field === "sex") {
    return valueForCompare(employee[field]);
  }

  return valueForCompare(employee.currentEmployment?.[field]);
}

async function buildPreview(fileName: string, records: EmployeeMasterRecord[], errors: string[]) {
  const employeeIds = records.map((record) => record.employeeId);
  const existingEmployees = await prisma.employee.findMany({
    where: { employeeId: { in: employeeIds } },
    include: { currentEmployment: true },
  });
  const existingById = new Map(
    existingEmployees.map((employee) => [employee.employeeId, employee]),
  );

  let newEmployee = 0;
  let changedEmployee = 0;
  let noChange = 0;
  const sampleChanges: EmployeeMasterChange[] = [];

  for (const record of records) {
    const existing = existingById.get(record.employeeId);

    if (!existing) {
      newEmployee += 1;
      continue;
    }

    const changes = comparedFields
      .map((field) => ({
        employeeId: record.employeeId,
        name: record.name,
        field,
        previousValue: getExistingValue(existing, field),
        newValue: sourceValueForCompare(record, field),
      }))
      .filter((change) => change.previousValue !== change.newValue);

    if (changes.length) {
      changedEmployee += 1;
      sampleChanges.push(...changes.slice(0, 3));
    } else {
      noChange += 1;
    }
  }

  return {
    ok: errors.length === 0,
    fileName,
    totalRecords: records.length,
    newEmployee,
    changedEmployee,
    noChange,
    invalid: errors.length,
    errors,
    sampleChanges: sampleChanges.slice(0, 8),
    records,
  };
}

export async function previewEmployeeMasterImport(file: File): Promise<EmployeeMasterPreview> {
  const emptyPreview: EmployeeMasterPreview = {
    ok: false,
    fileName: file.name,
    totalRecords: 0,
    newEmployee: 0,
    changedEmployee: 0,
    noChange: 0,
    invalid: 0,
    errors: [],
    sampleChanges: [],
    records: [],
  };

  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return {
      ...emptyPreview,
      invalid: 1,
      errors: ["Only .xlsx files are supported for HRIS Employee Master import."],
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const matchedSheet = findEmployeeMasterSheet(buffer);

  if (!matchedSheet) {
    return {
      ...emptyPreview,
      invalid: 1,
      errors: [
        "No sheet with matching Employee Master headers was found. Required headers: Employee ID / NIK, Employee Name, Company.",
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

export async function processEmployeeMasterImport(
  fileName: string,
  records: EmployeeMasterRecord[],
): Promise<EmployeeMasterProcessResult> {
  if (!records.length) {
    return {
      ok: false,
      totalRecords: 0,
      created: 0,
      updated: 0,
      noChange: 0,
      errors: ["No valid records to process."],
    };
  }

  return prisma.$transaction(async (tx) => {
    const batch = await tx.importBatch.create({
      data: {
        sourceType: "HRIS_EMPLOYEE_MASTER",
        originalFileName: fileName,
        recordCount: records.length,
        status: "IMPORTED",
      },
    });
    let created = 0;
    let updated = 0;
    let noChange = 0;

    for (const record of records) {
      const existing = await tx.employee.findUnique({
        where: { employeeId: record.employeeId },
        include: { currentEmployment: true },
      });

      if (!existing) {
        const employee = await tx.employee.create({
          data: {
            employeeId: record.employeeId,
            name: record.name,
            birthDate: parseSourceDate(record.birthDate),
            hireDate: parseSourceDate(record.hireDate),
            sex: record.sex,
            activeStatus: "ACTIVE",
          },
        });

        await tx.currentEmployment.create({
          data: {
            employeeDbId: employee.id,
            employeeId: record.employeeId,
            company: record.company,
            location: record.location,
            hireLocation: record.hireLocation,
            regional: record.regional,
            department: record.department,
            businessDivision: record.businessDivision,
            jobCode: record.jobCode,
            jobDescription: record.jobDescription,
            position: record.position,
            positionDescription: record.positionDescription,
            personGrade: record.personGrade,
            jobGrade: record.jobGrade,
            employmentStatus: record.employmentStatus,
            payGroup: record.payGroup,
            costCentre: record.costCentre,
            sourceBatchId: batch.id,
          },
        });

        created += 1;
        continue;
      }

      const hasChanges = comparedFields.some(
        (field) => getExistingValue(existing, field) !== sourceValueForCompare(record, field),
      );

      if (!hasChanges) {
        noChange += 1;
        continue;
      }

      await tx.employee.update({
        where: { id: existing.id },
        data: {
          name: record.name,
          birthDate: parseSourceDate(record.birthDate),
          hireDate: parseSourceDate(record.hireDate),
          sex: record.sex,
        },
      });

      await tx.currentEmployment.upsert({
        where: { employeeDbId: existing.id },
        create: {
          employeeDbId: existing.id,
          employeeId: record.employeeId,
          company: record.company,
          location: record.location,
          hireLocation: record.hireLocation,
          regional: record.regional,
          department: record.department,
          businessDivision: record.businessDivision,
          jobCode: record.jobCode,
          jobDescription: record.jobDescription,
          position: record.position,
          positionDescription: record.positionDescription,
          personGrade: record.personGrade,
          jobGrade: record.jobGrade,
          employmentStatus: record.employmentStatus,
          payGroup: record.payGroup,
          costCentre: record.costCentre,
          sourceBatchId: batch.id,
        },
        update: {
          employeeId: record.employeeId,
          company: record.company,
          location: record.location,
          hireLocation: record.hireLocation,
          regional: record.regional,
          department: record.department,
          businessDivision: record.businessDivision,
          jobCode: record.jobCode,
          jobDescription: record.jobDescription,
          position: record.position,
          positionDescription: record.positionDescription,
          personGrade: record.personGrade,
          jobGrade: record.jobGrade,
          employmentStatus: record.employmentStatus,
          payGroup: record.payGroup,
          costCentre: record.costCentre,
          sourceBatchId: batch.id,
        },
      });

      updated += 1;
    }

    return {
      ok: true,
      batchId: batch.id,
      status: batch.status,
      totalRecords: records.length,
      created,
      updated,
      noChange,
      errors: [],
    };
  });
}
