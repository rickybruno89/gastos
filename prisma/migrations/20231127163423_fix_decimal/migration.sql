/*
  Warnings:

  - You are about to alter the column `taxesPercent` on the `CreditCard` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.
  - You are about to alter the column `amount` on the `CreditCardExpenseItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.
  - You are about to alter the column `installmentsAmount` on the `CreditCardExpenseItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.
  - You are about to alter the column `amount` on the `CreditCardPaymentSummary` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.
  - You are about to alter the column `amount` on the `Expense` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.
  - You are about to alter the column `amount` on the `ExpensePaymentSummary` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.

*/
-- AlterTable
ALTER TABLE "CreditCard" ALTER COLUMN "taxesPercent" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "CreditCardExpenseItem" ALTER COLUMN "amount" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "installmentsAmount" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "CreditCardPaymentSummary" ALTER COLUMN "amount" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Expense" ALTER COLUMN "amount" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "ExpensePaymentSummary" ALTER COLUMN "amount" SET DATA TYPE DOUBLE PRECISION;
