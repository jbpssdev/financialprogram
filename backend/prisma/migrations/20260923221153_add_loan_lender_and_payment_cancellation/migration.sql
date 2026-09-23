/*
  Warnings:

  - Added the required column `lenderName` to the `loans` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LoanPaymentStatus" AS ENUM ('CONFIRMED', 'CANCELED');

-- AlterTable
ALTER TABLE "loan_payments" ADD COLUMN     "canceledAt" TIMESTAMP(3),
ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "status" "LoanPaymentStatus" NOT NULL DEFAULT 'CONFIRMED';

-- AlterTable loans: 4-step safe migration
ALTER TABLE "loans" ADD COLUMN "lenderName" TEXT;
UPDATE "loans" SET "lenderName" = COALESCE("description", 'Não informado') WHERE "lenderName" IS NULL;
ALTER TABLE "loans" ALTER COLUMN "lenderName" SET NOT NULL;
ALTER TABLE "loans" ALTER COLUMN "description" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "loan_payments_status_idx" ON "loan_payments"("status");
