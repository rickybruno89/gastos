/*
  Warnings:

  - You are about to drop the `_CreditCardExpenseItemToCreditCardPaymentSummary` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_CreditCardExpenseItemToCreditCardPaymentSummary" DROP CONSTRAINT "_CreditCardExpenseItemToCreditCardPaymentSummary_A_fkey";

-- DropForeignKey
ALTER TABLE "_CreditCardExpenseItemToCreditCardPaymentSummary" DROP CONSTRAINT "_CreditCardExpenseItemToCreditCardPaymentSummary_B_fkey";

-- DropTable
DROP TABLE "_CreditCardExpenseItemToCreditCardPaymentSummary";

-- CreateTable
CREATE TABLE "CreditCardSummaryExpenseItem" (
    "id" TEXT NOT NULL,
    "creditCardExpenseItemId" TEXT NOT NULL,
    "creditCardPaymentSummaryId" TEXT NOT NULL,
    "installmentPaid" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CreditCardSummaryExpenseItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CreditCardSummaryExpenseItem" ADD CONSTRAINT "CreditCardSummaryExpenseItem_creditCardExpenseItemId_fkey" FOREIGN KEY ("creditCardExpenseItemId") REFERENCES "CreditCardExpenseItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditCardSummaryExpenseItem" ADD CONSTRAINT "CreditCardSummaryExpenseItem_creditCardPaymentSummaryId_fkey" FOREIGN KEY ("creditCardPaymentSummaryId") REFERENCES "CreditCardPaymentSummary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
