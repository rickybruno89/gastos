-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "auth";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('ARS', 'USD');

-- CreateEnum
CREATE TYPE "OccurrenceStatus" AS ENUM ('PLANNED', 'PAID', 'COVERED', 'SKIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "DebtAdjustmentKind" AS ENUM ('INCREASE', 'FORGIVE');

-- CreateTable
CREATE TABLE "auth"."user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMPTZ(3),
    "refreshTokenExpiresAt" TIMESTAMPTZ(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreferences" (
    "userId" TEXT NOT NULL,
    "timeZone" TEXT NOT NULL DEFAULT 'America/Argentina/Tucuman',
    "locale" TEXT NOT NULL DEFAULT 'es-AR',
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "MonthlyExpenseSeries" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "currency" "Currency" NOT NULL,
    "intervalMonths" SMALLINT NOT NULL DEFAULT 1,
    "firstPeriod" DATE NOT NULL,
    "endPeriod" DATE,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MonthlyExpenseSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyExpenseTerms" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "seriesId" UUID NOT NULL,
    "effectivePeriod" DATE NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "dueDay" SMALLINT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyExpenseTerms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyExpenseOccurrence" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "seriesId" UUID NOT NULL,
    "period" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" "Currency" NOT NULL,
    "status" "OccurrenceStatus" NOT NULL DEFAULT 'PLANNED',
    "statusReason" VARCHAR(200),
    "coverageId" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MonthlyExpenseOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpensePayment" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "occurrenceId" UUID NOT NULL,
    "paidOn" DATE NOT NULL,
    "channel" VARCHAR(40),
    "amountMinor" BIGINT NOT NULL,
    "currency" "Currency" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revertedAt" TIMESTAMPTZ(3),
    "coverageId" UUID,

    CONSTRAINT "ExpensePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoveragePeriod" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "seriesId" UUID NOT NULL,
    "fromPeriod" DATE NOT NULL,
    "toPeriod" DATE NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revertedAt" TIMESTAMPTZ(3),

    CONSTRAINT "CoveragePeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "entityType" VARCHAR(60) NOT NULL,
    "entityId" UUID NOT NULL,
    "data" JSONB NOT NULL,
    "requestId" VARCHAR(64),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "ownerId" TEXT NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "scope" VARCHAR(160) NOT NULL,
    "requestHash" CHAR(64) NOT NULL,
    "responseStatus" SMALLINT,
    "responseBody" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("ownerId","key")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "nickname" VARCHAR(60) NOT NULL,
    "email" VARCHAR(254),
    "connectionId" UUID,
    "archivedAt" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserConnection" (
    "id" UUID NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviterName" VARCHAR(120) NOT NULL,
    "inviteeEmail" VARCHAR(254) NOT NULL,
    "inviteeId" TEXT,
    "inviteeName" VARCHAR(120),
    "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "acceptedPeriod" DATE,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMPTZ(3),

    CONSTRAINT "UserConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyExpenseTermsShare" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "termsId" UUID NOT NULL,
    "contactId" UUID NOT NULL,
    "shareBps" INTEGER NOT NULL,

    CONSTRAINT "MonthlyExpenseTermsShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OccurrenceAllocation" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "occurrenceId" UUID NOT NULL,
    "contactId" UUID,
    "connectionId" UUID,
    "period" DATE NOT NULL,
    "expenseName" VARCHAR(80) NOT NULL,
    "shareBps" INTEGER NOT NULL,
    "baseAmountMinor" BIGINT NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" "Currency" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OccurrenceAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalDebt" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "contactId" UUID NOT NULL,
    "description" VARCHAR(120) NOT NULL,
    "notes" VARCHAR(500),
    "currency" "Currency" NOT NULL,
    "principalMinor" BIGINT NOT NULL,
    "lentOn" DATE NOT NULL,
    "dueOn" DATE,
    "cancelledAt" TIMESTAMPTZ(3),
    "cancelReason" VARCHAR(200),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PersonalDebt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalDebtPayment" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "debtId" UUID NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "paidOn" DATE NOT NULL,
    "note" VARCHAR(300),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revertedAt" TIMESTAMPTZ(3),

    CONSTRAINT "PersonalDebtPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalDebtAdjustment" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "debtId" UUID NOT NULL,
    "kind" "DebtAdjustmentKind" NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "effectiveOn" DATE NOT NULL,
    "reason" VARCHAR(200) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonalDebtAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "auth"."user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "auth"."session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "auth"."session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "auth"."account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "account_providerId_accountId_key" ON "auth"."account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "auth"."verification"("identifier");

-- CreateIndex
CREATE INDEX "MonthlyExpenseSeries_ownerId_firstPeriod_idx" ON "MonthlyExpenseSeries"("ownerId", "firstPeriod");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyExpenseSeries_id_ownerId_key" ON "MonthlyExpenseSeries"("id", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyExpenseTerms_seriesId_effectivePeriod_key" ON "MonthlyExpenseTerms"("seriesId", "effectivePeriod");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyExpenseTerms_id_ownerId_key" ON "MonthlyExpenseTerms"("id", "ownerId");

-- CreateIndex
CREATE INDEX "MonthlyExpenseOccurrence_ownerId_period_idx" ON "MonthlyExpenseOccurrence"("ownerId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyExpenseOccurrence_seriesId_period_key" ON "MonthlyExpenseOccurrence"("seriesId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyExpenseOccurrence_id_ownerId_key" ON "MonthlyExpenseOccurrence"("id", "ownerId");

-- CreateIndex
CREATE INDEX "ExpensePayment_occurrenceId_idx" ON "ExpensePayment"("occurrenceId");

-- CreateIndex
CREATE INDEX "CoveragePeriod_seriesId_fromPeriod_idx" ON "CoveragePeriod"("seriesId", "fromPeriod");

-- CreateIndex
CREATE UNIQUE INDEX "CoveragePeriod_id_ownerId_key" ON "CoveragePeriod"("id", "ownerId");

-- CreateIndex
CREATE INDEX "AuditLog_ownerId_entityType_entityId_idx" ON "AuditLog"("ownerId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "IdempotencyKey_createdAt_idx" ON "IdempotencyKey"("createdAt");

-- CreateIndex
CREATE INDEX "Contact_ownerId_idx" ON "Contact"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_id_ownerId_key" ON "Contact"("id", "ownerId");

-- CreateIndex
CREATE INDEX "UserConnection_inviteeEmail_status_idx" ON "UserConnection"("inviteeEmail", "status");

-- CreateIndex
CREATE INDEX "UserConnection_inviterId_idx" ON "UserConnection"("inviterId");

-- CreateIndex
CREATE INDEX "UserConnection_inviteeId_idx" ON "UserConnection"("inviteeId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyExpenseTermsShare_termsId_contactId_key" ON "MonthlyExpenseTermsShare"("termsId", "contactId");

-- CreateIndex
CREATE INDEX "OccurrenceAllocation_occurrenceId_idx" ON "OccurrenceAllocation"("occurrenceId");

-- CreateIndex
CREATE INDEX "OccurrenceAllocation_ownerId_period_idx" ON "OccurrenceAllocation"("ownerId", "period");

-- CreateIndex
CREATE INDEX "OccurrenceAllocation_connectionId_period_idx" ON "OccurrenceAllocation"("connectionId", "period");

-- CreateIndex
CREATE INDEX "PersonalDebt_ownerId_createdAt_idx" ON "PersonalDebt"("ownerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalDebt_id_ownerId_key" ON "PersonalDebt"("id", "ownerId");

-- CreateIndex
CREATE INDEX "PersonalDebtPayment_debtId_idx" ON "PersonalDebtPayment"("debtId");

-- CreateIndex
CREATE INDEX "PersonalDebtAdjustment_debtId_idx" ON "PersonalDebtAdjustment"("debtId");

-- AddForeignKey
ALTER TABLE "auth"."session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth"."account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyExpenseSeries" ADD CONSTRAINT "MonthlyExpenseSeries_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "auth"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyExpenseTerms" ADD CONSTRAINT "MonthlyExpenseTerms_seriesId_ownerId_fkey" FOREIGN KEY ("seriesId", "ownerId") REFERENCES "MonthlyExpenseSeries"("id", "ownerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyExpenseOccurrence" ADD CONSTRAINT "MonthlyExpenseOccurrence_seriesId_ownerId_fkey" FOREIGN KEY ("seriesId", "ownerId") REFERENCES "MonthlyExpenseSeries"("id", "ownerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyExpenseOccurrence" ADD CONSTRAINT "MonthlyExpenseOccurrence_coverageId_ownerId_fkey" FOREIGN KEY ("coverageId", "ownerId") REFERENCES "CoveragePeriod"("id", "ownerId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ExpensePayment" ADD CONSTRAINT "ExpensePayment_occurrenceId_ownerId_fkey" FOREIGN KEY ("occurrenceId", "ownerId") REFERENCES "MonthlyExpenseOccurrence"("id", "ownerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpensePayment" ADD CONSTRAINT "ExpensePayment_coverageId_ownerId_fkey" FOREIGN KEY ("coverageId", "ownerId") REFERENCES "CoveragePeriod"("id", "ownerId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CoveragePeriod" ADD CONSTRAINT "CoveragePeriod_seriesId_ownerId_fkey" FOREIGN KEY ("seriesId", "ownerId") REFERENCES "MonthlyExpenseSeries"("id", "ownerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "auth"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdempotencyKey" ADD CONSTRAINT "IdempotencyKey_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "auth"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "auth"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "UserConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConnection" ADD CONSTRAINT "UserConnection_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "auth"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConnection" ADD CONSTRAINT "UserConnection_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "auth"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyExpenseTermsShare" ADD CONSTRAINT "MonthlyExpenseTermsShare_termsId_ownerId_fkey" FOREIGN KEY ("termsId", "ownerId") REFERENCES "MonthlyExpenseTerms"("id", "ownerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyExpenseTermsShare" ADD CONSTRAINT "MonthlyExpenseTermsShare_contactId_ownerId_fkey" FOREIGN KEY ("contactId", "ownerId") REFERENCES "Contact"("id", "ownerId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OccurrenceAllocation" ADD CONSTRAINT "OccurrenceAllocation_occurrenceId_ownerId_fkey" FOREIGN KEY ("occurrenceId", "ownerId") REFERENCES "MonthlyExpenseOccurrence"("id", "ownerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OccurrenceAllocation" ADD CONSTRAINT "OccurrenceAllocation_contactId_ownerId_fkey" FOREIGN KEY ("contactId", "ownerId") REFERENCES "Contact"("id", "ownerId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OccurrenceAllocation" ADD CONSTRAINT "OccurrenceAllocation_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "UserConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalDebt" ADD CONSTRAINT "PersonalDebt_contactId_ownerId_fkey" FOREIGN KEY ("contactId", "ownerId") REFERENCES "Contact"("id", "ownerId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PersonalDebtPayment" ADD CONSTRAINT "PersonalDebtPayment_debtId_ownerId_fkey" FOREIGN KEY ("debtId", "ownerId") REFERENCES "PersonalDebt"("id", "ownerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalDebtAdjustment" ADD CONSTRAINT "PersonalDebtAdjustment_debtId_ownerId_fkey" FOREIGN KEY ("debtId", "ownerId") REFERENCES "PersonalDebt"("id", "ownerId") ON DELETE CASCADE ON UPDATE CASCADE;


-- Domain constraints: periods are first-of-month dates and money is positive minor units.
ALTER TABLE "MonthlyExpenseSeries"
  ADD CONSTRAINT "MonthlyExpenseSeries_name_check" CHECK (length(btrim("name")) > 0),
  ADD CONSTRAINT "MonthlyExpenseSeries_interval_check" CHECK ("intervalMonths" IN (1, 2)),
  ADD CONSTRAINT "MonthlyExpenseSeries_firstPeriod_check" CHECK (EXTRACT(DAY FROM "firstPeriod") = 1),
  ADD CONSTRAINT "MonthlyExpenseSeries_endPeriod_check" CHECK (
    "endPeriod" IS NULL OR (EXTRACT(DAY FROM "endPeriod") = 1 AND "endPeriod" >= "firstPeriod")
  );
ALTER TABLE "MonthlyExpenseTerms"
  ADD CONSTRAINT "MonthlyExpenseTerms_amount_check" CHECK ("amountMinor" > 0),
  ADD CONSTRAINT "MonthlyExpenseTerms_dueDay_check" CHECK ("dueDay" BETWEEN 1 AND 31),
  ADD CONSTRAINT "MonthlyExpenseTerms_period_check" CHECK (EXTRACT(DAY FROM "effectivePeriod") = 1);
ALTER TABLE "MonthlyExpenseOccurrence"
  ADD CONSTRAINT "MonthlyExpenseOccurrence_amount_check" CHECK ("amountMinor" > 0),
  ADD CONSTRAINT "MonthlyExpenseOccurrence_period_check" CHECK (EXTRACT(DAY FROM "period") = 1),
  ADD CONSTRAINT "MonthlyExpenseOccurrence_dueDate_check" CHECK (date_trunc('month', "dueDate") = "period"),
  ADD CONSTRAINT "MonthlyExpenseOccurrence_reason_check" CHECK (
    ("status" IN ('SKIPPED', 'CANCELLED')) = ("statusReason" IS NOT NULL AND length(btrim("statusReason")) > 0)
  ),
  ADD CONSTRAINT "MonthlyExpenseOccurrence_coverage_check" CHECK (("status" = 'COVERED') = ("coverageId" IS NOT NULL));
ALTER TABLE "CoveragePeriod"
  ADD CONSTRAINT "CoveragePeriod_range_check" CHECK (
    EXTRACT(DAY FROM "fromPeriod") = 1 AND EXTRACT(DAY FROM "toPeriod") = 1 AND "toPeriod" > "fromPeriod"
  );
ALTER TABLE "ExpensePayment"
  ADD CONSTRAINT "ExpensePayment_amount_check" CHECK ("amountMinor" > 0);

ALTER TABLE "Contact"
  ADD CONSTRAINT "Contact_nickname_check" CHECK (length(btrim("nickname")) > 0),
  ADD CONSTRAINT "Contact_email_check" CHECK ("email" IS NULL OR ("email" = lower(btrim("email")) AND "email" LIKE '%_@_%'));
ALTER TABLE "UserConnection"
  ADD CONSTRAINT "UserConnection_email_check" CHECK ("inviteeEmail" = lower(btrim("inviteeEmail"))),
  ADD CONSTRAINT "UserConnection_self_check" CHECK ("inviteeId" IS NULL OR "inviteeId" <> "inviterId"),
  ADD CONSTRAINT "UserConnection_accepted_check" CHECK (
    "status" <> 'ACCEPTED' OR ("inviteeId" IS NOT NULL AND "acceptedPeriod" IS NOT NULL AND EXTRACT(DAY FROM "acceptedPeriod") = 1)
  );
ALTER TABLE "MonthlyExpenseTermsShare"
  ADD CONSTRAINT "MonthlyExpenseTermsShare_bps_check" CHECK ("shareBps" BETWEEN 1 AND 10000);
ALTER TABLE "OccurrenceAllocation"
  ADD CONSTRAINT "OccurrenceAllocation_bps_check" CHECK ("shareBps" BETWEEN 0 AND 10000),
  ADD CONSTRAINT "OccurrenceAllocation_amount_check" CHECK ("amountMinor" >= 0 AND "baseAmountMinor" > 0),
  ADD CONSTRAINT "OccurrenceAllocation_period_check" CHECK (EXTRACT(DAY FROM "period") = 1);
-- One owner row per occurrence (contactId NULL) and one row per contact.
CREATE UNIQUE INDEX "OccurrenceAllocation_owner_key" ON "OccurrenceAllocation"("occurrenceId") WHERE "contactId" IS NULL;
CREATE UNIQUE INDEX "OccurrenceAllocation_contact_key" ON "OccurrenceAllocation"("occurrenceId", "contactId") WHERE "contactId" IS NOT NULL;

-- An occurrence has at most one active payment; undo keeps the reverted row for audit.
CREATE UNIQUE INDEX "ExpensePayment_active_key" ON "ExpensePayment"("occurrenceId") WHERE "revertedAt" IS NULL;

-- Paid and annually covered occurrences are immutable until their payment is undone.
CREATE FUNCTION public.protect_paid_occurrence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."status" IN ('PAID', 'COVERED') AND NEW."status" = OLD."status" AND (
    NEW."amountMinor" <> OLD."amountMinor" OR NEW."dueDate" <> OLD."dueDate" OR NEW."currency" <> OLD."currency"
  ) THEN
    RAISE EXCEPTION 'paid occurrence % is immutable', OLD."id" USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "MonthlyExpenseOccurrence_protect_paid"
  BEFORE UPDATE ON "MonthlyExpenseOccurrence"
  FOR EACH ROW EXECUTE FUNCTION public.protect_paid_occurrence();

-- Runtime roles are created by `npm run db:setup` locally (or the operator in Coolify).
-- The migration owner is deliberately separate from authentication and application roles.
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA auth FROM PUBLIC;
GRANT USAGE ON SCHEMA auth TO gastapp_auth;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth TO gastapp_auth;
GRANT USAGE ON SCHEMA public TO gastapp_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."UserPreferences" TO gastapp_app;
GRANT SELECT, INSERT, UPDATE ON public."MonthlyExpenseSeries", public."MonthlyExpenseTerms",
  public."MonthlyExpenseOccurrence", public."ExpensePayment", public."CoveragePeriod",
  public."IdempotencyKey" TO gastapp_app;
-- The audit log is append-only for the application.
GRANT SELECT, INSERT ON public."AuditLog" TO gastapp_app;
GRANT SELECT, INSERT, UPDATE ON public."Contact", public."UserConnection" TO gastapp_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."MonthlyExpenseTermsShare", public."OccurrenceAllocation" TO gastapp_app;

-- Allocations of an occurrence always add up to 100% (or there are none). Checked per statement:
-- the application replaces an occurrence's allocations with one DELETE and one INSERT.
CREATE FUNCTION public.check_allocation_total() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  invalid UUID;
BEGIN
  SELECT a."occurrenceId" INTO invalid
  FROM public."OccurrenceAllocation" a
  WHERE a."occurrenceId" IN (SELECT "occurrenceId" FROM changed)
  GROUP BY a."occurrenceId"
  HAVING SUM(a."shareBps") <> 10000
  LIMIT 1;
  IF invalid IS NOT NULL THEN
    RAISE EXCEPTION 'allocations of occurrence % must add up to 10000 bps', invalid USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER "OccurrenceAllocation_total_insert" AFTER INSERT ON "OccurrenceAllocation"
  REFERENCING NEW TABLE AS changed FOR EACH STATEMENT EXECUTE FUNCTION public.check_allocation_total();
CREATE TRIGGER "OccurrenceAllocation_total_update" AFTER UPDATE ON "OccurrenceAllocation"
  REFERENCING NEW TABLE AS changed FOR EACH STATEMENT EXECUTE FUNCTION public.check_allocation_total();
CREATE TRIGGER "OccurrenceAllocation_total_delete" AFTER DELETE ON "OccurrenceAllocation"
  REFERENCING OLD TABLE AS changed FOR EACH STATEMENT EXECUTE FUNCTION public.check_allocation_total();

-- Contacts never receive more than 100% of an expense rule.
CREATE FUNCTION public.check_share_total() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public."MonthlyExpenseTermsShare" s
    WHERE s."termsId" IN (SELECT "termsId" FROM changed)
    GROUP BY s."termsId" HAVING SUM(s."shareBps") > 10000
  ) THEN
    RAISE EXCEPTION 'shares exceed 10000 bps' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER "MonthlyExpenseTermsShare_total_insert" AFTER INSERT ON "MonthlyExpenseTermsShare"
  REFERENCING NEW TABLE AS changed FOR EACH STATEMENT EXECUTE FUNCTION public.check_share_total();
CREATE TRIGGER "MonthlyExpenseTermsShare_total_update" AFTER UPDATE ON "MonthlyExpenseTermsShare"
  REFERENCING NEW TABLE AS changed FOR EACH STATEMENT EXECUTE FUNCTION public.check_share_total();

-- Allocations of a paid occurrence are an immutable snapshot; only the connection link may change.
-- The rule binds the application role; account deletion cascades run as the table owner.
CREATE FUNCTION public.protect_paid_allocation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_user <> 'gastapp_app' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF EXISTS (
    SELECT 1 FROM public."MonthlyExpenseOccurrence" o WHERE o."id" = OLD."occurrenceId" AND o."status" = 'PAID'
  ) AND (
    TG_OP = 'DELETE' OR NEW."shareBps" <> OLD."shareBps" OR NEW."amountMinor" <> OLD."amountMinor"
    OR NEW."baseAmountMinor" <> OLD."baseAmountMinor" OR NEW."currency" <> OLD."currency"
    OR NEW."contactId" IS DISTINCT FROM OLD."contactId" OR NEW."expenseName" <> OLD."expenseName"
    OR NEW."period" <> OLD."period"
  ) THEN
    RAISE EXCEPTION 'allocations of paid occurrence % are immutable', OLD."occurrenceId" USING ERRCODE = 'check_violation';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER "OccurrenceAllocation_protect_paid" BEFORE UPDATE OR DELETE ON "OccurrenceAllocation"
  FOR EACH ROW EXECUTE FUNCTION public.protect_paid_allocation();

-- Every private table is scoped to the user set by withUser() for the current transaction.
DO $$
DECLARE
  name TEXT;
  owner_column TEXT;
BEGIN
  FOREACH name IN ARRAY ARRAY['UserPreferences', 'MonthlyExpenseSeries', 'MonthlyExpenseTerms',
    'MonthlyExpenseOccurrence', 'ExpensePayment', 'CoveragePeriod', 'AuditLog', 'IdempotencyKey',
    'Contact', 'MonthlyExpenseTermsShare', 'OccurrenceAllocation']
  LOOP
    owner_column := CASE WHEN name = 'UserPreferences' THEN 'userId' ELSE 'ownerId' END;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO gastapp_app
         USING (%I = NULLIF(current_setting(''gastapp.user_id'', true), ''''))
         WITH CHECK (%I = NULLIF(current_setting(''gastapp.user_id'', true), ''''))',
      name || '_owner', name, owner_column, owner_column);
  END LOOP;
END;
$$;

-- A connected counterpart reads only its own allocation rows, including the history before the
-- invitation was accepted, while the connection stays accepted. Expense, month and other
-- participants stay private.
CREATE POLICY "OccurrenceAllocation_counterpart" ON public."OccurrenceAllocation" FOR SELECT TO gastapp_app
  USING (
    "ownerId" <> NULLIF(current_setting('gastapp.user_id', true), '')
    AND EXISTS (
      SELECT 1 FROM public."UserConnection" c
      WHERE c."id" = "connectionId" AND c."status" = 'ACCEPTED'
        AND NULLIF(current_setting('gastapp.user_id', true), '') IN (c."inviterId", c."inviteeId")
    )
  );

-- Connections are visible to both parties; a pending invitation also to the invited email.
ALTER TABLE public."UserConnection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."UserConnection" FORCE ROW LEVEL SECURITY;
CREATE POLICY "UserConnection_parties" ON public."UserConnection" FOR SELECT TO gastapp_app
  USING (
    NULLIF(current_setting('gastapp.user_id', true), '') IN ("inviterId", "inviteeId")
    OR ("status" = 'PENDING' AND "inviteeEmail" = NULLIF(current_setting('gastapp.user_email', true), ''))
  );
CREATE POLICY "UserConnection_invite" ON public."UserConnection" FOR INSERT TO gastapp_app
  WITH CHECK ("inviterId" = NULLIF(current_setting('gastapp.user_id', true), '') AND "status" = 'PENDING');
CREATE POLICY "UserConnection_respond" ON public."UserConnection" FOR UPDATE TO gastapp_app
  USING (
    NULLIF(current_setting('gastapp.user_id', true), '') IN ("inviterId", "inviteeId")
    OR ("status" = 'PENDING' AND "inviteeEmail" = NULLIF(current_setting('gastapp.user_email', true), ''))
  )
  WITH CHECK (NULLIF(current_setting('gastapp.user_id', true), '') IN ("inviterId", "inviteeId"));

-- Personal debts: receivables with a fixed principal, partial payments and explicit adjustments.
ALTER TABLE "PersonalDebt"
  ADD CONSTRAINT "PersonalDebt_principal_check" CHECK ("principalMinor" > 0),
  ADD CONSTRAINT "PersonalDebt_description_check" CHECK (length(btrim("description")) > 0),
  ADD CONSTRAINT "PersonalDebt_due_check" CHECK ("dueOn" IS NULL OR "dueOn" >= "lentOn"),
  ADD CONSTRAINT "PersonalDebt_cancel_check" CHECK (
    ("cancelledAt" IS NULL) = ("cancelReason" IS NULL) AND ("cancelReason" IS NULL OR length(btrim("cancelReason")) > 0)
  );
ALTER TABLE "PersonalDebtPayment"
  ADD CONSTRAINT "PersonalDebtPayment_amount_check" CHECK ("amountMinor" > 0);
ALTER TABLE "PersonalDebtAdjustment"
  ADD CONSTRAINT "PersonalDebtAdjustment_amount_check" CHECK ("amountMinor" > 0),
  ADD CONSTRAINT "PersonalDebtAdjustment_reason_check" CHECK (length(btrim("reason")) > 0);

-- A debt balance never goes below zero: no overpayment nor forgiving more than is owed.
CREATE FUNCTION public.check_debt_balance() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  balance BIGINT;
BEGIN
  SELECT d."principalMinor"
    + COALESCE((SELECT SUM(a."amountMinor") FROM public."PersonalDebtAdjustment" a
                WHERE a."debtId" = d."id" AND a."kind" = 'INCREASE'), 0)
    - COALESCE((SELECT SUM(a."amountMinor") FROM public."PersonalDebtAdjustment" a
                WHERE a."debtId" = d."id" AND a."kind" = 'FORGIVE'), 0)
    - COALESCE((SELECT SUM(p."amountMinor") FROM public."PersonalDebtPayment" p
                WHERE p."debtId" = d."id" AND p."revertedAt" IS NULL), 0)
  INTO balance
  FROM public."PersonalDebt" d WHERE d."id" = NEW."debtId";
  IF balance < 0 THEN
    RAISE EXCEPTION 'debt % balance would be negative', NEW."debtId" USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER "PersonalDebtPayment_balance" AFTER INSERT OR UPDATE ON "PersonalDebtPayment"
  FOR EACH ROW EXECUTE FUNCTION public.check_debt_balance();
CREATE TRIGGER "PersonalDebtAdjustment_balance" AFTER INSERT ON "PersonalDebtAdjustment"
  FOR EACH ROW EXECUTE FUNCTION public.check_debt_balance();

-- Adjustments are append-only; a payment can only be marked as reverted.
GRANT SELECT, INSERT, UPDATE ON public."PersonalDebt" TO gastapp_app;
GRANT SELECT, INSERT ON public."PersonalDebtPayment", public."PersonalDebtAdjustment" TO gastapp_app;
GRANT UPDATE ("revertedAt") ON public."PersonalDebtPayment" TO gastapp_app;

DO $$
DECLARE
  name TEXT;
BEGIN
  FOREACH name IN ARRAY ARRAY['PersonalDebt', 'PersonalDebtPayment', 'PersonalDebtAdjustment']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO gastapp_app
         USING ("ownerId" = NULLIF(current_setting(''gastapp.user_id'', true), ''''))
         WITH CHECK ("ownerId" = NULLIF(current_setting(''gastapp.user_id'', true), ''''))',
      name || '_owner', name);
  END LOOP;
END;
$$;
