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

-- CreateEnum
CREATE TYPE "CardStatementStatus" AS ENUM ('DRAFT', 'RECONCILED', 'PAID');

-- CreateTable
CREATE TABLE "CreditCard" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "lastFour" VARCHAR(4),
    "closingDay" SMALLINT NOT NULL,
    "dueDay" SMALLINT NOT NULL,
    "archivedAt" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CreditCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardPurchase" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "cardId" UUID NOT NULL,
    "description" VARCHAR(120) NOT NULL,
    "occurredOn" DATE NOT NULL,
    "currency" "Currency" NOT NULL,
    "originalTotalMinor" BIGINT NOT NULL,
    "installments" SMALLINT NOT NULL,
    "firstPeriod" DATE NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardRecurringSeries" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "cardId" UUID NOT NULL,
    "description" VARCHAR(120) NOT NULL,
    "currency" "Currency" NOT NULL,
    "firstPeriod" DATE NOT NULL,
    "endPeriod" DATE,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardRecurringSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardRecurringTerms" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "seriesId" UUID NOT NULL,
    "effectivePeriod" DATE NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "shares" JSONB NOT NULL,

    CONSTRAINT "CardRecurringTerms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardStatement" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "cardId" UUID NOT NULL,
    "period" DATE NOT NULL,
    "closingDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "status" "CardStatementStatus" NOT NULL DEFAULT 'DRAFT',
    "bankArsMinor" BIGINT,
    "bankUsdMinor" BIGINT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CardStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardCharge" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "statementId" UUID NOT NULL,
    "purchaseId" UUID,
    "recurringId" UUID,
    "expectedPeriod" DATE NOT NULL,
    "installmentNo" SMALLINT,
    "description" VARCHAR(120) NOT NULL,
    "occurredOn" DATE NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" "Currency" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatementLine" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "statementId" UUID NOT NULL,
    "chargeId" UUID,
    "description" VARCHAR(120) NOT NULL,
    "postedOn" DATE NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" "Currency" NOT NULL,
    "ignoreReason" VARCHAR(200),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatementLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardAllocation" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "chargeId" UUID NOT NULL,
    "contactId" UUID,
    "connectionId" UUID,
    "contactName" VARCHAR(60),
    "period" DATE NOT NULL,
    "expenseName" VARCHAR(120) NOT NULL,
    "baseAmountMinor" BIGINT NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "shareBps" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,

    CONSTRAINT "CardAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardChargeTransfer" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "chargeId" UUID NOT NULL,
    "fromStatementId" UUID NOT NULL,
    "toStatementId" UUID NOT NULL,
    "reason" VARCHAR(200) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardChargeTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardPayment" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "statementId" UUID NOT NULL,
    "paidOn" DATE NOT NULL,
    "channel" VARCHAR(40),
    "notes" VARCHAR(500),
    "arsMinor" BIGINT NOT NULL,
    "usdMinor" BIGINT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revertedAt" TIMESTAMPTZ(3),

    CONSTRAINT "CardPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreditCard_ownerId_idx" ON "CreditCard"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditCard_id_ownerId_key" ON "CreditCard"("id", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "CardPurchase_id_ownerId_key" ON "CardPurchase"("id", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "CardRecurringSeries_id_ownerId_key" ON "CardRecurringSeries"("id", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "CardRecurringTerms_seriesId_effectivePeriod_key" ON "CardRecurringTerms"("seriesId", "effectivePeriod");

