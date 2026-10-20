-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "auth";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('ARS', 'USD');

-- CreateEnum
CREATE TYPE "OccurrenceStatus" AS ENUM ('PLANNED', 'PAID');

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

    CONSTRAINT "ExpensePayment_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "MonthlyExpenseOccurrence_ownerId_period_idx" ON "MonthlyExpenseOccurrence"("ownerId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyExpenseOccurrence_seriesId_period_key" ON "MonthlyExpenseOccurrence"("seriesId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyExpenseOccurrence_id_ownerId_key" ON "MonthlyExpenseOccurrence"("id", "ownerId");

-- CreateIndex
CREATE INDEX "ExpensePayment_occurrenceId_idx" ON "ExpensePayment"("occurrenceId");

-- CreateIndex
CREATE INDEX "AuditLog_ownerId_entityType_entityId_idx" ON "AuditLog"("ownerId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "IdempotencyKey_createdAt_idx" ON "IdempotencyKey"("createdAt");

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
ALTER TABLE "ExpensePayment" ADD CONSTRAINT "ExpensePayment_occurrenceId_ownerId_fkey" FOREIGN KEY ("occurrenceId", "ownerId") REFERENCES "MonthlyExpenseOccurrence"("id", "ownerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "auth"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdempotencyKey" ADD CONSTRAINT "IdempotencyKey_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "auth"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Domain constraints: periods are first-of-month dates and money is positive minor units.
ALTER TABLE "MonthlyExpenseSeries"
  ADD CONSTRAINT "MonthlyExpenseSeries_name_check" CHECK (length(btrim("name")) > 0),
  ADD CONSTRAINT "MonthlyExpenseSeries_interval_check" CHECK ("intervalMonths" IN (1, 2)),
  ADD CONSTRAINT "MonthlyExpenseSeries_firstPeriod_check" CHECK (EXTRACT(DAY FROM "firstPeriod") = 1);
ALTER TABLE "MonthlyExpenseTerms"
  ADD CONSTRAINT "MonthlyExpenseTerms_amount_check" CHECK ("amountMinor" > 0),
  ADD CONSTRAINT "MonthlyExpenseTerms_dueDay_check" CHECK ("dueDay" BETWEEN 1 AND 31),
  ADD CONSTRAINT "MonthlyExpenseTerms_period_check" CHECK (EXTRACT(DAY FROM "effectivePeriod") = 1);
ALTER TABLE "MonthlyExpenseOccurrence"
  ADD CONSTRAINT "MonthlyExpenseOccurrence_amount_check" CHECK ("amountMinor" > 0),
  ADD CONSTRAINT "MonthlyExpenseOccurrence_period_check" CHECK (EXTRACT(DAY FROM "period") = 1),
  ADD CONSTRAINT "MonthlyExpenseOccurrence_dueDate_check" CHECK (date_trunc('month', "dueDate") = "period");
ALTER TABLE "ExpensePayment"
  ADD CONSTRAINT "ExpensePayment_amount_check" CHECK ("amountMinor" > 0);

-- An occurrence has at most one active payment; undo keeps the reverted row for audit.
CREATE UNIQUE INDEX "ExpensePayment_active_key" ON "ExpensePayment"("occurrenceId") WHERE "revertedAt" IS NULL;

-- Paid occurrences are immutable until their payment is undone.
CREATE FUNCTION public.protect_paid_occurrence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."status" = 'PAID' AND NEW."status" = 'PAID' AND (
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
  public."MonthlyExpenseOccurrence", public."ExpensePayment", public."IdempotencyKey" TO gastapp_app;
-- The audit log is append-only for the application.
GRANT SELECT, INSERT ON public."AuditLog" TO gastapp_app;

-- Every private table is scoped to the user set by withUser() for the current transaction.
DO $$
DECLARE
  name TEXT;
  owner_column TEXT;
BEGIN
  FOREACH name IN ARRAY ARRAY['UserPreferences', 'MonthlyExpenseSeries', 'MonthlyExpenseTerms',
    'MonthlyExpenseOccurrence', 'ExpensePayment', 'AuditLog', 'IdempotencyKey']
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
