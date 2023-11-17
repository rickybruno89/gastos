/*
  Warnings:

  - A unique constraint covering the columns `[userId,name]` on the table `Currency` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,userId]` on the table `Person` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Currency_userId_name_key" ON "Currency"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Person_name_userId_key" ON "Person"("name", "userId");
