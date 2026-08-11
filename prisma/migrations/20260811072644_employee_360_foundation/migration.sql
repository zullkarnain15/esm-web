-- CreateEnum
CREATE TYPE "EmployeeActiveStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ImportSourceType" AS ENUM ('HRIS_EMPLOYEE_MASTER', 'HRIS_MUTATION', 'PERFORMANCE', 'DISCIPLINARY', 'API', 'ESM_NATIVE');

-- CreateEnum
CREATE TYPE "ImportBatchStatus" AS ENUM ('DRAFT', 'VALIDATED', 'IMPORTED', 'FAILED');

-- CreateTable
CREATE TABLE "Employee" (
    "id" SERIAL NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "hireDate" TIMESTAMP(3),
    "sex" TEXT,
    "activeStatus" "EmployeeActiveStatus" NOT NULL DEFAULT 'UNKNOWN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurrentEmployment" (
    "id" SERIAL NOT NULL,
    "employeeDbId" INTEGER NOT NULL,
    "employeeId" TEXT NOT NULL,
    "company" TEXT,
    "location" TEXT,
    "hireLocation" TEXT,
    "regional" TEXT,
    "department" TEXT,
    "businessDivision" TEXT,
    "jobCode" TEXT,
    "jobDescription" TEXT,
    "position" TEXT,
    "positionDescription" TEXT,
    "personGrade" TEXT,
    "jobGrade" TEXT,
    "employmentStatus" TEXT,
    "payGroup" TEXT,
    "costCentre" TEXT,
    "sourceBatchId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurrentEmployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeMutation" (
    "id" SERIAL NOT NULL,
    "employeeDbId" INTEGER NOT NULL,
    "employeeId" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "jobCode" TEXT,
    "jobDescription" TEXT,
    "location" TEXT,
    "company" TEXT,
    "previousSnapshot" JSONB,
    "newSnapshot" JSONB,
    "sourceBatchId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeMutation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformancePeriod" (
    "id" SERIAL NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "year" INTEGER,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "sourceBatchId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformancePeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeePerformance" (
    "id" SERIAL NOT NULL,
    "employeeDbId" INTEGER NOT NULL,
    "employeeId" TEXT NOT NULL,
    "performancePeriodId" INTEGER NOT NULL,
    "lastPerformance" TEXT,
    "performance3Months" TEXT,
    "performance6Months" TEXT,
    "performance12Months" TEXT,
    "qualitativeCategory" TEXT,
    "monthlyValues" JSONB,
    "sourceBatchId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeePerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeDisciplinary" (
    "id" SERIAL NOT NULL,
    "employeeDbId" INTEGER NOT NULL,
    "employeeId" TEXT NOT NULL,
    "payGroup" TEXT,
    "disciplinaryType" TEXT,
    "description" TEXT,
    "reportDate" TIMESTAMP(3),
    "purgeDate" TIMESTAMP(3),
    "disciplinaryCategory" TEXT,
    "temuanIcuRaw" TEXT,
    "isAuditFinding" BOOLEAN NOT NULL DEFAULT false,
    "sourceBatchId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeDisciplinary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" SERIAL NOT NULL,
    "sourceType" "ImportSourceType" NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "sourcePeriod" TEXT,
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "status" "ImportBatchStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeId_key" ON "Employee"("employeeId");

-- CreateIndex
CREATE INDEX "Employee_name_idx" ON "Employee"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CurrentEmployment_employeeDbId_key" ON "CurrentEmployment"("employeeDbId");

-- CreateIndex
CREATE UNIQUE INDEX "CurrentEmployment_employeeId_key" ON "CurrentEmployment"("employeeId");

-- CreateIndex
CREATE INDEX "CurrentEmployment_employeeId_idx" ON "CurrentEmployment"("employeeId");

-- CreateIndex
CREATE INDEX "CurrentEmployment_company_idx" ON "CurrentEmployment"("company");

-- CreateIndex
CREATE INDEX "CurrentEmployment_location_idx" ON "CurrentEmployment"("location");

-- CreateIndex
CREATE INDEX "CurrentEmployment_sourceBatchId_idx" ON "CurrentEmployment"("sourceBatchId");

-- CreateIndex
CREATE INDEX "EmployeeMutation_employeeId_idx" ON "EmployeeMutation"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeMutation_employeeDbId_effectiveDate_idx" ON "EmployeeMutation"("employeeDbId", "effectiveDate");

-- CreateIndex
CREATE INDEX "EmployeeMutation_effectiveDate_idx" ON "EmployeeMutation"("effectiveDate");

-- CreateIndex
CREATE INDEX "EmployeeMutation_sourceBatchId_idx" ON "EmployeeMutation"("sourceBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "PerformancePeriod_sourceBatchId_key" ON "PerformancePeriod"("sourceBatchId");

-- CreateIndex
CREATE INDEX "PerformancePeriod_year_idx" ON "PerformancePeriod"("year");

-- CreateIndex
CREATE INDEX "EmployeePerformance_employeeId_idx" ON "EmployeePerformance"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeePerformance_employeeDbId_idx" ON "EmployeePerformance"("employeeDbId");

-- CreateIndex
CREATE INDEX "EmployeePerformance_performancePeriodId_idx" ON "EmployeePerformance"("performancePeriodId");

-- CreateIndex
CREATE INDEX "EmployeePerformance_sourceBatchId_idx" ON "EmployeePerformance"("sourceBatchId");

-- CreateIndex
CREATE INDEX "EmployeeDisciplinary_employeeId_idx" ON "EmployeeDisciplinary"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeDisciplinary_employeeDbId_idx" ON "EmployeeDisciplinary"("employeeDbId");

-- CreateIndex
CREATE INDEX "EmployeeDisciplinary_reportDate_idx" ON "EmployeeDisciplinary"("reportDate");

-- CreateIndex
CREATE INDEX "EmployeeDisciplinary_sourceBatchId_idx" ON "EmployeeDisciplinary"("sourceBatchId");

-- CreateIndex
CREATE INDEX "ImportBatch_sourceType_idx" ON "ImportBatch"("sourceType");

-- CreateIndex
CREATE INDEX "ImportBatch_sourcePeriod_idx" ON "ImportBatch"("sourcePeriod");

-- CreateIndex
CREATE INDEX "ImportBatch_uploadedAt_idx" ON "ImportBatch"("uploadedAt");

-- AddForeignKey
ALTER TABLE "CurrentEmployment" ADD CONSTRAINT "CurrentEmployment_employeeDbId_fkey" FOREIGN KEY ("employeeDbId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurrentEmployment" ADD CONSTRAINT "CurrentEmployment_sourceBatchId_fkey" FOREIGN KEY ("sourceBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeMutation" ADD CONSTRAINT "EmployeeMutation_employeeDbId_fkey" FOREIGN KEY ("employeeDbId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeMutation" ADD CONSTRAINT "EmployeeMutation_sourceBatchId_fkey" FOREIGN KEY ("sourceBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformancePeriod" ADD CONSTRAINT "PerformancePeriod_sourceBatchId_fkey" FOREIGN KEY ("sourceBatchId") REFERENCES "ImportBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePerformance" ADD CONSTRAINT "EmployeePerformance_employeeDbId_fkey" FOREIGN KEY ("employeeDbId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePerformance" ADD CONSTRAINT "EmployeePerformance_performancePeriodId_fkey" FOREIGN KEY ("performancePeriodId") REFERENCES "PerformancePeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePerformance" ADD CONSTRAINT "EmployeePerformance_sourceBatchId_fkey" FOREIGN KEY ("sourceBatchId") REFERENCES "ImportBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDisciplinary" ADD CONSTRAINT "EmployeeDisciplinary_employeeDbId_fkey" FOREIGN KEY ("employeeDbId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDisciplinary" ADD CONSTRAINT "EmployeeDisciplinary_sourceBatchId_fkey" FOREIGN KEY ("sourceBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
