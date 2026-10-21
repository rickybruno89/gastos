import type { z } from "zod";
import type { OccurrenceStatus, Prisma } from "../generated/prisma/client";
import type {
  Month,
  Occurrence,
  annualPaymentSchema,
  changeOccurrenceSchema,
  createMonthlyExpenseSchema,
  payOccurrenceSchema,
  reasonInputSchema,
  renameMonthlyExpenseSchema,
} from "../../shared/contracts/expenses";
import type { putSharesSchema } from "../../shared/contracts/sharing";
import {
  addMonths,
  dueDateForPeriod,
  occursInPeriod,
  todayIn,
} from "../../shared/domain/periods";
import { HttpError } from "../http";
import { audit, type MutationContext } from "./mutations";
import {
  isoDate,
  periodDate,
  timeZoneOf,
  toIsoDate,
  toPeriod,
  type Tx,
} from "./common";
import { replaceTermsShares, syncAllocations } from "./sharing";

const notFound = () =>
  new HttpError(404, "NOT_FOUND", "No encontramos ese gasto.");
const versionConflict = () =>
  new HttpError(
    409,
    "VERSION_CONFLICT",
    "El gasto cambió mientras lo editabas. Actualizá y volvé a intentar.",
  );
const conflict = (code: string, message: string) =>
  new HttpError(409, code, message);

function statusError(status: OccurrenceStatus) {
  switch (status) {
    case "PAID":
      return conflict(
        "OCCURRENCE_PAID",
        "Este gasto ya está pagado. Deshacé el pago para modificarlo.",
      );
    case "COVERED":
      return conflict(
        "OCCURRENCE_COVERED",
        "Este mes está cubierto por un pago anual. Deshacé ese pago para modificarlo.",
      );
    case "SKIPPED":
      return conflict(
        "OCCURRENCE_SKIPPED",
        "Este mes está omitido. Restauralo para modificarlo.",
      );
    case "CANCELLED":
      return conflict(
        "OCCURRENCE_CANCELLED",
        "Este gasto está dado de baja. Reactivalo para modificarlo.",
      );
    default:
      return conflict(
        "INVALID_STATUS",
        "El gasto no admite esta acción en su estado actual.",
      );
  }
}

const termsInclude = {
  shares: {
    include: { contact: { select: { nickname: true } } },
    orderBy: { shareBps: "desc" },
  },
} satisfies Prisma.MonthlyExpenseTermsInclude;
type TermsRow = Prisma.MonthlyExpenseTermsGetPayload<{
  include: typeof termsInclude;
}>;

async function termsAt(tx: Tx, seriesId: string, period: Date) {
  const terms = await tx.monthlyExpenseTerms.findFirst({
    where: { seriesId, effectivePeriod: { lte: period } },
    orderBy: { effectivePeriod: "desc" },
    include: termsInclude,
  });
  if (!terms) throw new Error(`Serie ${seriesId} sin condiciones vigentes.`);
  return terms;
}

// Devuelve las versiones de condiciones que rigen desde `period` en adelante,
// creando la del período (copia de la vigente, con su reparto) si no existe.
async function termsFromPeriod(
  tx: Tx,
  ownerId: string,
  seriesId: string,
  period: Date,
) {
  const current = await termsAt(tx, seriesId, period);
  let atPeriod = current.id;
  if (current.effectivePeriod.getTime() !== period.getTime()) {
    const created = await tx.monthlyExpenseTerms.create({
      data: {
        ownerId,
        seriesId,
        effectivePeriod: period,
        amountMinor: current.amountMinor,
        dueDay: current.dueDay,
      },
    });
    if (current.shares.length)
      await tx.monthlyExpenseTermsShare.createMany({
        data: current.shares.map((share) => ({
          ownerId,
          termsId: created.id,
          contactId: share.contactId,
          shareBps: share.shareBps,
        })),
      });
    atPeriod = created.id;
  }
  const later = await tx.monthlyExpenseTerms.findMany({
    where: { seriesId, effectivePeriod: { gt: period } },
    select: { id: true },
  });
  return [atPeriod, ...later.map((terms) => terms.id)];
}

