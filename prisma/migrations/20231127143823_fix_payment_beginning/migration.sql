/*
  Warnings:

  - Made the column `paymentBeginning` on table `CreditCardExpenseItem` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "CreditCardExpenseItem" ALTER COLUMN "paymentBeginning" SET NOT NULL;
