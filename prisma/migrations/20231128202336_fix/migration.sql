/*
  Warnings:

  - A unique constraint covering the columns `[expenseId,date]` on the table `ExpensePaymentSummary` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ExpensePaymentSummary_expenseId_date_key" ON "ExpensePaymentSummary"("expenseId", "date");