// Serializa los cambios de regla, coberturas y bajas de una misma serie.
async function lockSeries(tx: Tx, seriesId: string) {
  await tx.$queryRaw`SELECT id FROM public."MonthlyExpenseSeries" WHERE id = ${seriesId}::uuid FOR UPDATE`;
  return tx.monthlyExpenseSeries.findUniqueOrThrow({ where: { id: seriesId } });
}

async function findOccurrence(tx: Tx, ownerId: string, id: string) {
  const row = await tx.monthlyExpenseOccurrence.findFirst({
    where: { id, ownerId },
  });
  if (!row) throw notFound();
  return row;
}

// Cambio de estado con optimistic concurrency: solo aplica desde `from` y con la versión esperada.
async function transition(
  tx: Tx,
  ownerId: string,
  id: string,
  input: {
    version: number;
    from: OccurrenceStatus;
    data: Prisma.MonthlyExpenseOccurrenceUncheckedUpdateManyInput;
    wrongStatus?: (status: OccurrenceStatus) => HttpError;
  },
) {
  const updated = await tx.monthlyExpenseOccurrence.updateMany({
    where: { id, ownerId, version: input.version, status: input.from },
    data: { ...input.data, version: { increment: 1 } },
  });
  if (updated.count) return;
  const row = await findOccurrence(tx, ownerId, id);
  if (row.status !== input.from)
    throw (input.wrongStatus ?? statusError)(row.status);
  throw versionConflict();
}

async function syncAll(tx: Tx, ownerId: string, ids: string[]) {
  for (const id of ids) await syncAllocations(tx, ownerId, id);
}

const occurrenceInclude = {
  series: { select: { name: true, intervalMonths: true, version: true } },
  coverage: true,
  payments: {
    where: { revertedAt: null },
    take: 1,
    include: { coverage: true },
  },
  allocations: {
    include: { contact: { select: { nickname: true } } },
    orderBy: { shareBps: "desc" },
  },
} satisfies Prisma.MonthlyExpenseOccurrenceInclude;
type OccurrenceRow = Prisma.MonthlyExpenseOccurrenceGetPayload<{
  include: typeof occurrenceInclude;
}>;

// El snapshot manda cuando existe (incluido un mes pagado); si el mes no
// reparte, se muestra la regla vigente sin importes.
function toSharing(row: OccurrenceRow, terms: TermsRow): Occurrence["sharing"] {
  if (row.allocations.length)
    return {
      ownerShareBps:
        row.allocations.find((a) => a.contactId === null)?.shareBps ?? 0,
      participants: row.allocations
        .filter((a) => a.contactId !== null)
        .map((a) => ({
          contactId: a.contactId!,
          nickname: a.contact!.nickname,
          shareBps: a.shareBps,
          amountMinor: a.amountMinor.toString(),
        })),
    };
  if (!terms.shares.length) return null;
  return {
    ownerShareBps:
      10_000 - terms.shares.reduce((sum, s) => sum + s.shareBps, 0),
    participants: terms.shares.map((s) => ({
      contactId: s.contactId,
      nickname: s.contact.nickname,
      shareBps: s.shareBps,
      amountMinor: null,
    })),
  };
}

