-- CreateEnum
CREATE TYPE "PurchasePaymentStatus" AS ENUM ('CONFIRMED', 'CANCELED');

-- AlterTable
ALTER TABLE "purchase_payments" ADD COLUMN     "canceledAt" TIMESTAMP(3),
ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "status" "PurchasePaymentStatus" NOT NULL DEFAULT 'CONFIRMED';

-- CreateIndex
CREATE INDEX "purchase_payments_status_idx" ON "purchase_payments"("status");
