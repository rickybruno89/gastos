import type { z } from "zod";
import type { Prisma } from "../generated/prisma/client";
import type {
  Debt,
  DebtDetail,
  cancelDebtSchema,
  createDebtSchema,
  debtAdjustmentSchema,
  debtPaymentSchema,
  updateDebtSchema,
} from "../../shared/contracts/debts";
import { deriveDebt } from "../../shared/domain/debts";
import { HttpError } from "../http";
import { audit, type MutationContext } from "./mutations";
import { todayIn } from "../../shared/domain/periods";
import { isoDate, toIsoDate, timeZoneOf, type Tx } from "./common";

const notFound = () =>
  new HttpError(404, "NOT_FOUND", "No encontramos esa deuda.");
const conflict = (code: string, message: string) =>
  new HttpError(409, code, message);
const versionConflict = () =>
  conflict(
    "VERSION_CONFLICT",
    "La deuda cambió mientras la editabas. Actualizá y volvé a intentar.",
  );

const debtInclude = {
  contact: { select: { nickname: true } },
  payments: { orderBy: [{ paidOn: "asc" }, { createdAt: "asc" }] },
  adjustments: { orderBy: [{ effectiveOn: "asc" }, { createdAt: "asc" }] },
} satisfies Prisma.PersonalDebtInclude;
type DebtRow = Prisma.PersonalDebtGetPayload<{ include: typeof debtInclude }>;

function summarize(row: DebtRow) {
  return deriveDebt({
    principalMinor: row.principalMinor,
    increasesMinor: row.adjustments
      .filter((a) => a.kind === "INCREASE")
      .map((a) => a.amountMinor),
    forgivenMinor: row.adjustments
      .filter((a) => a.kind === "FORGIVE")
      .map((a) => a.amountMinor),
    paymentsMinor: row.payments
      .filter((p) => p.revertedAt === null)
      .map((p) => p.amountMinor),
    cancelled: row.cancelledAt !== null,
  });
}

function toDebt(row: DebtRow): Debt {
  const derived = summarize(row);
  return {
    id: row.id,
    contactId: row.contactId,
    contactName: row.contact.nickname,
    description: row.description,
    notes: row.notes,
    currency: row.currency,
    principalMinor: row.principalMinor.toString(),
    owedMinor: derived.owedMinor.toString(),
    paidMinor: derived.paidMinor.toString(),
    forgivenMinor: derived.forgivenMinor.toString(),
    balanceMinor: derived.balanceMinor.toString(),
    status: derived.status,
    lentOn: toIsoDate(row.lentOn),
    dueOn: row.dueOn ? toIsoDate(row.dueOn) : null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    cancelReason: row.cancelReason,
    version: row.version,
  };
}

function toDetail(row: DebtRow): DebtDetail {
  const events: DebtDetail["events"] = [
    {
      id: `lent-${row.id}`,
      kind: "LENT",
      date: toIsoDate(row.lentOn),
      amountMinor: row.principalMinor.toString(),
      note: row.notes,
      reverted: false,
      recordedAt: row.createdAt.toISOString(),
    },
    ...row.payments.map((p) => ({
      id: p.id,
      kind: "PAYMENT" as const,
      date: toIsoDate(p.paidOn),
      amountMinor: p.amountMinor.toString(),
      note: p.note,
      reverted: p.revertedAt !== null,
      recordedAt: p.createdAt.toISOString(),
    })),
    ...row.adjustments.map((a) => ({
      id: a.id,
      kind: a.kind as "INCREASE" | "FORGIVE",
      date: toIsoDate(a.effectiveOn),
      amountMinor: a.amountMinor.toString(),
      note: a.reason,
      reverted: false,
      recordedAt: a.createdAt.toISOString(),
    })),
  ];
  events.sort(
    (a, b) =>
      a.date.localeCompare(b.date) || a.recordedAt.localeCompare(b.recordedAt),
  );
  return { ...toDebt(row), events };
}

async function loadRow(tx: Tx, ownerId: string, id: string) {
  const row = await tx.personalDebt.findFirst({
    where: { id, ownerId },
    include: debtInclude,
  });
  if (!row) throw notFound();
  return row;
}

// Bloquea la deuda para que pagos, ajustes y cancelación se evalúen sobre un saldo estable.
async function lockForChange(
  tx: Tx,
  ownerId: string,
  id: string,
  version: number,
) {
  await tx.$queryRaw`SELECT id FROM public."PersonalDebt" WHERE id = ${id}::uuid AND "ownerId" = ${ownerId} FOR UPDATE`;
  const row = await loadRow(tx, ownerId, id);
  if (row.version !== version) throw versionConflict();
  return row;
}

