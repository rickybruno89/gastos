/*
  Warnings:

  - You are about to drop the column `deleted` on the `CreditCardExpenseItem` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `CreditCardExpenseItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CreditCardExpenseItem" DROP COLUMN "deleted",
DROP COLUMN "deletedAt",
ADD COLUMN     "finished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "finishedAt" TIMESTAMP(3);
