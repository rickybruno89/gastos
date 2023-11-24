/*
  Warnings:

  - You are about to drop the column `deleted` on the `Currency` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Currency` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Currency` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Currency" DROP CONSTRAINT "Currency_userId_fkey";

-- DropIndex
DROP INDEX "Currency_userId_name_key";

-- AlterTable
ALTER TABLE "Currency" DROP COLUMN "deleted",
DROP COLUMN "deletedAt",
DROP COLUMN "userId";
