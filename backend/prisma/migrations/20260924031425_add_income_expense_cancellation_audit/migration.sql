-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "canceledAt" TIMESTAMP(3),
ADD COLUMN     "cancellationReason" TEXT;

-- AlterTable
ALTER TABLE "incomes" ADD COLUMN     "canceledAt" TIMESTAMP(3),
ADD COLUMN     "cancellationReason" TEXT;
