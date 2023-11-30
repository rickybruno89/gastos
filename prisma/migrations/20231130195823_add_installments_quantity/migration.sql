-- AlterTable
ALTER TABLE "CreditCardSummaryExpenseItem" ADD COLUMN     "installmentsQuantity" INTEGER NOT NULL DEFAULT 0;

UPDATE "CreditCardSummaryExpenseItem"
SET "installmentsQuantity" = "CreditCardExpenseItem"."installmentsQuantity"
FROM "CreditCardExpenseItem"
WHERE "CreditCardSummaryExpenseItem"."creditCardExpenseItemId" = "CreditCardExpenseItem"."id";