function toOccurrence(row: OccurrenceRow, terms: TermsRow): Occurrence {
  const payment = row.payments[0];
  const coverage = row.coverage ?? payment?.coverage ?? null;
  return {
    id: row.id,
    seriesId: row.seriesId,
    name: row.series.name,
    period: toPeriod(row.period),
    dueDate: toIsoDate(row.dueDate),
    dueDay: terms.dueDay,
    amountMinor: row.amountMinor.toString(),
    currency: row.currency,
    status: row.status,
    statusReason: row.statusReason,
    version: row.version,
    intervalMonths: row.series.intervalMonths as 1 | 2,
    seriesVersion: row.series.version,
    payment: payment
      ? {
          paidOn: toIsoDate(payment.paidOn),
          channel: payment.channel,
          amountMinor: payment.amountMinor.toString(),
          annual: payment.coverageId !== null,
        }
      : null,
    coverage: coverage
      ? {
          fromPeriod: toPeriod(coverage.fromPeriod),
          toPeriod: toPeriod(coverage.toPeriod),
        }
      : null,
    sharing: toSharing(row, terms),
  };
}

async function loadOccurrence(tx: Tx, ownerId: string, id: string) {
  const row = await tx.monthlyExpenseOccurrence.findFirst({
    where: { id, ownerId },
    include: occurrenceInclude,
  });
  if (!row) throw notFound();
  return toOccurrence(row, await termsAt(tx, row.seriesId, row.period));
}

function toSeries(series: {
  id: string;
  name: string;
  currency: "ARS" | "USD";
  intervalMonths: number;
  firstPeriod: Date;
  endPeriod: Date | null;
  version: number;
}) {
  return {
    id: series.id,
    name: series.name,
    currency: series.currency,
    intervalMonths: series.intervalMonths as 1 | 2,
    firstPeriod: toPeriod(series.firstPeriod),
    endPeriod: series.endPeriod ? toPeriod(series.endPeriod) : null,
    version: series.version,
  };
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
      intervalMonths: input.intervalMonths,
      firstPeriod,
      terms: {
        create: {
          effectivePeriod: firstPeriod,
          amountMinor: BigInt(input.amountMinor),
          dueDay: input.dueDay,
        },
      },
    },
    include: { terms: { select: { id: true } } },
  });
  await replaceTermsShares(tx, ownerId, [series.terms[0].id], input.shares);
  await audit(context, {
    action: "monthly_expense.created",
    entityType: "MonthlyExpenseSeries",
    entityId: series.id,
    data: { ...input },
  });
  return toSeries(series);
}

export async function renameMonthlyExpense(
  context: MutationContext,
  id: string,
  input: z.infer<typeof renameMonthlyExpenseSchema>,
) {
  const { tx, ownerId } = context;
  const current = await tx.monthlyExpenseSeries.findFirst({
    where: { id, ownerId },
  });
  if (!current) throw notFound();
  const updated = await tx.monthlyExpenseSeries.updateMany({
    where: { id, ownerId, version: input.version },
    data: { name: input.name, version: { increment: 1 } },
  });
  if (!updated.count) throw versionConflict();
  // Los repartos pagados conservan el nombre con el que se pagaron.
  await tx.occurrenceAllocation.updateMany({
    where: {
      ownerId,
      occurrence: { seriesId: id, status: { not: "PAID" } },
    },
    data: { expenseName: input.name },
  });
  await audit(context, {
    action: "monthly_expense.renamed",
    entityType: "MonthlyExpenseSeries",
    entityId: id,
    data: { from: current.name, to: input.name },
  });
  return toSeries(
    await tx.monthlyExpenseSeries.findUniqueOrThrow({ where: { id } }),
  );
}

