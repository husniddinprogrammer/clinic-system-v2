-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('DOSTAVKA', 'OVQAT', 'ISHCHI', 'BOSHQA');

-- CreateEnum
CREATE TYPE "LabWorkType" AS ENUM ('ZIRCON', 'MK_500', 'CLITOY_300', 'TITAN_250');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityType" ADD VALUE 'EXPENSE';
ALTER TYPE "ActivityType" ADD VALUE 'LABWORK';
ALTER TYPE "ActivityType" ADD VALUE 'EMPLOYEE';

-- CreateTable
CREATE TABLE "Employee" (
    "id" SERIAL NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" SERIAL NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employee_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabWork" (
    "id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "work_type" "LabWorkType" NOT NULL,
    "work_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "price" DECIMAL(12,2) NOT NULL,
    "payment_type" "PaymentType",
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabWork_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Employee_last_name_idx" ON "Employee"("last_name");

-- CreateIndex
CREATE INDEX "Expense_date_idx" ON "Expense"("date");

-- CreateIndex
CREATE INDEX "Expense_category_idx" ON "Expense"("category");

-- CreateIndex
CREATE INDEX "LabWork_patient_id_idx" ON "LabWork"("patient_id");

-- CreateIndex
CREATE INDEX "LabWork_employee_id_idx" ON "LabWork"("employee_id");

-- CreateIndex
CREATE INDEX "LabWork_work_date_idx" ON "LabWork"("work_date");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabWork" ADD CONSTRAINT "LabWork_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabWork" ADD CONSTRAINT "LabWork_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
