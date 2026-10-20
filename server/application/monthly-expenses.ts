import type { z } from "zod";
import type { Prisma } from "../generated/prisma/client";
import type {
  Month,
  Occurrence,
  changeOccurrenceSchema,
  createMonthlyExpenseSchema,
  payOccurrenceSchema,
} from "../../shared/contracts/expenses";
import {
  dueDateForPeriod,
  occursInPeriod,
  todayIn,
} from "../../shared/domain/periods";
import { HttpError } from "../http";
import { audit, type MutationContext } from "./mutations";

type Tx = Prisma.TransactionClient;

// Los períodos se guardan como DATE del primer día del mes, en UTC.
const periodDate = (period: string) => new Date(`${period}-01T00:00:00Z`);
const isoDate = (date: string) => new Date(`${date}T00:00:00Z`);
const toPeriod = (date: Date) => date.toISOString().slice(0, 7);
const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

const notFound = () =>
  new HttpError(404, "NOT_FOUND", "No encontramos ese gasto.");
const versionConflict = () =>
  new HttpError(
    409,
    "VERSION_CONFLICT",
    "El gasto cambió mientras lo editabas. Actualizá y volvé a intentar.",
  );
const paidLocked = () =>
  new HttpError(
    409,
    "OCCURRENCE_PAID",
    "Este gasto ya está pagado. Deshacé el pago para modificarlo.",
  );

async function timeZoneOf(tx: Tx, ownerId: string) {
  const preferences = await tx.userPreferences.upsert({
    where: { userId: ownerId },
    create: { userId: ownerId },
    update: {},
  });
  return preferences.timeZone;
}

async function termsAt(tx: Tx, seriesId: string, period: Date) {
  const terms = await tx.monthlyExpenseTerms.findFirst({
    where: { seriesId, effectivePeriod: { lte: period } },
    orderBy: { effectivePeriod: "desc" },
  });
  if (!terms) throw new Error(`Serie ${seriesId} sin condiciones vigentes.`);
  return terms;
}

const occurrenceInclude = {
  series: { select: { name: true } },
  payments: { where: { revertedAt: null }, take: 1 },
} satisfies Prisma.MonthlyExpenseOccurrenceInclude;
type OccurrenceRow = Prisma.MonthlyExpenseOccurrenceGetPayload<{
  include: typeof occurrenceInclude;
}>;

function toOccurrence(row: OccurrenceRow, dueDay: number): Occurrence {
  const payment = row.payments[0];
  return {
    id: row.id,
    seriesId: row.seriesId,
    name: row.series.name,
    period: toPeriod(row.period),
    dueDate: toIsoDate(row.dueDate),
    dueDay,
    amountMinor: row.amountMinor.toString(),
    currency: row.currency,
    status: row.status,
    version: row.version,
    payment: payment
      ? { paidOn: toIsoDate(payment.paidOn), channel: payment.channel }
      : null,
  };
}

async function loadOccurrence(tx: Tx, ownerId: string, id: string) {
  const row = await tx.monthlyExpenseOccurrence.findFirst({
    where: { id, ownerId },
    include: occurrenceInclude,
  });
  if (!row) throw notFound();
  const terms = await termsAt(tx, row.seriesId, row.period);
  return toOccurrence(row, terms.dueDay);
}

export async function createMonthlyExpense(
  context: MutationContext,
  input: z.infer<typeof createMonthlyExpenseSchema>,
) {
  const { tx, ownerId } = context;
  const firstPeriod = periodDate(input.firstPeriod);
  const series = await tx.monthlyExpenseSeries.create({
    data: {
      ownerId,
      name: input.name,
      currency: input.currency,
      firstPeriod,
      terms: {
        create: {
          effectivePeriod: firstPeriod,
          amountMinor: BigInt(input.amountMinor),
          dueDay: input.dueDay,
        },
      },
    },
  });
  await audit(context, {
    action: "monthly_expense.created",
    entityType: "MonthlyExpenseSeries",
    entityId: series.id,
    data: { ...input },
  });
  return {
    id: series.id,
    name: series.name,
    currency: series.currency,
    firstPeriod: toPeriod(series.firstPeriod),
    version: series.version,
  };
}

