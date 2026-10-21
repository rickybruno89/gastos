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