function assertActive(row: DebtRow) {
  if (row.cancelledAt)
    throw conflict(
      "DEBT_CANCELLED",
      "La deuda está cancelada. Reabrila para registrar movimientos.",
    );
}
function assertNotBeforeLoan(row: DebtRow, date: string) {
  if (date < toIsoDate(row.lentOn))
    throw new HttpError(
      400,
      "DATE_BEFORE_LOAN",
      "La fecha no puede ser anterior al préstamo.",
    );
}

async function bump(tx: Tx, id: string) {
  await tx.personalDebt.update({
    where: { id },
    data: { version: { increment: 1 } },
  });
}

export async function listDebts(tx: Tx, ownerId: string) {
  const rows = await tx.personalDebt.findMany({
    where: { ownerId },
    include: debtInclude,
    orderBy: { createdAt: "desc" },
  });
  const debts = rows.map(toDebt);
  const rank = { OPEN: 0, PARTIALLY_PAID: 0, PAID: 1, CANCELLED: 2 };
  debts.sort(
    (a, b) =>
      rank[a.status] - rank[b.status] ||
      (a.dueOn ?? "9999").localeCompare(b.dueOn ?? "9999"),
  );
  const totals = (["ARS", "USD"] as const)
    .map((currency) => {
      const active = debts.filter(
        (d) => d.currency === currency && rank[d.status] === 0,
      );
      return active.length
        ? {
            currency,
            outstandingMinor: active
              .reduce((sum, d) => sum + BigInt(d.balanceMinor), 0n)
              .toString(),
            count: active.length,
          }
        : null;
    })
    .filter((total) => total !== null);
  return { debts, totals };
}

export async function getDebt(tx: Tx, ownerId: string, id: string) {
  const detail = toDetail(await loadRow(tx, ownerId, id));
  const lifecycle = await tx.auditLog.findMany({
    where: {
      ownerId,
      entityId: id,
      action: { in: ["debt.cancelled", "debt.reopened"] },
    },
    orderBy: { createdAt: "asc" },
  });
  const timeZone = await timeZoneOf(tx, ownerId);
  for (const entry of lifecycle) {
    const data = entry.data as Record<string, unknown>;
    detail.events.push({
      id: entry.id,
      kind: entry.action === "debt.cancelled" ? "CANCELLED" : "REOPENED",
      date: todayIn(timeZone, entry.createdAt),
      amountMinor: null,
      note: typeof data.reason === "string" ? data.reason : null,
      reverted: false,
      recordedAt: entry.createdAt.toISOString(),
    });
  }
  detail.events.sort(
    (a, b) =>
      a.date.localeCompare(b.date) || a.recordedAt.localeCompare(b.recordedAt),
  );
  return detail;
}

export async function createDebt(
  context: MutationContext,
  input: z.infer<typeof createDebtSchema>,
) {
  const { tx, ownerId } = context;
  const contact = await tx.contact.findFirst({
    where: { id: input.contactId, ownerId },
  });
  if (!contact)
    throw new HttpError(404, "NOT_FOUND", "No encontramos ese contacto.");
  if (contact.archivedAt)
    throw conflict(
      "CONTACT_ARCHIVED",
      "El contacto está archivado. Restauralo para registrar la deuda.",
    );
  const row = await tx.personalDebt.create({
    data: {
      ownerId,
      contactId: input.contactId,
      description: input.description,
      notes: input.notes || null,
      currency: input.currency,
      principalMinor: BigInt(input.principalMinor),
      lentOn: isoDate(input.lentOn),
      dueOn: input.dueOn ? isoDate(input.dueOn) : null,
    },
    include: debtInclude,
  });
  await audit(context, {
    action: "debt.created",
    entityType: "PersonalDebt",
    entityId: row.id,
    data: { ...input },
  });
  return toDetail(row);
}

export async function updateDebt(
  context: MutationContext,
  id: string,
  input: z.infer<typeof updateDebtSchema>,
) {
  const { tx, ownerId } = context;
  const row = await lockForChange(tx, ownerId, id, input.version);
  if (input.dueOn && input.dueOn < toIsoDate(row.lentOn))
    throw new HttpError(
      400,
      "DATE_BEFORE_LOAN",
      "El vencimiento no puede ser anterior al préstamo.",
    );
  await tx.personalDebt.update({
    where: { id },
    data: {
      ...(input.description !== undefined && {
        description: input.description,
      }),
      ...(input.notes !== undefined && { notes: input.notes || null }),
      ...(input.dueOn !== undefined && {
        dueOn: input.dueOn ? isoDate(input.dueOn) : null,
      }),
      version: { increment: 1 },
    },
  });
  await audit(context, {
    action: "debt.updated",
    entityType: "PersonalDebt",
    entityId: id,
    data: { ...input },
  });
  return getDebt(tx, ownerId, id);
}