// Materializa on-demand: upsert idempotente por serie + período.
export async function getMonth(
  tx: Tx,
  ownerId: string,
  period: string,
): Promise<Month> {
  const date = periodDate(period);
  const series = await tx.monthlyExpenseSeries.findMany({
    where: { ownerId, firstPeriod: { lte: date } },
    include: {
      terms: {
        where: { effectivePeriod: { lte: date } },
        orderBy: { effectivePeriod: "desc" },
        take: 1,
      },
    },
  });
  const due = series.filter(
    (item) =>
      item.terms[0] &&
      occursInPeriod(
        period,
        toPeriod(item.firstPeriod),
        item.intervalMonths as 1 | 2,
      ),
  );
  const existing = new Set(
    (
      await tx.monthlyExpenseOccurrence.findMany({
        where: { ownerId, period: date },
        select: { seriesId: true },
      })
    ).map((row) => row.seriesId),
  );
  const missing = due.filter((item) => !existing.has(item.id));
  if (missing.length)
    await tx.monthlyExpenseOccurrence.createMany({
      data: missing.map((item) => ({
        ownerId,
        seriesId: item.id,
        period: date,
        dueDate: isoDate(dueDateForPeriod(period, item.terms[0].dueDay)),
        amountMinor: item.terms[0].amountMinor,
        currency: item.currency,
      })),
      skipDuplicates: true,
    });
  const dueDays = new Map(due.map((item) => [item.id, item.terms[0].dueDay]));
  const rows = await tx.monthlyExpenseOccurrence.findMany({
    where: { ownerId, period: date },
    include: occurrenceInclude,
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
  });
  const occurrences = rows.map((row) =>
    toOccurrence(row, dueDays.get(row.seriesId) ?? row.dueDate.getUTCDate()),
  );
  const totals = (["ARS", "USD"] as const)
    .map((currency) => {
      const inCurrency = rows.filter((row) => row.currency === currency);
      const sum = (status: "PLANNED" | "PAID") =>
        inCurrency
          .filter((row) => row.status === status)
          .reduce((total, row) => total + row.amountMinor, 0n)
          .toString();
      return inCurrency.length
        ? { currency, pendingMinor: sum("PLANNED"), paidMinor: sum("PAID") }
        : null;
    })
    .filter((total) => total !== null);
  return {
    period,
    today: todayIn(await timeZoneOf(tx, ownerId)),
    occurrences,
    totals,
  };
}

export async function changeOccurrence(
  context: MutationContext,
  id: string,
  input: z.infer<typeof changeOccurrenceSchema>,
) {
  const { tx, ownerId } = context;
  const current = await tx.monthlyExpenseOccurrence.findFirst({
    where: { id, ownerId },
  });
  if (!current) throw notFound();
  if (current.status === "PAID") throw paidLocked();
  if (current.version !== input.version) throw versionConflict();
  // Serializa los cambios de regla de una misma serie.
  await tx.$queryRaw`SELECT id FROM public."MonthlyExpenseSeries" WHERE id = ${current.seriesId}::uuid FOR UPDATE`;
  const amountMinor = input.amount ? BigInt(input.amount.amountMinor) : null;
  const rule = {
    ...(input.amount?.scope === "THIS_AND_FUTURE" && { amountMinor }),
    ...(input.dueDay && { dueDay: input.dueDay }),
  } as { amountMinor?: bigint; dueDay?: number };
  if (rule.amountMinor !== undefined || rule.dueDay !== undefined) {
    const terms = await termsAt(tx, current.seriesId, current.period);
    if (terms.effectivePeriod.getTime() === current.period.getTime())
      await tx.monthlyExpenseTerms.update({
        where: { id: terms.id },
        data: rule,
      });
    else
      await tx.monthlyExpenseTerms.create({
        data: {
          ownerId,
          seriesId: current.seriesId,
          effectivePeriod: current.period,
          amountMinor: rule.amountMinor ?? terms.amountMinor,
          dueDay: rule.dueDay ?? terms.dueDay,
        },
      });
    await tx.monthlyExpenseTerms.updateMany({
      where: {
        seriesId: current.seriesId,
        effectivePeriod: { gt: current.period },
      },
      data: rule,
    });
    // Los meses futuros ya consultados siguen la nueva regla; los pagados no cambian.
    const future = await tx.monthlyExpenseOccurrence.findMany({
      where: {
        seriesId: current.seriesId,
        period: { gt: current.period },
        status: "PLANNED",
      },
    });
    for (const row of future)
      await tx.monthlyExpenseOccurrence.update({
        where: { id: row.id },
        data: {
          ...(rule.amountMinor !== undefined && {
            amountMinor: rule.amountMinor,
          }),
          ...(rule.dueDay !== undefined && {
            dueDate: isoDate(
              dueDateForPeriod(toPeriod(row.period), rule.dueDay),
            ),
          }),
          version: { increment: 1 },
        },
      });
  }
  const updated = await tx.monthlyExpenseOccurrence.updateMany({
    where: { id, ownerId, version: input.version, status: "PLANNED" },
    data: {
      ...(amountMinor !== null && { amountMinor }),
      ...(input.dueDay && {
        dueDate: isoDate(
          dueDateForPeriod(toPeriod(current.period), input.dueDay),
        ),
      }),
      version: { increment: 1 },
    },
  });
  if (updated.count === 0) throw versionConflict();
  await audit(context, {
    action: "occurrence.changed",
    entityType: "MonthlyExpenseOccurrence",
    entityId: id,
    data: {
      ...(input.amount && {
        amount: {
          from: current.amountMinor.toString(),
          to: input.amount.amountMinor,
          scope: input.amount.scope,
        },
      }),
      ...(input.dueDay && {
        dueDate: { from: toIsoDate(current.dueDate), dueDay: input.dueDay },
      }),
    },
  });
  return loadOccurrence(tx, ownerId, id);
}

