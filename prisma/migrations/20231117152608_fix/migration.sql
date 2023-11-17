/*
  Warnings:

  - You are about to drop the column `installmentAmount` on the `CreditCardExpenseItem` table. All the data in the column will be lost.
  - You are about to drop the column `installmentPaid` on the `CreditCardExpenseItem` table. All the data in the column will be lost.
  - The primary key for the `ExpensePaymentSummary` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `ExpensePaymentSummary` table. All the data in the column will be lost.
  - Added the required column `userId` to the `CreditCardExpenseItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `creditCardExpenseItemId` to the `CreditCardPaymentSummary` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CreditCardExpenseItem" DROP COLUMN "installmentAmount",
DROP COLUMN "installmentPaid",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "CreditCardPaymentSummary" ADD COLUMN     "creditCardExpenseItemId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ExpensePaymentSummary" DROP CONSTRAINT "ExpensePaymentSummary_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "ExpensePaymentSummary_pkey" PRIMARY KEY ("expenseId", "date");

-- AddForeignKey
ALTER TABLE "CreditCardExpenseItem" ADD CONSTRAINT "CreditCardExpenseItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditCardPaymentSummary" ADD CONSTRAINT "CreditCardPaymentSummary_creditCardExpenseItemId_fkey" FOREIGN KEY ("creditCardExpenseItemId") REFERENCES "CreditCardExpenseItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
