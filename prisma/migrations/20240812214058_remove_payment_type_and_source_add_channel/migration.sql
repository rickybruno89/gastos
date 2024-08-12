/*
  Warnings:

  - You are about to drop the column `paymentSourceId` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the column `paymentTypeId` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the column `paymentSourceId` on the `ExpensePaymentSummary` table. All the data in the column will be lost.
  - You are about to drop the column `paymentTypeId` on the `ExpensePaymentSummary` table. All the data in the column will be lost.
  - You are about to drop the `PaymentSource` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PaymentType` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "PaymentChannel" AS ENUM ('EFECTIVO', 'BANCARIZADO', 'DEBITO_AUTOMATICO');

-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_paymentSourceId_fkey";

-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_paymentTypeId_fkey";

-- DropForeignKey
ALTER TABLE "ExpensePaymentSummary" DROP CONSTRAINT "ExpensePaymentSummary_paymentSourceId_fkey";

-- DropForeignKey
ALTER TABLE "ExpensePaymentSummary" DROP CONSTRAINT "ExpensePaymentSummary_paymentTypeId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentSource" DROP CONSTRAINT "PaymentSource_userId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentType" DROP CONSTRAINT "PaymentType_userId_fkey";

-- AlterTable
ALTER TABLE "Expense" DROP COLUMN "paymentSourceId",
DROP COLUMN "paymentTypeId",
ADD COLUMN     "paymentChannel" "PaymentChannel" NOT NULL DEFAULT 'BANCARIZADO';

-- AlterTable
ALTER TABLE "ExpensePaymentSummary" DROP COLUMN "paymentSourceId",
DROP COLUMN "paymentTypeId",
ADD COLUMN     "paymentChannel" "PaymentChannel" NOT NULL DEFAULT 'BANCARIZADO';

-- DropTable
DROP TABLE "PaymentSource";

-- DropTable
DROP TABLE "PaymentType";
