/*
  Warnings:

  - You are about to drop the column `month` on the `CreditCardPaymentSummary` table. All the data in the column will be lost.
  - You are about to drop the column `month` on the `ExpensePaymentSummary` table. All the data in the column will be lost.
  - Added the required column `date` to the `CreditCardPaymentSummary` table without a default value. This is not possible if the table is not empty.
  - Added the required column `date` to the `ExpensePaymentSummary` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CreditCardPaymentSummary" DROP COLUMN "month",
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "ExpensePaymentSummary" DROP COLUMN "month",
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL;
