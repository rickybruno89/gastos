/*
  Warnings:

  - Made the column `amount` on table `CreditCardExpenseItem` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "CreditCardExpenseItem" ALTER COLUMN "amount" SET NOT NULL,
ALTER COLUMN "amount" SET DEFAULT 0;