-- CreateIndex
CREATE INDEX "CardStatement_ownerId_period_idx" ON "CardStatement"("ownerId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "CardStatement_cardId_period_key" ON "CardStatement"("cardId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "CardStatement_id_ownerId_key" ON "CardStatement"("id", "ownerId");

-- CreateIndex
CREATE INDEX "CardCharge_statementId_idx" ON "CardCharge"("statementId");

-- CreateIndex
CREATE UNIQUE INDEX "CardCharge_id_ownerId_key" ON "CardCharge"("id", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "CardCharge_purchaseId_installmentNo_key" ON "CardCharge"("purchaseId", "installmentNo");

-- CreateIndex
CREATE UNIQUE INDEX "CardCharge_recurringId_expectedPeriod_key" ON "CardCharge"("recurringId", "expectedPeriod");

-- CreateIndex
CREATE UNIQUE INDEX "StatementLine_chargeId_key" ON "StatementLine"("chargeId");

-- CreateIndex
CREATE INDEX "StatementLine_statementId_idx" ON "StatementLine"("statementId");

-- CreateIndex
CREATE UNIQUE INDEX "StatementLine_chargeId_ownerId_key" ON "StatementLine"("chargeId", "ownerId");

-- CreateIndex
CREATE INDEX "CardAllocation_ownerId_period_idx" ON "CardAllocation"("ownerId", "period");

-- CreateIndex
CREATE INDEX "CardAllocation_connectionId_period_idx" ON "CardAllocation"("connectionId", "period");

-- CreateIndex
CREATE INDEX "CardPayment_statementId_idx" ON "CardPayment"("statementId");

-- AddForeignKey
ALTER TABLE "CreditCard" ADD CONSTRAINT "CreditCard_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "auth"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardPurchase" ADD CONSTRAINT "CardPurchase_cardId_ownerId_fkey" FOREIGN KEY ("cardId", "ownerId") REFERENCES "CreditCard"("id", "ownerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardRecurringSeries" ADD CONSTRAINT "CardRecurringSeries_cardId_ownerId_fkey" FOREIGN KEY ("cardId", "ownerId") REFERENCES "CreditCard"("id", "ownerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardRecurringTerms" ADD CONSTRAINT "CardRecurringTerms_seriesId_ownerId_fkey" FOREIGN KEY ("seriesId", "ownerId") REFERENCES "CardRecurringSeries"("id", "ownerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardStatement" ADD CONSTRAINT "CardStatement_cardId_ownerId_fkey" FOREIGN KEY ("cardId", "ownerId") REFERENCES "CreditCard"("id", "ownerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardCharge" ADD CONSTRAINT "CardCharge_statementId_ownerId_fkey" FOREIGN KEY ("statementId", "ownerId") REFERENCES "CardStatement"("id", "ownerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardCharge" ADD CONSTRAINT "CardCharge_purchaseId_ownerId_fkey" FOREIGN KEY ("purchaseId", "ownerId") REFERENCES "CardPurchase"("id", "ownerId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CardCharge" ADD CONSTRAINT "CardCharge_recurringId_ownerId_fkey" FOREIGN KEY ("recurringId", "ownerId") REFERENCES "CardRecurringSeries"("id", "ownerId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "StatementLine" ADD CONSTRAINT "StatementLine_statementId_ownerId_fkey" FOREIGN KEY ("statementId", "ownerId") REFERENCES "CardStatement"("id", "ownerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatementLine" ADD CONSTRAINT "StatementLine_chargeId_ownerId_fkey" FOREIGN KEY ("chargeId", "ownerId") REFERENCES "CardCharge"("id", "ownerId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CardAllocation" ADD CONSTRAINT "CardAllocation_chargeId_ownerId_fkey" FOREIGN KEY ("chargeId", "ownerId") REFERENCES "CardCharge"("id", "ownerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardAllocation" ADD CONSTRAINT "CardAllocation_contactId_ownerId_fkey" FOREIGN KEY ("contactId", "ownerId") REFERENCES "Contact"("id", "ownerId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CardAllocation" ADD CONSTRAINT "CardAllocation_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "UserConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardChargeTransfer" ADD CONSTRAINT "CardChargeTransfer_chargeId_ownerId_fkey" FOREIGN KEY ("chargeId", "ownerId") REFERENCES "CardCharge"("id", "ownerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardChargeTransfer" ADD CONSTRAINT "CardChargeTransfer_fromStatementId_ownerId_fkey" FOREIGN KEY ("fromStatementId", "ownerId") REFERENCES "CardStatement"("id", "ownerId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CardChargeTransfer" ADD CONSTRAINT "CardChargeTransfer_toStatementId_ownerId_fkey" FOREIGN KEY ("toStatementId", "ownerId") REFERENCES "CardStatement"("id", "ownerId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CardPayment" ADD CONSTRAINT "CardPayment_statementId_ownerId_fkey" FOREIGN KEY ("statementId", "ownerId") REFERENCES "CardStatement"("id", "ownerId") ON DELETE CASCADE ON UPDATE CASCADE;


-- Runtime grants and RLS: the owner always comes from the authenticated transaction.
DO $$ DECLARE name TEXT; BEGIN
  FOREACH name IN ARRAY ARRAY['CreditCard','CardPurchase','CardRecurringSeries','CardRecurringTerms','CardStatement','CardCharge','StatementLine','CardAllocation','CardChargeTransfer','CardPayment'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO gastapp_app USING ("ownerId" = NULLIF(current_setting(''gastapp.user_id'',true),'''')) WITH CHECK ("ownerId" = NULLIF(current_setting(''gastapp.user_id'',true),''''))',name||'_owner',name);
  END LOOP;
END $$;
GRANT SELECT,INSERT,UPDATE ON public."CreditCard",public."CardRecurringSeries",public."CardRecurringTerms",public."CardStatement" TO gastapp_app;
GRANT SELECT,INSERT ON public."CardPurchase",public."CardChargeTransfer",public."CardPayment" TO gastapp_app;
GRANT UPDATE ("revertedAt") ON public."CardPayment" TO gastapp_app;
GRANT SELECT,INSERT,UPDATE,DELETE ON public."CardCharge",public."StatementLine",public."CardAllocation" TO gastapp_app;
CREATE POLICY "CardAllocation_counterpart" ON public."CardAllocation" FOR SELECT TO gastapp_app USING (
 "ownerId" <> NULLIF(current_setting('gastapp.user_id',true),'') AND EXISTS (
 SELECT 1 FROM public."UserConnection" c WHERE c.id="connectionId" AND c.status='ACCEPTED'
 AND NULLIF(current_setting('gastapp.user_id',true),'') IN (c."inviterId",c."inviteeId")));
ALTER TABLE "CreditCard" ADD CONSTRAINT "CreditCard_days" CHECK ("closingDay" BETWEEN 1 AND 31 AND "dueDay" BETWEEN 1 AND 31), ADD CONSTRAINT "CreditCard_name" CHECK(length(btrim(name))>0);
ALTER TABLE "CardStatement" ADD CONSTRAINT "CardStatement_dates" CHECK(EXTRACT(DAY FROM period)=1 AND "dueDate">="closingDate");
ALTER TABLE "CardPurchase" ADD CONSTRAINT "CardPurchase_money" CHECK("originalTotalMinor">=installments AND installments BETWEEN 1 AND 120 AND EXTRACT(DAY FROM "firstPeriod")=1);
ALTER TABLE "CardRecurringSeries" ADD CONSTRAINT "CardRecurringSeries_dates" CHECK(EXTRACT(DAY FROM "firstPeriod")=1 AND ("endPeriod" IS NULL OR ("endPeriod">="firstPeriod" AND EXTRACT(DAY FROM "endPeriod")=1)));
ALTER TABLE "CardRecurringTerms" ADD CONSTRAINT "CardRecurringTerms_money" CHECK("amountMinor">0 AND EXTRACT(DAY FROM "effectivePeriod")=1);
ALTER TABLE "CardCharge" ADD CONSTRAINT "CardCharge_money" CHECK("amountMinor">0), ADD CONSTRAINT "CardCharge_origin" CHECK(NOT ("purchaseId" IS NOT NULL AND "recurringId" IS NOT NULL) AND (("purchaseId" IS NOT NULL)=("installmentNo" IS NOT NULL)) AND ("installmentNo" IS NULL OR "installmentNo">0) AND EXTRACT(DAY FROM "expectedPeriod")=1);
ALTER TABLE "StatementLine" ADD CONSTRAINT "StatementLine_resolution" CHECK("amountMinor"<>0 AND NOT("chargeId" IS NOT NULL AND "ignoreReason" IS NOT NULL) AND ("ignoreReason" IS NULL OR length(btrim("ignoreReason"))>0));
ALTER TABLE "CardAllocation" ADD CONSTRAINT "CardAllocation_values" CHECK("amountMinor">=0 AND "baseAmountMinor">0 AND "shareBps" BETWEEN 0 AND 10000 AND EXTRACT(DAY FROM period)=1);
CREATE UNIQUE INDEX "CardAllocation_owner_unique" ON "CardAllocation"("chargeId") WHERE "contactId" IS NULL;
CREATE UNIQUE INDEX "CardAllocation_contact_unique" ON "CardAllocation"("chargeId","contactId") WHERE "contactId" IS NOT NULL;
CREATE UNIQUE INDEX "CardPayment_active" ON "CardPayment"("statementId") WHERE "revertedAt" IS NULL;
ALTER TABLE "CardPayment" ADD CONSTRAINT "CardPayment_values" CHECK("arsMinor">=0 AND "usdMinor">=0);
ALTER TABLE "CardChargeTransfer" ADD CONSTRAINT "CardChargeTransfer_reason" CHECK(length(btrim(reason))>0 AND "fromStatementId"<>"toStatementId");

CREATE FUNCTION public.protect_card_child() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE sid UUID; old_sid UUID; BEGIN
  IF current_user<>'gastapp_app' THEN RETURN COALESCE(NEW,OLD); END IF;
  IF TG_TABLE_NAME='CardAllocation' THEN
    IF TG_OP='UPDATE' AND (to_jsonb(NEW)-'connectionId')=(to_jsonb(OLD)-'connectionId') THEN RETURN NEW; END IF;
    SELECT "statementId" INTO sid FROM public."CardCharge" WHERE id=COALESCE(NEW."chargeId",OLD."chargeId");
  ELSE
    sid:=COALESCE(NEW."statementId",OLD."statementId");
    IF TG_OP='UPDATE' THEN old_sid:=OLD."statementId"; END IF;
  END IF;
  IF EXISTS(SELECT 1 FROM public."CardStatement" WHERE id IN(sid,old_sid) AND status<>'DRAFT') THEN
    RAISE EXCEPTION 'reopen the statement before editing its charges, lines or allocations' USING ERRCODE='check_violation';
  END IF;
  IF TG_TABLE_NAME='CardCharge' AND TG_OP='UPDATE' THEN
    IF NEW."expectedPeriod"<>OLD."expectedPeriod" OR NEW."occurredOn"<>OLD."occurredOn" OR NEW.currency<>OLD.currency OR NEW."purchaseId" IS DISTINCT FROM OLD."purchaseId" OR NEW."recurringId" IS DISTINCT FROM OLD."recurringId" OR NEW."installmentNo" IS DISTINCT FROM OLD."installmentNo" THEN
      RAISE EXCEPTION 'the origin of an expected charge is immutable' USING ERRCODE='check_violation';
    END IF;
    IF EXISTS(SELECT 1 FROM public."StatementLine" WHERE "chargeId"=OLD.id) THEN RAISE EXCEPTION 'unmatch the charge before editing it' USING ERRCODE='check_violation'; END IF;
  END IF;
  RETURN COALESCE(NEW,OLD);
END $$;
CREATE TRIGGER "CardCharge_protect" BEFORE INSERT OR UPDATE OR DELETE ON "CardCharge" FOR EACH ROW EXECUTE FUNCTION public.protect_card_child();
CREATE TRIGGER "StatementLine_protect" BEFORE INSERT OR UPDATE OR DELETE ON "StatementLine" FOR EACH ROW EXECUTE FUNCTION public.protect_card_child();
CREATE TRIGGER "CardAllocation_protect" BEFORE INSERT OR UPDATE OR DELETE ON "CardAllocation" FOR EACH ROW EXECUTE FUNCTION public.protect_card_child();
CREATE FUNCTION public.check_card_match() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF NEW."postedOn">(SELECT "closingDate" FROM public."CardStatement" WHERE id=NEW."statementId") THEN RAISE EXCEPTION 'posting after closing date' USING ERRCODE='check_violation'; END IF;
  IF NEW."chargeId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public."CardCharge" c WHERE c.id=NEW."chargeId" AND c."statementId"=NEW."statementId" AND c.currency=NEW.currency AND c."amountMinor"=NEW."amountMinor") THEN RAISE EXCEPTION 'statement match must agree with the charge' USING ERRCODE='check_violation'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "StatementLine_match" BEFORE INSERT OR UPDATE ON "StatementLine" FOR EACH ROW EXECUTE FUNCTION public.check_card_match();
CREATE FUNCTION public.check_card_allocation_total() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF EXISTS(SELECT a."chargeId" FROM public."CardAllocation" a JOIN public."CardCharge" c ON c.id=a."chargeId" WHERE a."chargeId" IN(SELECT "chargeId" FROM changed) GROUP BY a."chargeId",c."amountMinor",c.currency HAVING SUM(a."shareBps")<>10000 OR SUM(a."amountMinor")<>c."amountMinor" OR BOOL_OR(a.currency<>c.currency OR a."baseAmountMinor"<>c."amountMinor")) THEN RAISE EXCEPTION 'invalid card allocation total' USING ERRCODE='check_violation'; END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER "CardAllocation_total_insert" AFTER INSERT ON "CardAllocation" REFERENCING NEW TABLE AS changed FOR EACH STATEMENT EXECUTE FUNCTION public.check_card_allocation_total();
CREATE TRIGGER "CardAllocation_total_update" AFTER UPDATE ON "CardAllocation" REFERENCING NEW TABLE AS changed FOR EACH STATEMENT EXECUTE FUNCTION public.check_card_allocation_total();
CREATE TRIGGER "CardAllocation_total_delete" AFTER DELETE ON "CardAllocation" REFERENCING OLD TABLE AS changed FOR EACH STATEMENT EXECUTE FUNCTION public.check_card_allocation_total();
CREATE FUNCTION public.protect_card_statement() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF NEW.status<>OLD.status AND NOT ((OLD.status='DRAFT' AND NEW.status='RECONCILED') OR (OLD.status='RECONCILED' AND NEW.status IN('DRAFT','PAID')) OR (OLD.status='PAID' AND NEW.status='RECONCILED')) THEN RAISE EXCEPTION 'invalid statement transition' USING ERRCODE='check_violation'; END IF;
  IF OLD.status<>'DRAFT' AND (NEW."closingDate"<>OLD."closingDate" OR NEW."dueDate"<>OLD."dueDate" OR NEW."bankArsMinor" IS DISTINCT FROM OLD."bankArsMinor" OR NEW."bankUsdMinor" IS DISTINCT FROM OLD."bankUsdMinor" OR NEW."cardId"<>OLD."cardId" OR NEW.period<>OLD.period) THEN RAISE EXCEPTION 'resolved statement is immutable' USING ERRCODE='check_violation'; END IF;
  IF NEW.status='RECONCILED' AND OLD.status='DRAFT' AND (EXISTS(SELECT 1 FROM public."CardCharge" c WHERE c."statementId"=NEW.id AND NOT EXISTS(SELECT 1 FROM public."StatementLine" l WHERE l."chargeId"=c.id)) OR EXISTS(SELECT 1 FROM public."StatementLine" WHERE "statementId"=NEW.id AND "chargeId" IS NULL AND "ignoreReason" IS NULL)) THEN RAISE EXCEPTION 'unresolved statement' USING ERRCODE='check_violation'; END IF;
  IF NEW.status='PAID' AND NOT EXISTS(SELECT 1 FROM public."CardPayment" WHERE "statementId"=NEW.id AND "revertedAt" IS NULL) THEN RAISE EXCEPTION 'paid statement requires its payment' USING ERRCODE='check_violation'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "CardStatement_protect" BEFORE UPDATE ON "CardStatement" FOR EACH ROW EXECUTE FUNCTION public.protect_card_statement();
CREATE FUNCTION public.check_card_payment() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM public."CardStatement" s WHERE s.id=NEW."statementId" AND s.status='RECONCILED') OR NEW."arsMinor"<>(SELECT COALESCE(SUM("amountMinor"),0) FROM public."CardCharge" WHERE "statementId"=NEW."statementId" AND currency='ARS') OR NEW."usdMinor"<>(SELECT COALESCE(SUM("amountMinor"),0) FROM public."CardCharge" WHERE "statementId"=NEW."statementId" AND currency='USD') THEN RAISE EXCEPTION 'payment must cover the reconciled statement' USING ERRCODE='check_violation'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "CardPayment_check" BEFORE INSERT ON "CardPayment" FOR EACH ROW EXECUTE FUNCTION public.check_card_payment();

-- Narrow read projection for unmaterialized incoming recurring shares. The app role
-- cannot read the owner's series/terms/other participants. The function returns only
-- the authenticated counterpart's amount, never card/statement metadata.
DO $$ DECLARE name TEXT; BEGIN
 FOREACH name IN ARRAY ARRAY['MonthlyExpenseSeries','MonthlyExpenseTerms','MonthlyExpenseTermsShare','MonthlyExpenseOccurrence','CoveragePeriod','Contact','UserConnection','CardRecurringSeries','CardRecurringTerms','CardCharge'] LOOP
  EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO %I USING(true)',name||'_projection_owner',name,current_user);
 END LOOP;
END $$;
CREATE FUNCTION public.incoming_shared_forecast(requested_period DATE)
RETURNS TABLE("ownerId" TEXT,"connectionId" UUID,"expenseName" TEXT,"baseAmountMinor" BIGINT,"amountMinor" BIGINT,"shareBps" INT,currency TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 WITH identity AS (SELECT NULLIF(current_setting('gastapp.user_id',true),'') AS uid),
 sources AS (
  SELECT 'monthly:'||s.id AS key,s."ownerId",s.name::TEXT AS description,s.currency::TEXT AS currency,t."amountMinor" AS amount,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('contactId',sh."contactId",'shareBps',sh."shareBps")) FROM public."MonthlyExpenseTermsShare" sh WHERE sh."termsId"=t.id),'[]'::jsonb) AS shares
  FROM public."MonthlyExpenseSeries" s
  JOIN LATERAL(SELECT * FROM public."MonthlyExpenseTerms" t WHERE t."seriesId"=s.id AND t."effectivePeriod"<=requested_period ORDER BY t."effectivePeriod" DESC LIMIT 1)t ON true
  CROSS JOIN identity i
  WHERE i.uid IS NOT NULL AND s."ownerId"<>i.uid AND EXTRACT(DAY FROM requested_period)=1
    AND s."firstPeriod"<=requested_period AND (s."endPeriod" IS NULL OR s."endPeriod">=requested_period)
    AND MOD((EXTRACT(YEAR FROM requested_period)::INT-EXTRACT(YEAR FROM s."firstPeriod")::INT)*12+EXTRACT(MONTH FROM requested_period)::INT-EXTRACT(MONTH FROM s."firstPeriod")::INT,s."intervalMonths")=0
    AND NOT EXISTS(SELECT 1 FROM public."MonthlyExpenseOccurrence" o WHERE o."seriesId"=s.id AND o.period=requested_period)
    AND NOT EXISTS(SELECT 1 FROM public."CoveragePeriod" c WHERE c."seriesId"=s.id AND c."revertedAt" IS NULL AND c."fromPeriod"<requested_period AND c."toPeriod">=requested_period)
  UNION ALL
  SELECT 'recurring:'||s.id,s."ownerId",s.description::TEXT,s.currency::TEXT,t."amountMinor",t.shares::jsonb
  FROM public."CardRecurringSeries" s
  JOIN LATERAL(SELECT * FROM public."CardRecurringTerms" t WHERE t."seriesId"=s.id AND t."effectivePeriod"<=requested_period ORDER BY t."effectivePeriod" DESC LIMIT 1)t ON true
  CROSS JOIN identity i
  WHERE i.uid IS NOT NULL AND s."ownerId"<>i.uid AND EXTRACT(DAY FROM requested_period)=1
    AND s."firstPeriod"<=requested_period AND (s."endPeriod" IS NULL OR s."endPeriod">=requested_period)
    AND NOT EXISTS(SELECT 1 FROM public."CardCharge" c WHERE c."recurringId"=s.id AND c."expectedPeriod"=requested_period)
 ),
 participants AS (
  SELECT s.*, (p->>'contactId')::UUID AS contact_id,(p->>'shareBps')::INT AS bps,
     FLOOR(s.amount::NUMERIC*(p->>'shareBps')::BIGINT/10000) AS floor_amount,
     s.amount::NUMERIC*(p->>'shareBps')::BIGINT%10000 AS remainder
  FROM sources s
  CROSS JOIN LATERAL jsonb_array_elements(s.shares||jsonb_build_array(jsonb_build_object('contactId',NULL,'shareBps',10000-COALESCE((SELECT SUM((sh->>'shareBps')::INT) FROM jsonb_array_elements(s.shares)sh),0))))p
 ), ranked AS (
  SELECT p.*,ROW_NUMBER()OVER(PARTITION BY key ORDER BY remainder DESC,COALESCE(contact_id::TEXT,'owner') COLLATE "C" ASC) AS rank,
   amount-SUM(floor_amount)OVER(PARTITION BY key) AS residue FROM participants p
 )
 SELECT p."ownerId",c."connectionId",p.description,p.amount,
   (p.floor_amount+CASE WHEN p.rank<=p.residue THEN 1 ELSE 0 END)::BIGINT,p.bps,p.currency
 FROM ranked p JOIN public."Contact" c ON c.id=p.contact_id AND c."ownerId"=p."ownerId"
 JOIN public."UserConnection" connection ON connection.id=c."connectionId" AND connection.status='ACCEPTED'
 CROSS JOIN identity i
 WHERE i.uid IN(connection."inviterId",connection."inviteeId") AND p."ownerId" IN(connection."inviterId",connection."inviteeId");
$$;
REVOKE ALL ON FUNCTION public.incoming_shared_forecast(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.incoming_shared_forecast(DATE) TO gastapp_app;

-- AlterTable
ALTER TABLE "UserConnection" ADD COLUMN     "invitationTokenHash" CHAR(64);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "userId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "monthly" BOOLEAN NOT NULL DEFAULT true,
    "cards" BOOLEAN NOT NULL DEFAULT true,
    "debts" BOOLEAN NOT NULL DEFAULT true,
    "daysBefore" SMALLINT NOT NULL DEFAULT 3,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "NotificationJob" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "dedupeKey" VARCHAR(160) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(12) NOT NULL DEFAULT 'PENDING',
    "attempts" SMALLINT NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseToken" UUID,
    "leaseUntil" TIMESTAMPTZ(3),
    "lastError" VARCHAR(80),
    "sentAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationJob_dedupeKey_key" ON "NotificationJob"("dedupeKey");

-- CreateIndex
CREATE INDEX "NotificationJob_status_nextAttemptAt_idx" ON "NotificationJob"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "NotificationJob_ownerId_createdAt_idx" ON "NotificationJob"("ownerId", "createdAt");

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationJob" ADD CONSTRAINT "NotificationJob_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "auth"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_days" CHECK("daysBefore" BETWEEN 0 AND 14 AND version>0);
ALTER TABLE "NotificationJob" ADD CONSTRAINT "NotificationJob_values" CHECK(kind IN('INVITATION','REMINDER') AND status IN('PENDING','SENT','CANCELLED','DEAD') AND attempts BETWEEN 0 AND 5 AND (("leaseToken" IS NULL)=("leaseUntil" IS NULL)));
ALTER TABLE "NotificationPreference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationPreference" FORCE ROW LEVEL SECURITY;
ALTER TABLE "NotificationJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationJob" FORCE ROW LEVEL SECURITY;
CREATE POLICY "NotificationPreference_owner" ON "NotificationPreference" FOR ALL TO gastapp_app USING("userId"=NULLIF(current_setting('gastapp.user_id',true),'')) WITH CHECK("userId"=NULLIF(current_setting('gastapp.user_id',true),''));
CREATE POLICY "NotificationJob_owner" ON "NotificationJob" FOR ALL TO gastapp_app USING("ownerId"=NULLIF(current_setting('gastapp.user_id',true),'')) WITH CHECK("ownerId"=NULLIF(current_setting('gastapp.user_id',true),''));
GRANT SELECT,INSERT,UPDATE ON "NotificationPreference" TO gastapp_app;
GRANT SELECT,INSERT ON "NotificationJob" TO gastapp_app;
-- Worker separado, sin BYPASSRLS ni acceso a sesiones/credenciales Google.
GRANT USAGE ON SCHEMA public,auth TO gastapp_worker;
GRANT SELECT(id,email,"emailVerified") ON auth."user" TO gastapp_worker;
GRANT SELECT ON "UserPreferences","NotificationPreference" TO gastapp_worker;
CREATE POLICY "UserPreferences_worker" ON "UserPreferences" FOR SELECT TO gastapp_worker USING(true);
CREATE POLICY "NotificationPreference_worker" ON "NotificationPreference" FOR SELECT TO gastapp_worker USING(true);
GRANT SELECT,INSERT,UPDATE ON "NotificationJob" TO gastapp_worker;
CREATE POLICY "NotificationJob_worker" ON "NotificationJob" FOR ALL TO gastapp_worker USING(true) WITH CHECK(true);
GRANT SELECT(id,"inviterId","inviteeEmail",status,"expiresAt","invitationTokenHash") ON "UserConnection" TO gastapp_worker;
CREATE POLICY "UserConnection_worker" ON "UserConnection" FOR SELECT TO gastapp_worker USING(true);
GRANT SELECT,DELETE ON "IdempotencyKey" TO gastapp_worker;
CREATE POLICY "IdempotencyKey_worker_read" ON "IdempotencyKey" FOR SELECT TO gastapp_worker USING("createdAt"<now()-interval '30 days');
CREATE POLICY "IdempotencyKey_worker_clean" ON "IdempotencyKey" FOR DELETE TO gastapp_worker USING("createdAt"<now()-interval '30 days');

CREATE TYPE public."DebtDirection" AS ENUM ('RECEIVABLE', 'PAYABLE');
-- Las deudas existentes siguen siendo dinero que le deben al propietario.
ALTER TABLE public."PersonalDebt" ADD COLUMN "direction" public."DebtDirection" NOT NULL DEFAULT 'RECEIVABLE';
-- Cambiar el sentido de una deuda con movimientos alteraría su interpretación.
CREATE FUNCTION public.protect_debt_direction() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.direction <> OLD.direction THEN
    RAISE EXCEPTION 'debt direction is immutable' USING ERRCODE='check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "PersonalDebt_direction_immutable" BEFORE UPDATE ON public."PersonalDebt"
FOR EACH ROW EXECUTE FUNCTION public.protect_debt_direction();