export async function addDebtPayment(
  context: MutationContext,
  id: string,
  input: z.infer<typeof debtPaymentSchema>,
) {
  const { tx, ownerId } = context;
  const row = await lockForChange(tx, ownerId, id, input.version);
  assertActive(row);
  assertNotBeforeLoan(row, input.paidOn);
  const amountMinor = BigInt(input.amountMinor);
  if (amountMinor > summarize(row).balanceMinor)
    throw conflict(
      "PAYMENT_EXCEEDS_BALANCE",
      "El pago supera el saldo pendiente.",
    );
  const payment = await tx.personalDebtPayment.create({
    data: {
      ownerId,
      debtId: id,
      amountMinor,
      paidOn: isoDate(input.paidOn),
      note: input.note || null,
    },
  });
  await bump(tx, id);
  await audit(context, {
    action: "debt.payment_added",
    entityType: "PersonalDebt",
    entityId: id,
    data: { paymentId: payment.id, ...input },
  });
  return getDebt(tx, ownerId, id);
}

export async function undoDebtPayment(
  context: MutationContext,
  id: string,
  paymentId: string,
  input: { version: number },
) {
  const { tx, ownerId } = context;
  const row = await lockForChange(tx, ownerId, id, input.version);
  assertActive(row);
  const payment = row.payments.find((p) => p.id === paymentId);
  if (!payment)
    throw new HttpError(404, "NOT_FOUND", "No encontramos ese pago.");
  if (payment.revertedAt)
    throw conflict("PAYMENT_REVERTED", "Ese pago ya estaba deshecho.");
  await tx.personalDebtPayment.update({
    where: { id: paymentId },
    data: { revertedAt: new Date() },
  });
  await bump(tx, id);
  await audit(context, {
    action: "debt.payment_undone",
    entityType: "PersonalDebt",
    entityId: id,
    data: { paymentId, amountMinor: payment.amountMinor.toString() },
  });
  return getDebt(tx, ownerId, id);
}

export async function addDebtAdjustment(
  context: MutationContext,
  id: string,
  input: z.infer<typeof debtAdjustmentSchema>,
) {
  const { tx, ownerId } = context;
  const row = await lockForChange(tx, ownerId, id, input.version);
  assertActive(row);
  assertNotBeforeLoan(row, input.effectiveOn);
  const amountMinor = BigInt(input.amountMinor);
  if (input.kind === "FORGIVE" && amountMinor > summarize(row).balanceMinor)
    throw conflict(
      "FORGIVE_EXCEEDS_BALANCE",
      "No podés perdonar más que el saldo pendiente.",
    );
  const adjustment = await tx.personalDebtAdjustment.create({
    data: {
      ownerId,
      debtId: id,
      kind: input.kind,
      amountMinor,
      effectiveOn: isoDate(input.effectiveOn),
      reason: input.reason,
    },
  });
  await bump(tx, id);
  await audit(context, {
    action:
      input.kind === "INCREASE" ? "debt.increased" : "debt.partially_forgiven",
    entityType: "PersonalDebt",
    entityId: id,
    data: { adjustmentId: adjustment.id, ...input },
  });
  return getDebt(tx, ownerId, id);
}

// Cancelar perdona el saldo restante; no registra ningún pago.
export async function cancelDebt(
  context: MutationContext,
  id: string,
  input: z.infer<typeof cancelDebtSchema>,
) {
  const { tx, ownerId } = context;
  const row = await lockForChange(tx, ownerId, id, input.version);
  assertActive(row);
  const { balanceMinor } = summarize(row);
  if (balanceMinor <= 0n)
    throw conflict(
      "DEBT_PAID",
      "La deuda ya está saldada; no hay nada que cancelar.",
    );
  await tx.personalDebt.update({
    where: { id },
    data: {
      cancelledAt: new Date(),
      cancelReason: input.reason,
      version: { increment: 1 },
    },
  });
  await audit(context, {
    action: "debt.cancelled",
    entityType: "PersonalDebt",
    entityId: id,
    data: { reason: input.reason, forgivenMinor: balanceMinor.toString() },
  });
  return getDebt(tx, ownerId, id);
}

export async function reopenDebt(
  context: MutationContext,
  id: string,
  input: { version: number },
) {
  const { tx, ownerId } = context;
  const row = await lockForChange(tx, ownerId, id, input.version);
  if (!row.cancelledAt)
    throw conflict("DEBT_NOT_CANCELLED", "La deuda no está cancelada.");
  await tx.personalDebt.update({
    where: { id },
    data: { cancelledAt: null, cancelReason: null, version: { increment: 1 } },
  });
  await audit(context, {
    action: "debt.reopened",
    entityType: "PersonalDebt",
    entityId: id,
    data: { previousReason: row.cancelReason },
  });
  return getDebt(tx, ownerId, id);
}
