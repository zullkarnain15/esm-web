"use server";

import {
  previewEmployeeMasterImport,
  processEmployeeMasterImport,
  type EmployeeMasterPreview,
  type EmployeeMasterProcessResult,
  type EmployeeMasterRecord,
} from "@/lib/employee-master/import";

export type EmployeeMasterImportState = {
  preview?: EmployeeMasterPreview;
  result?: EmployeeMasterProcessResult;
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
