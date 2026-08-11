# Employee 360 Data Dictionary & Mapping Specification

This document defines the source-to-domain mapping for Employee 360 in ESM. The four source files remain independent import sources. Employee 360 is an application-level aggregation/view over those source results, not a combined upload template.

## Source Principles

- Do not rename source headers during mapping.
- ESM domain fields use clean domain naming and are not permanently tied to Excel headers.
- `SourceFieldMapping` is the mapping layer between source headers and ESM domain fields.
- Each source import should be tracked independently with import batch, source file, uploaded at, uploaded by, validation, mapping, and audit trail.
- ESM does not create business interpretation for ambiguous source codes until confirmed.
- Employee ID / EMPLID / NIK is always text/string. Trim safe whitespace only, preserve leading zeros, and never use numeric conversion, padding, or automatic number normalization.

## Source Overview

| Source | Source File | Source Sheet | Employee 360 Area | Purpose |
| --- | --- | --- | --- | --- |
| HRIS Employee Master | `ESM_HRIS_Employee_Master_Dummy_20_Employees.xlsx` | OPEN QUESTION | Overview | Current employee profile, employment, location, company, grade, status |
| HRIS Mutation | `ESM_HRIS_Mutation_Dummy_20_Employees.xlsx` | OPEN QUESTION | Career | Career, job, location, company mutation history |
| Performance | `tempalte data perfom.xlsx` | `DATA PERFROM` | Performance | Official yearly performance result from Performance Department |
| SP / Disciplinary | `template sp.xlsx` | `SP` | SP | Disciplinary records and audit finding indicator |

## Locked Business Rules

### SP / Disciplinary

- `ID` is the same identifier concept as `EMPLID` / Employee ID.
- `Disciplinary` is a source category and must be stored as-is.
- `TEMUAN_ICU` indicates that the SP record is an audit finding.
- ICU is the department name inside the Audit division.

### Performance

- One Performance file represents one year.
- `Last Performance` means the performance result from the last available month in that source year.
- ESM only reads the result provided by the Performance file.
- ESM does not recalculate `3 Bulan`, `6 Bulan`, `12 Bulan`, `Last Performance`, or qualitative performance category.
- The Performance file is treated as the official source from the Performance Department.

## HRIS Employee Master Mapping

| Source | Source Sheet | Source Header | ESM Domain Field | Required / Optional | Data Type | Historical / Current | Transformation | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| HRIS Employee Master | OPEN QUESTION | Employee ID / NIK | `identity.employeeId` | Required | string | Current | Trim whitespace only; preserve source text and leading zeros. | Confirm exact source header. Never parse as number. |
| HRIS Employee Master | OPEN QUESTION | Employee Name | `identity.employeeName` | Required | string | Current | Trim; preserve source casing unless product copy later requires formatting. | Confirm exact source header. |
| HRIS Employee Master | OPEN QUESTION | Company | `currentEmployment.company` | Required | string | Current | Trim; store source value without business interpretation. |  |
| HRIS Employee Master | OPEN QUESTION | Division | `currentEmployment.division` | Optional | string | Current | Trim; preserve source value. |  |
| HRIS Employee Master | OPEN QUESTION | Position | `currentEmployment.position` | Optional | string | Current | Trim; preserve source value. |  |
| HRIS Employee Master | OPEN QUESTION | Location | `currentEmployment.location` | Optional | string | Current | Trim; preserve source value. |  |
| HRIS Employee Master | OPEN QUESTION | Grade / PG | `currentEmployment.payGrade` | Optional | string | Current | Trim; store as string to preserve source grade notation. | Confirm exact source header. |
| HRIS Employee Master | OPEN QUESTION | Status | `currentEmployment.employmentStatus` | Optional | string | Current | Trim; preserve source status. |  |

## HRIS Mutation Mapping

| Source | Source Sheet | Source Header | ESM Domain Field | Required / Optional | Data Type | Historical / Current | Transformation | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| HRIS Mutation | OPEN QUESTION | Employee ID / NIK | `employeeId` | Required | string | Historical | Trim whitespace only; preserve source text and leading zeros. | Confirm exact source header. Never parse as number. |
| HRIS Mutation | OPEN QUESTION | Effective Date | `effectiveDate` | Required | date | Historical | Parse as date; preserve source date in import audit if parsing fails. | Confirm exact source header. |
| HRIS Mutation | OPEN QUESTION | Mutation Type | `mutationType` | Optional | string | Historical | Trim; do not infer business meaning beyond source value. | Mutation vocabulary is not locked yet. |
| HRIS Mutation | OPEN QUESTION | Previous Company | `previousCompany` | Optional | string | Historical | Trim; preserve source value. | Confirm whether source has previous/new company columns. |
| HRIS Mutation | OPEN QUESTION | New Company | `newCompany` | Optional | string | Historical | Trim; preserve source value. | Confirm whether source has previous/new company columns. |
| HRIS Mutation | OPEN QUESTION | Previous Position | `previousPosition` | Optional | string | Historical | Trim; preserve source value. | Confirm whether source has previous/new position columns. |
| HRIS Mutation | OPEN QUESTION | New Position | `newPosition` | Optional | string | Historical | Trim; preserve source value. | Confirm whether source has previous/new position columns. |
| HRIS Mutation | OPEN QUESTION | Location | `newLocation` | Optional | string | Historical | Trim; preserve source value. | OPEN QUESTION: confirm whether source separates previous/new location. |

## Performance Mapping