// Materializa on-demand: upsert idempotente por serie + período.
export async function getMonth(
  tx: Tx,
  ownerId: string,
  period: string,
): Promise<Month> {
  const date = periodDate(period);
  // Mismo orden de bloqueo que pago anual y cambios de regla.
  await tx.$queryRaw`SELECT id FROM public."MonthlyExpenseSeries" WHERE "ownerId" = ${ownerId} AND "firstPeriod" <= ${date} ORDER BY id FOR UPDATE`;
  const series = await tx.monthlyExpenseSeries.findMany({
    where: { ownerId, firstPeriod: { lte: date } },
    include: {
      terms: {
        where: { effectivePeriod: { lte: date } },
        orderBy: { effectivePeriod: "desc" },
        take: 1,
        include: termsInclude,
      },
      // El mes del pago anual queda PAID; los siguientes del rango, COVERED.
      coverages: {
        where: {
          revertedAt: null,
          fromPeriod: { lt: date },
          toPeriod: { gte: date },
        },
        take: 1,
      },
    },
  });
  const ended = (item: { endPeriod: Date | null }) =>
    item.endPeriod !== null && item.endPeriod < date;
  const due = series.filter(
    (item) =>
      item.terms[0] &&
      !ended(item) &&
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
  if (missing.length) {
    await tx.monthlyExpenseOccurrence.createMany({
      data: missing.map((item) => ({
        ownerId,
        seriesId: item.id,
        period: date,
        dueDate: isoDate(dueDateForPeriod(period, item.terms[0].dueDay)),
        amountMinor: item.terms[0].amountMinor,
        currency: item.currency,
        ...(item.coverages[0] && {
          status: "COVERED" as const,
          coverageId: item.coverages[0].id,
        }),
      })),
      skipDuplicates: true,
    });
    // Las nuevas ocurrencias compartidas nacen con su snapshot de reparto.
    const shared = await tx.monthlyExpenseOccurrence.findMany({
      where: {
        ownerId,
        period: date,
        status: "PLANNED",
        allocations: { none: {} },
        seriesId: {
          in: missing
            .filter((item) => item.terms[0].shares.length)
            .map((item) => item.id),
        },
      },
      select: { id: true },
    });
    await syncAll(
      tx,
      ownerId,
      shared.map((row) => row.id),
    );
  }
  const bySeries = new Map(series.map((item) => [item.id, item]));
  // Tras una baja, los meses posteriores ya materializados dejan de mostrarse.
  const rows = (
    await tx.monthlyExpenseOccurrence.findMany({
      where: { ownerId, period: date },
      include: occurrenceInclude,
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    })
  ).filter((row) => {
    const item = bySeries.get(row.seriesId);
    return item && !ended(item);
  });
  const occurrences = rows.map((row) =>
    toOccurrence(row, bySeries.get(row.seriesId)!.terms[0]),
  );
  const totals = (["ARS", "USD"] as const)
    .map((currency) => {
      const inCurrency = rows.filter((row) => row.currency === currency);
      if (!inCurrency.length) return null;
      const pending = inCurrency
        .filter((row) => row.status === "PLANNED")
        .reduce((total, row) => total + row.amountMinor, 0n);
      // Lo pagado es lo efectivamente desembolsado: un pago anual suma completo en su mes.
      const paid = inCurrency
        .filter((row) => row.status === "PAID")
        .reduce(
          (total, row) => total + (row.payments[0]?.amountMinor ?? 0n),
          0n,
        );
      return {
        currency,
        pendingMinor: pending.toString(),
        paidMinor: paid.toString(),
      };
    })
    .filter((total) => total !== null);
  return {
    period,
    today: todayIn(await timeZoneOf(tx, ownerId)),
    occurrences,
    totals,
  };
}

async function editablePlanned(
  tx: Tx,
  ownerId: string,
  id: string,
  version: number,
) {
  const current = await findOccurrence(tx, ownerId, id);
  if (current.status !== "PLANNED") throw statusError(current.status);
  if (current.version !== version) throw versionConflict();
  await lockSeries(tx, current.seriesId);
  return current;
}

export async function changeOccurrence(
  context: MutationContext,
  id: string,
  input: z.infer<typeof changeOccurrenceSchema>,
) {
  const { tx, ownerId } = context;
  const current = await editablePlanned(tx, ownerId, id, input.version);
  const amountMinor = input.amount ? BigInt(input.amount.amountMinor) : null;
  const rule = {
    ...(input.amount?.scope === "THIS_AND_FUTURE" && { amountMinor }),
    ...(input.dueDay && { dueDay: input.dueDay }),
  } as { amountMinor?: bigint; dueDay?: number };
  const resync = [id];
  if (rule.amountMinor !== undefined || rule.dueDay !== undefined) {
    await tx.monthlyExpenseTerms.updateMany({
      where: {
        id: {
          in: await termsFromPeriod(
            tx,
            ownerId,
            current.seriesId,
            current.period,
          ),
        },
      },
      data: rule,
    });
    // Los meses futuros ya consultados siguen la nueva regla; pagados y cubiertos no cambian.
    const future = await tx.monthlyExpenseOccurrence.findMany({
      where: {
        seriesId: current.seriesId,
        period: { gt: current.period },
        status: { in: ["PLANNED", "SKIPPED"] },
      },
    });
    for (const row of future) {
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
      if (row.status === "PLANNED") resync.push(row.id);
    }
  }
  await transition(tx, ownerId, id, {
    version: input.version,
    from: "PLANNED",
    data: {
      ...(amountMinor !== null && { amountMinor }),
      ...(input.dueDay && {
        dueDate: isoDate(
          dueDateForPeriod(toPeriod(current.period), input.dueDay),
        ),
      }),
    },
  });
  if (amountMinor !== null) await syncAll(tx, ownerId, resync);
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

// Un nuevo reparto aplica a este mes y a los siguientes no pagados.
export async function changeShares(
  context: MutationContext,
  id: string,
  input: z.infer<typeof putSharesSchema>,
) {
  const { tx, ownerId } = context;
  const current = await editablePlanned(tx, ownerId, id, input.version);
  await replaceTermsShares(
    tx,
    ownerId,
    await termsFromPeriod(tx, ownerId, current.seriesId, current.period),
    input.shares,
  );
  await transition(tx, ownerId, id, {
    version: input.version,
    from: "PLANNED",
    data: {},
  });
  const affected = await tx.monthlyExpenseOccurrence.findMany({
    where: {
      seriesId: current.seriesId,
      period: { gte: current.period },
      status: "PLANNED",
    },
    select: { id: true },
  });
  await syncAll(
    tx,
    ownerId,
    affected.map((row) => row.id),
  );
  await audit(context, {
    action: "occurrence.shares_changed",
    entityType: "MonthlyExpenseOccurrence",
    entityId: id,
    data: { shares: input.shares },
  });
  return loadOccurrence(tx, ownerId, id);
}

export async function payOccurrence(
  context: MutationContext,
  id: string,
  input: z.infer<typeof payOccurrenceSchema>,
) {
  const { tx, ownerId } = context;
  await lockSeries(tx, (await findOccurrence(tx, ownerId, id)).seriesId);
  await transition(tx, ownerId, id, {
    version: input.version,
    from: "PLANNED",
    data: { status: "PAID" },
  });
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

// Pago anual: el mes elegido queda PAID por el importe total y los siguientes
// meses del rango quedan COVERED sin importe pendiente. La serie sigue mensual.
// Si es compartido, el reparto se calcula una sola vez sobre el total.
export async function payAnnual(
  context: MutationContext,
  id: string,
  input: z.infer<typeof annualPaymentSchema>,
) {
  const { tx, ownerId } = context;
  const current = await findOccurrence(tx, ownerId, id);
  if (current.status !== "PLANNED") throw statusError(current.status);
  if (current.version !== input.version) throw versionConflict();
  const series = await lockSeries(tx, current.seriesId);
  const from = current.period;
  const toLabel = addMonths(toPeriod(from), input.months - 1);
  const to = periodDate(toLabel);
  if (series.endPeriod && series.endPeriod < to)
    throw conflict(
      "COVERAGE_AFTER_END",
      "El pago anual no puede cubrir meses posteriores a la baja del gasto.",
    );
  const overlapping = await tx.coveragePeriod.findFirst({
    where: {
      seriesId: series.id,
      revertedAt: null,
      fromPeriod: { lte: to },
      toPeriod: { gte: from },
    },
  });
  if (overlapping)
    throw conflict(
      "COVERAGE_OVERLAP",
      "Ya hay un pago anual que cubre alguno de esos meses.",
    );
  const inRange = await tx.monthlyExpenseOccurrence.findMany({
    where: { seriesId: series.id, period: { gt: from, lte: to } },
  });
  if (inRange.some((row) => row.status !== "PLANNED"))
    throw conflict(
      "COVERAGE_CONFLICT",
      "Hay meses dentro del período que ya están pagados, omitidos o dados de baja. Resolvelos antes del pago anual.",
    );
  const coverage = await tx.coveragePeriod.create({
    data: { ownerId, seriesId: series.id, fromPeriod: from, toPeriod: to },
  });
  const amountMinor = BigInt(input.amountMinor);
  await syncAllocations(tx, ownerId, id, amountMinor);
  await transition(tx, ownerId, id, {
    version: input.version,
    from: "PLANNED",
    data: { status: "PAID" },
  });
  const paidOn = input.paidOn ?? todayIn(await timeZoneOf(tx, ownerId));
  const payment = await tx.expensePayment.create({
    data: {
      ownerId,
      occurrenceId: id,
      coverageId: coverage.id,
      paidOn: isoDate(paidOn),
      channel: input.channel ?? null,
      amountMinor,
      currency: current.currency,
    },
  });
  for (const row of inRange)
    await tx.monthlyExpenseOccurrence.update({
      where: { id: row.id },
      data: {
        status: "COVERED",
        coverageId: coverage.id,
        version: { increment: 1 },
      },
    });
  await syncAll(
    tx,
    ownerId,
    inRange.map((row) => row.id),
  );
  await audit(context, {
    action: "occurrence.annual_paid",
    entityType: "MonthlyExpenseOccurrence",
    entityId: id,
    data: {
      paymentId: payment.id,
      coverageId: coverage.id,
      fromPeriod: toPeriod(from),
      toPeriod: toLabel,
      paidOn,
      amountMinor: input.amountMinor,
      currency: current.currency,
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
  await lockSeries(tx, (await findOccurrence(tx, ownerId, id)).seriesId);
  await transition(tx, ownerId, id, {
    version: input.version,
    from: "PAID",
    data: { status: "PLANNED" },
    wrongStatus: () =>
      conflict("NOT_PAID", "Este gasto no tiene un pago activo."),
  });
  const reverted = await tx.expensePayment.updateManyAndReturn({
    where: { occurrenceId: id, revertedAt: null },
    data: { revertedAt: new Date() },
    select: { id: true, coverageId: true },
  });
  // Deshacer un pago anual libera también los meses que cubría.
  const coverageIds = reverted.flatMap((payment) =>
    payment.coverageId ? [payment.coverageId] : [],
  );
  const released = [id];
  if (coverageIds.length) {
    await tx.coveragePeriod.updateMany({
      where: { id: { in: coverageIds } },
      data: { revertedAt: new Date() },
    });
    const covered = await tx.monthlyExpenseOccurrence.updateManyAndReturn({
      where: { coverageId: { in: coverageIds } },
      data: {
        status: "PLANNED",
        coverageId: null,
        version: { increment: 1 },
      },
      select: { id: true },
    });
    released.push(...covered.map((row) => row.id));
  }
  await syncAll(tx, ownerId, released);
  await audit(context, {
    action: "occurrence.payment_undone",
    entityType: "MonthlyExpenseOccurrence",
    entityId: id,
    data: { paymentIds: reverted.map((payment) => payment.id), coverageIds },
  });
  return loadOccurrence(tx, ownerId, id);
}

export async function skipOccurrence(
  context: MutationContext,
  id: string,
  input: z.infer<typeof reasonInputSchema>,
) {
  const { tx, ownerId } = context;
  await lockSeries(tx, (await findOccurrence(tx, ownerId, id)).seriesId);
  await transition(tx, ownerId, id, {
    version: input.version,
    from: "PLANNED",
    data: { status: "SKIPPED", statusReason: input.reason },
  });
  await syncAllocations(tx, ownerId, id);
  await audit(context, {
    action: "occurrence.skipped",
    entityType: "MonthlyExpenseOccurrence",
    entityId: id,
    data: { reason: input.reason },
  });
  return loadOccurrence(tx, ownerId, id);
}

// Dar de baja: este mes queda CANCELLED y la serie deja de generar meses posteriores.
export async function cancelFromOccurrence(
  context: MutationContext,
  id: string,
  input: z.infer<typeof reasonInputSchema>,
) {
  const { tx, ownerId } = context;
  const current = await editablePlanned(tx, ownerId, id, input.version);
  const resolvedLater = await tx.monthlyExpenseOccurrence.count({
    where: {
      seriesId: current.seriesId,
      period: { gt: current.period },
      status: { in: ["PAID", "COVERED"] },
    },
  });
  if (resolvedLater)
    throw conflict(
      "FUTURE_RESOLVED",
      "Hay meses posteriores pagados o cubiertos por un pago anual. Deshacé esos pagos antes de dar de baja.",
    );
  await tx.monthlyExpenseSeries.update({
    where: { id: current.seriesId },
    data: { endPeriod: current.period, version: { increment: 1 } },
  });
  await transition(tx, ownerId, id, {
    version: input.version,
    from: "PLANNED",
    data: { status: "CANCELLED", statusReason: input.reason },
  });
  // Ni este mes ni los posteriores ocultos reparten mientras dure la baja.
  await tx.occurrenceAllocation.deleteMany({
    where: {
      ownerId,
      occurrence: {
        seriesId: current.seriesId,
        period: { gte: current.period },
        status: { not: "PAID" },
      },
    },
  });
  await audit(context, {
    action: "monthly_expense.ended",
    entityType: "MonthlyExpenseOccurrence",
    entityId: id,
    data: {
      seriesId: current.seriesId,
      endPeriod: toPeriod(current.period),
      reason: input.reason,
    },
  });
  return loadOccurrence(tx, ownerId, id);
}

// Restaurar revierte una omisión o una baja; la serie vuelve a generar meses.
export async function restoreOccurrence(
  context: MutationContext,
  id: string,
  input: { version: number },
) {
  const { tx, ownerId } = context;
  const current = await findOccurrence(tx, ownerId, id);
  if (current.status !== "SKIPPED" && current.status !== "CANCELLED")
    throw conflict(
      "NOT_RESTORABLE",
      "Solo se puede restaurar un mes omitido o dado de baja.",
    );
  const resync = [id];
  if (current.status === "CANCELLED") {
    await lockSeries(tx, current.seriesId);
    await tx.monthlyExpenseSeries.update({
      where: { id: current.seriesId },
      data: { endPeriod: null, version: { increment: 1 } },
    });
    const later = await tx.monthlyExpenseOccurrence.findMany({
      where: {
        seriesId: current.seriesId,
        period: { gt: current.period },
        status: "PLANNED",
      },
      select: { id: true },
    });
    resync.push(...later.map((row) => row.id));
  }
  await transition(tx, ownerId, id, {
    version: input.version,
    from: current.status,
    data: { status: "PLANNED", statusReason: null },
  });
  await syncAll(tx, ownerId, resync);
  await audit(context, {
    action:
      current.status === "CANCELLED"
        ? "monthly_expense.reactivated"
        : "occurrence.restored",
    entityType: "MonthlyExpenseOccurrence",
    entityId: id,
    data: { from: current.status, reason: current.statusReason },
  });
  return loadOccurrence(tx, ownerId, id);
}
