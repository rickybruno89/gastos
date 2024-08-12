/*
  Warnings:

  - You are about to drop the column `paymentSourceId` on the `CreditCard` table. All the data in the column will be lost.
  - You are about to drop the column `paymentTypeId` on the `CreditCard` table. All the data in the column will be lost.
  - You are about to drop the column `paymentSourceId` on the `CreditCardPaymentSummary` table. All the data in the column will be lost.
  - You are about to drop the column `paymentTypeId` on the `CreditCardPaymentSummary` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "CreditCard" DROP CONSTRAINT "CreditCard_paymentSourceId_fkey";

-- DropForeignKey
ALTER TABLE "CreditCard" DROP CONSTRAINT "CreditCard_paymentTypeId_fkey";

-- DropForeignKey
ALTER TABLE "CreditCardPaymentSummary" DROP CONSTRAINT "CreditCardPaymentSummary_paymentSourceId_fkey";

-- DropForeignKey
ALTER TABLE "CreditCardPaymentSummary" DROP CONSTRAINT "CreditCardPaymentSummary_paymentTypeId_fkey";

-- AlterTable
ALTER TABLE "CreditCard" DROP COLUMN "paymentSourceId",
DROP COLUMN "paymentTypeId";

-- AlterTable
ALTER TABLE "CreditCardPaymentSummary" DROP COLUMN "paymentSourceId",
DROP COLUMN "paymentTypeId";
