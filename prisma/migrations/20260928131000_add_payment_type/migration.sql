-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('CASH', 'CARD', 'CLICK');

-- AlterTable
ALTER TABLE "Visit" ADD COLUMN     "payment_type" "PaymentType";
