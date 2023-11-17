/*
  Warnings:

  - You are about to drop the column `name` on the `CreditCardExpense` table. All the data in the column will be lost.
  - You are about to drop the column `taxesPercent` on the `CreditCardExpense` table. All the data in the column will be lost.
  - Added the required column `creditCardId` to the `CreditCardExpense` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CreditCardExpense" DROP COLUMN "name",
DROP COLUMN "taxesPercent",
ADD COLUMN     "creditCardId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "CreditCard" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "taxesPercent" DECIMAL(65,30) NOT NULL,
    "userId" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditCard_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CreditCard" ADD CONSTRAINT "CreditCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditCardExpense" ADD CONSTRAINT "CreditCardExpense_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "CreditCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