async function explainFailedTransition(
  tx: Tx,
  ownerId: string,
  id: string,
  expected: "PLANNED" | "PAID",
) {
  const row = await tx.monthlyExpenseOccurrence.findFirst({
    where: { id, ownerId },
  });
  if (!row) return notFound();
  if (row.status !== expected)
    return expected === "PLANNED"
      ? new HttpError(409, "ALREADY_PAID", "Este gasto ya estaba pagado.")
      : new HttpError(409, "NOT_PAID", "Este gasto no tiene un pago activo.");
  return versionConflict();
}

export async function payOccurrence(
  context: MutationContext,
  id: string,
  input: z.infer<typeof payOccurrenceSchema>,
) {
  const { tx, ownerId } = context;
  const updated = await tx.monthlyExpenseOccurrence.updateMany({
    where: { id, ownerId, version: input.version, status: "PLANNED" },
    data: { status: "PAID", version: { increment: 1 } },
  });
  if (updated.count === 0)
    throw await explainFailedTransition(tx, ownerId, id, "PLANNED");
  const row = await tx.monthlyExpenseOccurrence.findUniqueOrThrow({
    where: { id },
  });
  const paidOn = input.paidOn ?? todayIn(await timeZoneOf(tx, ownerId));
  const payment = await tx.expensePayment.create({
    data: {
      ownerId,
      occurrenceId: id,
      paidOn: isoDate(paidOn),
      channel: input.channel ?? null,
      amountMinor: row.amountMinor,
      currency: row.currency,
    },
  });
  await audit(context, {
    action: "occurrence.paid",
    entityType: "MonthlyExpenseOccurrence",
    entityId: id,
    data: {
      paymentId: payment.id,
      paidOn,
      channel: payment.channel,
      amountMinor: row.amountMinor.toString(),
      currency: row.currency,
    },
  });
  return loadOccurrence(tx, ownerId, id);
}

export async function undoPayment(
  context: MutationContext,
  id: string,
  input: { version: number },
) {
  const { tx, ownerId } = context;
  const updated = await tx.monthlyExpenseOccurrence.updateMany({
    where: { id, ownerId, version: input.version, status: "PAID" },
    data: { status: "PLANNED", version: { increment: 1 } },
  });
  if (updated.count === 0)
    throw await explainFailedTransition(tx, ownerId, id, "PAID");
  const reverted = await tx.expensePayment.updateManyAndReturn({
    where: { occurrenceId: id, revertedAt: null },
    data: { revertedAt: new Date() },
    select: { id: true },
  });
  await audit(context, {
    action: "occurrence.payment_undone",
    entityType: "MonthlyExpenseOccurrence",
    entityId: id,
    data: { paymentIds: reverted.map((payment) => payment.id) },
  });
  return loadOccurrence(tx, ownerId, id);
}