| Source | Source Sheet | Source Header | ESM Domain Field | Required / Optional | Data Type | Historical / Current | Transformation | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Performance | DATA PERFROM | EMPLID | `employeeId` | Required | string | Historical | Trim whitespace only; preserve source text and leading zeros. | Never parse as number. |
| Performance | DATA PERFROM | NAME | `employeeName` | Optional | string | Historical | Trim; preserve source value. |  |
| Performance | DATA PERFROM | HIRE_DT | `hireDate` | Optional | date | Historical | Parse as date for display/filtering. |  |
| Performance | DATA PERFROM | STATUS | `employmentStatus` | Optional | string | Historical | Trim; preserve source value. |  |
| Performance | DATA PERFROM | Location Descr | `locationDescription` | Optional | string | Historical | Trim; preserve source value. |  |
| Performance | DATA PERFROM | Main Branch | `mainBranch` | Optional | string | Historical | Trim; preserve source value. |  |
| Performance | DATA PERFROM | REGIONAL | `regional` | Optional | string | Historical | Trim; preserve source value. |  |
| Performance | DATA PERFROM | JobCd Desc | `jobDescription` | Optional | string | Historical | Trim; preserve source value. |  |
| Performance | DATA PERFROM | COMPANY | `company` | Optional | string | Historical | Trim; preserve source value. |  |
| Performance | DATA PERFROM | performance bulanan | `monthlyPerformanceLabel` | Optional | string | Historical | Read monthly performance value from source as-is; ESM does not recalculate. | OPEN QUESTION: confirm exact month header format in the yearly Performance file. |
| Performance | DATA PERFROM | Perf 2025 | `performance2025` | Optional | string | Historical | Read source result as-is; ESM does not recalculate. | Year-specific field; future mapping may parameterize year. |
| Performance | DATA PERFROM | 3 Bulan | `threeMonthPerformance` | Optional | string | Historical | Read source result as-is; ESM does not recalculate. | Official Performance Department result. |
| Performance | DATA PERFROM | 6 Bulan | `sixMonthPerformance` | Optional | string | Historical | Read source result as-is; ESM does not recalculate. | Official Performance Department result. |
| Performance | DATA PERFROM | 12 Bulan | `twelveMonthPerformance` | Optional | string | Historical | Read source result as-is; ESM does not recalculate. | Official Performance Department result. |
| Performance | DATA PERFROM | Last Performance | `lastPerformance` | Optional | string | Historical | Read as last available month result in source year; ESM does not recalculate. | Locked rule: last available month in that year's file. |
| Performance | DATA PERFROM | kategori performance kualitatif | `qualitativeCategory` | Optional | string | Historical | Read source category as-is; ESM does not recalculate or reinterpret thresholds. | OPEN QUESTION: confirm exact source header for qualitative performance category. |

## SP / Disciplinary Mapping

| Source | Source Sheet | Source Header | ESM Domain Field | Required / Optional | Data Type | Historical / Current | Transformation | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SP / Disciplinary | SP | Pay Group | `payGroup` | Optional | string | Historical | Trim; preserve source value. |  |
| SP / Disciplinary | SP | ID | `employeeId` | Required | string | Historical | Trim whitespace only; preserve source text and leading zeros. | Locked business rule: ID is EMPLID / Employee ID. Never parse as number. |
| SP / Disciplinary | SP | Name | `employeeName` | Optional | string | Historical | Trim; preserve source value. |  |
| SP / Disciplinary | SP | Discp Type | `disciplineType` | Optional | string | Historical | Trim; preserve source value. | Do not infer meaning of code until confirmed. |
| SP / Disciplinary | SP | Descr | `description` | Optional | string | Historical | Trim; preserve source value. |  |
| SP / Disciplinary | SP | Report Dt | `reportDate` | Optional | date | Historical | Parse as date for display/filtering. |  |
| SP / Disciplinary | SP | Purge Dt | `purgeDate` | Optional | date | Historical | Parse as date for display/filtering. |  |
| SP / Disciplinary | SP | Disciplinary | `disciplinary` | Optional | string | Historical | Store source category as-is. | Locked business rule: no interpretation in ESM import layer. |
| SP / Disciplinary | SP | TEMUAN_ICU | `temuanIcuRaw` | Optional | string | Historical | Store raw source value as-is. | Raw source must not be lost. |
| SP / Disciplinary | SP | TEMUAN_ICU | `isAuditFinding` | Optional | boolean | Historical | Derived indicator from TEMUAN_ICU according to the locked source rule. | Locked business rule: TEMUAN_ICU indicates audit finding; ICU is department in Audit division. |

## TypeScript Reference

The reusable mapping layer is represented in `src/data/employee-history.ts`:

- `DataSourceMetadata`
- `SourceFieldMapping`
- `EmployeeProfile`
- `EmployeeMutationRecord`
- `EmployeePerformanceRecord`
- `EmployeeDisciplinaryRecord`
- `Employee360View`

## Open Questions

- HRIS Employee Master exact sheet name is not confirmed.
- HRIS Employee Master exact source headers for Employee ID / NIK, Employee Name, Grade / PG, birth date, photo, and KYE-related current fields are not confirmed.
- HRIS Mutation exact sheet name and exact source headers are not confirmed.
- HRIS Mutation needs confirmation on whether previous/new company, position, and location are separate source columns.
- HRIS Mutation mutation type vocabulary is not confirmed.
- Performance monthly columns need exact header format confirmation.
- Performance qualitative category exact source header needs confirmation.
