/*
  Warnings:

  - You are about to drop the column `creditCardExpenseId` on the `CreditCardExpenseItem` table. All the data in the column will be lost.
  - You are about to drop the column `creditCardExpenseId` on the `CreditCardPaymentSummary` table. All the data in the column will be lost.
  - You are about to drop the column `creditCardExpenseItemId` on the `CreditCardPaymentSummary` table. All the data in the column will be lost.
  - You are about to drop the `CreditCardExpense` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `paymentSourceId` to the `CreditCard` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentTypeId` to the `CreditCard` table without a default value. This is not possible if the table is not empty.
  - Added the required column `creditCardId` to the `CreditCardExpenseItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `creditCardId` to the `CreditCardPaymentSummary` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "CreditCardExpense" DROP CONSTRAINT "CreditCardExpense_creditCardId_fkey";

-- DropForeignKey
ALTER TABLE "CreditCardExpense" DROP CONSTRAINT "CreditCardExpense_paymentSourceId_fkey";

-- DropForeignKey
ALTER TABLE "CreditCardExpense" DROP CONSTRAINT "CreditCardExpense_paymentTypeId_fkey";

-- DropForeignKey
ALTER TABLE "CreditCardExpense" DROP CONSTRAINT "CreditCardExpense_userId_fkey";

-- DropForeignKey
ALTER TABLE "CreditCardExpenseItem" DROP CONSTRAINT "CreditCardExpenseItem_creditCardExpenseId_fkey";

-- DropForeignKey
ALTER TABLE "CreditCardPaymentSummary" DROP CONSTRAINT "CreditCardPaymentSummary_creditCardExpenseId_fkey";

-- DropForeignKey
ALTER TABLE "CreditCardPaymentSummary" DROP CONSTRAINT "CreditCardPaymentSummary_creditCardExpenseItemId_fkey";

-- AlterTable
ALTER TABLE "CreditCard" ADD COLUMN     "paymentSourceId" TEXT NOT NULL,
ADD COLUMN     "paymentTypeId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "CreditCardExpenseItem" DROP COLUMN "creditCardExpenseId",
ADD COLUMN     "creditCardId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "CreditCardPaymentSummary" DROP COLUMN "creditCardExpenseId",
DROP COLUMN "creditCardExpenseItemId",
ADD COLUMN     "creditCardId" TEXT NOT NULL;

-- DropTable
DROP TABLE "CreditCardExpense";

-- CreateTable
CREATE TABLE "_CreditCardExpenseItemToCreditCardPaymentSummary" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_CreditCardExpenseItemToCreditCardPaymentSummary_AB_unique" ON "_CreditCardExpenseItemToCreditCardPaymentSummary"("A", "B");

-- CreateIndex
CREATE INDEX "_CreditCardExpenseItemToCreditCardPaymentSummary_B_index" ON "_CreditCardExpenseItemToCreditCardPaymentSummary"("B");

-- AddForeignKey
ALTER TABLE "CreditCard" ADD CONSTRAINT "CreditCard_paymentTypeId_fkey" FOREIGN KEY ("paymentTypeId") REFERENCES "PaymentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditCard" ADD CONSTRAINT "CreditCard_paymentSourceId_fkey" FOREIGN KEY ("paymentSourceId") REFERENCES "PaymentSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditCardExpenseItem" ADD CONSTRAINT "CreditCardExpenseItem_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "CreditCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditCardPaymentSummary" ADD CONSTRAINT "CreditCardPaymentSummary_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "CreditCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CreditCardExpenseItemToCreditCardPaymentSummary" ADD CONSTRAINT "_CreditCardExpenseItemToCreditCardPaymentSummary_A_fkey" FOREIGN KEY ("A") REFERENCES "CreditCardExpenseItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CreditCardExpenseItemToCreditCardPaymentSummary" ADD CONSTRAINT "_CreditCardExpenseItemToCreditCardPaymentSummary_B_fkey" FOREIGN KEY ("B") REFERENCES "CreditCardPaymentSummary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
