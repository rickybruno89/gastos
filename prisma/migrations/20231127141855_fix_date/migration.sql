/*
  Warnings:

  - The primary key for the `ExpensePaymentSummary` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "CreditCardExpenseItem" ALTER COLUMN "paymentBeginning" DROP NOT NULL,
ALTER COLUMN "paymentBeginning" DROP DEFAULT,
ALTER COLUMN "paymentBeginning" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "CreditCardPaymentSummary" ALTER COLUMN "date" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "ExpensePaymentSummary" DROP CONSTRAINT "ExpensePaymentSummary_pkey",
ALTER COLUMN "date" SET DATA TYPE TEXT,
ADD CONSTRAINT "ExpensePaymentSummary_pkey" PRIMARY KEY ("expenseId", "date");
