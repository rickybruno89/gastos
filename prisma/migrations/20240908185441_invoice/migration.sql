-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "contractorName" TEXT NOT NULL,
    "personalEmail" TEXT NOT NULL,
    "personalStreet" TEXT NOT NULL,
    "personalState" TEXT NOT NULL,
    "personalZip" TEXT NOT NULL,
    "destinationName" TEXT NOT NULL,
    "destinationStreet" TEXT NOT NULL,
    "destinationState" TEXT NOT NULL,
    "destinationZip" TEXT NOT NULL,
    "destinationEmail" TEXT NOT NULL,
    "destinationTaxId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankAddress" TEXT NOT NULL,
    "bankRoutingNumber" TEXT NOT NULL,
    "bankAccountNumber" TEXT NOT NULL,
    "bankAccountType" TEXT NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);
