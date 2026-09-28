-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Visit" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;
