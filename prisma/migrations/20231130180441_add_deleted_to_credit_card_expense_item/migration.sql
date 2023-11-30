-- AlterTable
ALTER TABLE "CreditCardExpenseItem" ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deletedAt" TIMESTAMP(3);
