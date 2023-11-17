/*
  Warnings:

  - You are about to drop the column `installmentQuantity` on the `CreditCardExpenseItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CreditCardExpenseItem" DROP COLUMN "installmentQuantity",
ADD COLUMN     "installmentsAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "installmentsPaid" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "installmentsQuantity" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "CreditCardExpenseItem_finished_recurrent_idx" ON "CreditCardExpenseItem"("finished", "recurrent");
