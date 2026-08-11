"use client";

import { FileSpreadsheet, Play, UploadCloud } from "lucide-react";
import { useActionState } from "react";
import {
  previewEmployeeMutationAction,
  processEmployeeMutationAction,
  type EmployeeMutationImportState,
} from "@/app/settings/employee-history/data-import/actions";

const initialState: EmployeeMutationImportState = {};

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="esm-import-summary-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function EmployeeMutationImportCard() {
  const [previewState, previewAction, isPreviewPending] = useActionState(
    previewEmployeeMutationAction,
    initialState,
  );
  const [processState, processAction, isProcessPending] = useActionState(
    processEmployeeMutationAction,
    initialState,
  );
  const preview = previewState.preview;
  const result = processState.result;
  const payload = preview
    ? JSON.stringify({
        fileName: preview.fileName,
        records: preview.records,
      })
    : "";

  return (
    <article className="esm-card esm-import-card" id="hris-mutation-import">
      <div className="esm-card-header">
        <div>
          <p>HRIS Mutation</p>
          <h3>Import Career History</h3>
          <small>
            Upload, validate, preview, then process official job, location, and
            company history.
          </small>
        </div>
        <span>V1</span>
      </div>

      <form action={previewAction} className="esm-import-upload">
        <label>
          <FileSpreadsheet size={18} />
          <input accept=".xlsx" name="employeeMutationFile" type="file" />
        </label>
        <button disabled={isPreviewPending} type="submit">
          <UploadCloud size={17} />
          {isPreviewPending ? "Validating..." : "Validate File"}
        </button>
      </form>

      {previewState.message ? (
        <div className={`esm-import-message${preview?.ok ? " is-success" : ""}`}>
          {previewState.message}
        </div>
      ) : null}

      {preview ? (
        <div className="esm-import-preview">
          <div className="esm-import-preview-title">
            <div>
              <span>{preview.fileName}</span>
              <strong>{preview.sheetName ?? "No matching sheet"}</strong>
            </div>
            <span className={`esm-soft-badge ${preview.ok ? "success" : "warning"}`}>
              {preview.ok ? "Ready to Process" : "Rejected"}
            </span>
          </div>

          <div className="esm-import-summary-grid">
            <SummaryTile label="Total Records" value={preview.totalRecords} />
            <SummaryTile label="Valid" value={preview.valid} />
            <SummaryTile label="New Mutation" value={preview.newMutation} />
            <SummaryTile label="No Change" value={preview.noChange} />
            <SummaryTile label="Unmatched" value={preview.unmatchedEmployee} />
            <SummaryTile label="Invalid" value={preview.invalid} />
          </div>

          {preview.sampleChanges.length ? (
            <div className="esm-import-change-list">
              <span>Sample Derived Changes</span>
              {preview.sampleChanges.map((change) => (
                <div
                  key={`${change.employeeId}-${change.effectiveDate}-${change.field}-${change.newValue}`}
                >
                  <strong>{change.employeeId}</strong>
                  <span>
                    {change.effectiveDate} / {change.field}:{" "}
                    {change.previousValue || "-"} &rarr; {change.newValue || "-"}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {preview.errors.length ? (
            <div className="esm-import-error-list">
              <span>Validation Errors</span>
              {preview.errors.slice(0, 6).map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          ) : null}

          <form action={processAction}>
            <input name="employeeMutationPayload" type="hidden" value={payload} />
            <button
              className="esm-import-process"
              disabled={!preview.ok || isProcessPending}
              type="submit"
            >
              <Play size={16} />
              {isProcessPending ? "Processing..." : "Process Import"}
            </button>
          </form>
        </div>
      ) : null}

      {processState.message ? (
        <div className={`esm-import-message${result?.ok ? " is-success" : ""}`}>
          {processState.message}
        </div>
      ) : null}

      {result ? (
        <div className="esm-import-result">
          <SummaryTile label="Created" value={result.created} />
          <SummaryTile label="No Change" value={result.noChange} />
          <SummaryTile label="Unmatched" value={result.unmatchedEmployee} />
          <SummaryTile label="Batch ID" value={result.batchId ?? 0} />
        </div>
      ) : null}
    </article>
  );
}
