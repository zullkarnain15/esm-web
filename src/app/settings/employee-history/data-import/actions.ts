"use server";

import {
  previewEmployeeMasterImport,
  processEmployeeMasterImport,
  type EmployeeMasterPreview,
  type EmployeeMasterProcessResult,
  type EmployeeMasterRecord,
} from "@/lib/employee-master/import";
import {
  previewEmployeeMutationImport,
  processEmployeeMutationImport,
  type EmployeeMutationPreview,
  type EmployeeMutationProcessResult,
  type EmployeeMutationRecord,
} from "@/lib/employee-mutation/import";
import {
  previewEmployeePerformanceImport,
  processEmployeePerformanceImport,
  type EmployeePerformancePreview,
  type EmployeePerformanceProcessResult,
  type EmployeePerformanceRecord,
  type PerformancePeriodSummary,
} from "@/lib/employee-performance/import";
import {
  previewEmployeeDisciplinaryImport,
  processEmployeeDisciplinaryImport,
  type EmployeeDisciplinaryPreview,
  type EmployeeDisciplinaryProcessResult,
  type EmployeeDisciplinaryRecord,
} from "@/lib/employee-disciplinary/import";

export type EmployeeMasterImportState = {
  preview?: EmployeeMasterPreview;
  result?: EmployeeMasterProcessResult;
  message?: string;
};

export type EmployeeMutationImportState = {
  preview?: EmployeeMutationPreview;
  result?: EmployeeMutationProcessResult;
  message?: string;
};

export type EmployeePerformanceImportState = {
  preview?: EmployeePerformancePreview;
  result?: EmployeePerformanceProcessResult;
  message?: string;
};

export type EmployeeDisciplinaryImportState = {
  preview?: EmployeeDisciplinaryPreview;
  result?: EmployeeDisciplinaryProcessResult;
  message?: string;
};

export async function previewEmployeeMasterAction(
  _previousState: EmployeeMasterImportState,
  formData: FormData,
): Promise<EmployeeMasterImportState> {
  const file = formData.get("employeeMasterFile");

  if (!(file instanceof File) || file.size === 0) {
    return {
      message: "Choose an .xlsx Employee Master file first.",
    };
  }

  try {
    const preview = await previewEmployeeMasterImport(file);

    return {
      preview,
      message: preview.ok
        ? "Validation complete. Review preview before processing."
        : "Validation failed.",
    };
  } catch (error) {
    return {
      message:
        error instanceof Error ? error.message : "Unable to validate Employee Master file.",
    };
  }
}

export async function processEmployeeMasterAction(
  _previousState: EmployeeMasterImportState,
  formData: FormData,
): Promise<EmployeeMasterImportState> {
  const payload = formData.get("employeeMasterPayload");

  if (typeof payload !== "string" || !payload) {
    return {
      message: "Preview the Employee Master file before processing.",
    };
  }

  try {
    const parsed = JSON.parse(payload) as {
      fileName: string;
      records: EmployeeMasterRecord[];
    };
    const result = await processEmployeeMasterImport(parsed.fileName, parsed.records);

    return {
      result,
      message: result.ok ? "Employee Master import processed." : "Employee Master import failed.",
    };
  } catch (error) {
    return {
      message:
        error instanceof Error ? error.message : "Unable to process Employee Master import.",
    };
  }
}

export async function previewEmployeeMutationAction(
  _previousState: EmployeeMutationImportState,
  formData: FormData,
): Promise<EmployeeMutationImportState> {
  const file = formData.get("employeeMutationFile");

  if (!(file instanceof File) || file.size === 0) {
    return {
      message: "Choose an .xlsx HRIS Mutation file first.",
    };
  }

  try {
    const preview = await previewEmployeeMutationImport(file);

    return {
      preview,
      message: preview.ok
        ? "Validation complete. Review preview before processing."
        : "Validation failed.",
    };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Unable to validate HRIS Mutation file.",
    };
  }
}

export async function processEmployeeMutationAction(
  _previousState: EmployeeMutationImportState,
  formData: FormData,
): Promise<EmployeeMutationImportState> {
  const payload = formData.get("employeeMutationPayload");

  if (typeof payload !== "string" || !payload) {
    return {
      message: "Preview the HRIS Mutation file before processing.",
    };
  }

  try {
    const parsed = JSON.parse(payload) as {
      fileName: string;
      records: EmployeeMutationRecord[];
    };
    const result = await processEmployeeMutationImport(parsed.fileName, parsed.records);

    return {
      result,
      message: result.ok ? "HRIS Mutation import processed." : "HRIS Mutation import failed.",
    };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Unable to process HRIS Mutation import.",
    };
  }
}

export async function previewEmployeePerformanceAction(
  _previousState: EmployeePerformanceImportState,
  formData: FormData,
): Promise<EmployeePerformanceImportState> {
  const file = formData.get("employeePerformanceFile");

  if (!(file instanceof File) || file.size === 0) {
    return {
      message: "Choose an .xlsx Performance file first.",
    };
  }

  try {
    const preview = await previewEmployeePerformanceImport(file);

    return {
      preview,
      message: preview.ok
        ? "Validation complete. Review preview before processing."
        : "Validation failed.",
    };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Unable to validate Performance file.",
    };
  }
}

export async function processEmployeePerformanceAction(
  _previousState: EmployeePerformanceImportState,
  formData: FormData,
): Promise<EmployeePerformanceImportState> {
  const payload = formData.get("employeePerformancePayload");

  if (typeof payload !== "string" || !payload) {
    return {
      message: "Preview the Performance file before processing.",
    };
  }

  try {
    const parsed = JSON.parse(payload) as {
      fileName: string;
      period: PerformancePeriodSummary;
      records: EmployeePerformanceRecord[];
    };
    const result = await processEmployeePerformanceImport(
      parsed.fileName,
      parsed.period,
      parsed.records,
    );

    return {
      result,
      message: result.ok ? "Performance import processed." : "Performance import failed.",
    };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Unable to process Performance import.",
    };
  }
}

export async function previewEmployeeDisciplinaryAction(
  _previousState: EmployeeDisciplinaryImportState,
  formData: FormData,
): Promise<EmployeeDisciplinaryImportState> {
  const file = formData.get("employeeDisciplinaryFile");

  if (!(file instanceof File) || file.size === 0) {
    return {
      message: "Choose an .xlsx SP / Disciplinary file first.",
    };
  }

  try {
    const preview = await previewEmployeeDisciplinaryImport(file);

    return {
      preview,
      message: preview.ok
        ? "Validation complete. Review preview before processing."
        : "Validation failed.",
    };
  } catch (error) {
    return {
      message:
        error instanceof Error ? error.message : "Unable to validate SP / Disciplinary file.",
    };
  }
}

export async function processEmployeeDisciplinaryAction(
  _previousState: EmployeeDisciplinaryImportState,
  formData: FormData,
): Promise<EmployeeDisciplinaryImportState> {
  const payload = formData.get("employeeDisciplinaryPayload");

  if (typeof payload !== "string" || !payload) {
    return {
      message: "Preview the SP / Disciplinary file before processing.",
    };
  }

  try {
    const parsed = JSON.parse(payload) as {
      fileName: string;
      records: EmployeeDisciplinaryRecord[];
    };
    const result = await processEmployeeDisciplinaryImport(parsed.fileName, parsed.records);

    return {
      result,
      message: result.ok
        ? "SP / Disciplinary import processed."
        : "SP / Disciplinary import failed.",
    };
  } catch (error) {
    return {
      message:
        error instanceof Error ? error.message : "Unable to process SP / Disciplinary import.",
    };
  }
}
