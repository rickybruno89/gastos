/*
  Warnings:

  - A unique constraint covering the columns `[creditCardId,date]` on the table `CreditCardPaymentSummary` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[creditCardId,summarySequence]` on the table `CreditCardPaymentSummary` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('ARS', 'USD');

-- AlterTable
ALTER TABLE "CreditCard" ADD COLUMN     "defaultCurrency" "Currency" NOT NULL DEFAULT 'ARS';

-- AlterTable
ALTER TABLE "CreditCardExpenseItem" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'ARS';

-- AlterTable
ALTER TABLE "CreditCardPaymentSummary" ADD COLUMN     "creditBalanceARS" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "creditBalanceUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "summarySequence" INTEGER,
ADD COLUMN     "taxesARS" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "taxesUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalAmountARS" DOUBLE PRECISION,
ADD COLUMN     "totalAmountUSD" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "annualPaymentDate" TEXT,
ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'ARS',
ADD COLUMN     "isAnnualPayment" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ExpensePaymentSummary" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'ARS';

-- CreateTable
CREATE TABLE "InstallmentPayment" (
    "id" TEXT NOT NULL,
    "creditCardExpenseItemId" TEXT NOT NULL,
    "creditCardPaymentSummaryId" TEXT,
    "installmentNumber" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'ARS',
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paymentDate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstallmentPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InstallmentPayment_isPaid_paymentDate_idx" ON "InstallmentPayment"("isPaid", "paymentDate");

-- CreateIndex
CREATE UNIQUE INDEX "InstallmentPayment_creditCardExpenseItemId_installmentNumbe_key" ON "InstallmentPayment"("creditCardExpenseItemId", "installmentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CreditCardPaymentSummary_creditCardId_date_key" ON "CreditCardPaymentSummary"("creditCardId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CreditCardPaymentSummary_creditCardId_summarySequence_key" ON "CreditCardPaymentSummary"("creditCardId", "summarySequence");

-- AddForeignKey
ALTER TABLE "InstallmentPayment" ADD CONSTRAINT "InstallmentPayment_creditCardExpenseItemId_fkey" FOREIGN KEY ("creditCardExpenseItemId") REFERENCES "CreditCardExpenseItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallmentPayment" ADD CONSTRAINT "InstallmentPayment_creditCardPaymentSummaryId_fkey" FOREIGN KEY ("creditCardPaymentSummaryId") REFERENCES "CreditCardPaymentSummary"("id") ON DELETE SET NULL ON UPDATE CASCADE;
