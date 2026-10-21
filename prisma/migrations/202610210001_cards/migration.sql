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
