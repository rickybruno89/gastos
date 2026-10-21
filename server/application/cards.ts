import type { z } from "zod";
import type { Prisma } from "../generated/prisma/client";
import type * as C from "../../shared/contracts/cards";
import { sharesSchema, type ShareInput } from "../../shared/contracts/sharing";
import {
  installmentAmounts,
  installmentAllocations,
} from "../../shared/domain/cards";
import { allocateMoney } from "../../shared/domain/money";
import {
  addMonths,
  dueDateForPeriod,
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

const conflict = (code: string, message: string) =>
  new HttpError(409, code, message);
const missing = () =>
  new HttpError(404, "NOT_FOUND", "No encontramos esa tarjeta o resumen.");
function checkVersion(actual: number, expected: number) {
  if (actual !== expected)
    throw conflict(
      "VERSION_CONFLICT",
      "El resumen cambió. Actualizá y volvé a intentar.",
    );
}
function draft(row: { status: string }) {
  if (row.status !== "DRAFT")
    throw conflict(
      "STATEMENT_LOCKED",
      "Deshacé el pago y reabrí la conciliación antes de editar este resumen.",
    );
}
const chargeInclude = {
  purchase: true,
  line: true,
  allocations: { orderBy: { shareBps: "desc" as const } },
} satisfies Prisma.CardChargeInclude;
type ChargeRow = Prisma.CardChargeGetPayload<{ include: typeof chargeInclude }>;
const statementInclude = {
  card: true,
  charges: {
    include: chargeInclude,
    orderBy: [{ occurredOn: "asc" as const }, { id: "asc" as const }],
  },
  lines: { orderBy: { createdAt: "asc" as const } },
  payments: { where: { revertedAt: null }, take: 1 },
  transfersFrom: {
    include: { charge: true, toStatement: true },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.CardStatementInclude;
type StatementRow = Prisma.CardStatementGetPayload<{
  include: typeof statementInclude;
}>;
function cardDto(row: Prisma.CreditCardGetPayload<object>): C.CreditCard {
  return {
    id: row.id,
    name: row.name,
    lastFour: row.lastFour,
    closingDay: row.closingDay,
    dueDay: row.dueDay,
    archived: !!row.archivedAt,
    version: row.version,
  };
}
function chargeDto(row: ChargeRow): C.CardCharge {
  return {
    id: row.id,
    description: row.description,
    occurredOn: toIsoDate(row.occurredOn),
    expectedPeriod: toPeriod(row.expectedPeriod),
    amountMinor: row.amountMinor.toString(),
    currency: row.currency,
    version: row.version,
    purchaseId: row.purchaseId,
    recurringId: row.recurringId,
    installmentNo: row.installmentNo,
    installments: row.purchase?.installments ?? null,
    lineId: row.line?.id ?? null,
    status: row.line ? "MATCHED" : "EXPECTED",
    allocations: row.allocations.map((a) => ({
      contactId: a.contactId,
      nickname: a.contactName,
      shareBps: a.shareBps,
      amountMinor: a.amountMinor.toString(),
    })),
  };
}
function totals(row: {
  charges: { currency: "ARS" | "USD"; amountMinor: bigint }[];
}) {
  return (["ARS", "USD"] as const).flatMap((currency) => {
    const charges = row.charges.filter((c) => c.currency === currency);
    return charges.length
      ? [
          {
            currency,
            amountMinor: charges
              .reduce((sum, c) => sum + c.amountMinor, 0n)
              .toString(),
          },
        ]
      : [];
  });
}
async function cardRow(tx: Tx, ownerId: string, id: string, lock = true) {
  if (lock)
    await tx.$queryRaw`SELECT id FROM public."CreditCard" WHERE id=${id}::uuid AND "ownerId"=${ownerId} FOR UPDATE`;
  const row = await tx.creditCard.findFirst({ where: { id, ownerId } });
  if (!row) throw missing();
  return row;
}
async function statementRow(tx: Tx, ownerId: string, id: string, lock = true) {
  const ref = await tx.cardStatement.findFirst({
    where: { id, ownerId },
    select: { cardId: true },
  });
  if (!ref) throw missing();
  if (lock) await cardRow(tx, ownerId, ref.cardId);
  let row = await tx.cardStatement.findFirstOrThrow({
    where: { id, ownerId },
    include: statementInclude,
  });
  if (await materializeRecurring(tx, ownerId, row))
    row = await tx.cardStatement.findFirstOrThrow({
      where: { id, ownerId },
      include: statementInclude,
    });
  return row;
}
async function statementFor(
  tx: Tx,
  ownerId: string,
  card: Awaited<ReturnType<typeof cardRow>>,
  period: string,
) {
  const date = periodDate(period);
  return tx.cardStatement.upsert({
    where: { cardId_period: { cardId: card.id, period: date } },
    create: {
      ownerId,
      cardId: card.id,
      period: date,
      closingDate: isoDate(dueDateForPeriod(period, card.closingDay)),
      dueDate: isoDate(dueDateForPeriod(addMonths(period, 1), card.dueDay)),
    },
    update: {},
  });
}
async function validateShares(tx: Tx, ownerId: string, shares: ShareInput) {
  const contacts = await tx.contact.findMany({
    where: { ownerId, id: { in: shares.map((s) => s.contactId) } },
  });
  if (contacts.length !== shares.length)
    throw new HttpError(
      404,
      "CONTACT_NOT_FOUND",
      "Uno de los contactos no existe.",
    );
  if (contacts.some((c) => c.archivedAt))
    throw conflict(
      "CONTACT_ARCHIVED",
      "Restaurá el contacto antes de asignarle un nuevo reparto.",
    );
  return contacts;
}
async function allocations(
  tx: Tx,
  ownerId: string,
  charge: {
    id: string;
    description: string;
    amountMinor: bigint;
    currency: "ARS" | "USD";
  },
  period: Date,
  shares: ShareInput,
  validate = false,
  allocated?: { id: string; shareBps: number; amountMinor: bigint }[],
) {
  const contacts = validate
    ? await validateShares(tx, ownerId, shares)
    : await tx.contact.findMany({
        where: { ownerId, id: { in: shares.map((s) => s.contactId) } },
      });
  if (contacts.length !== shares.length)
    throw new HttpError(
      404,
      "CONTACT_NOT_FOUND",
      "No encontramos el contacto del reparto.",
    );
  await tx.cardAllocation.deleteMany({
    where: { chargeId: charge.id, ownerId },
  });
  const pieces = allocated
    ? allocated.map((p) => ({
        ...p,
        money: { amountMinor: p.amountMinor.toString() },
      }))
    : allocateMoney(
        {
          amountMinor: charge.amountMinor.toString(),
          currency: charge.currency,
        },
        [
          {
            id: "owner",
            shareBps: 10000 - shares.reduce((s, a) => s + a.shareBps, 0),
          },
          ...shares.map((s) => ({ id: s.contactId, shareBps: s.shareBps })),
        ],
      );
  await tx.cardAllocation.createMany({
    data: pieces.map((p) => {
      const contact = contacts.find((c) => c.id === p.id);
      return {
        ownerId,
        chargeId: charge.id,
        period,
        expenseName: charge.description,
        baseAmountMinor: charge.amountMinor,
        amountMinor: BigInt(p.money.amountMinor),
        shareBps: p.shareBps,
        currency: charge.currency,
        contactId: contact?.id ?? null,
        connectionId: contact?.connectionId ?? null,
        contactName: contact?.nickname ?? null,
      };
    }),
  });
}
async function bump(tx: Tx, id: string) {
  await tx.cardStatement.update({
    where: { id },
    data: { version: { increment: 1 } },
  });
}
async function record(
  context: MutationContext,
  action: string,
  entityId: string,
  data: Prisma.InputJsonObject = {},
) {
  await audit(context, {
    action: `card.${action}`,
    entityType: "CardStatement",
    entityId,
    data,
  });
}

export async function listCards(tx: Tx, ownerId: string) {
  return (
    await tx.creditCard.findMany({
      where: { ownerId },
      orderBy: [
        { archivedAt: { sort: "asc", nulls: "first" } },
        { name: "asc" },
      ],
    })
  ).map(cardDto);
}
export async function createCard(
  context: MutationContext,
  input: z.infer<typeof C.createCardSchema>,
) {
  const row = await context.tx.creditCard.create({
    data: { ownerId: context.ownerId, ...input },
  });
  await record(context, "created", row.id, { ...input });
  return cardDto(row);
}
export async function updateCard(
  context: MutationContext,
  id: string,
  input: z.infer<typeof C.updateCardSchema>,
) {
  const { tx, ownerId } = context,
    row = await cardRow(tx, ownerId, id);
  checkVersion(row.version, input.version);
  if (
    input.archived &&
    (await tx.cardRecurringSeries.count({
      where: {
        cardId: id,
        OR: [
          { endPeriod: null },
          {
            endPeriod: {
              gte: periodDate(
                todayIn(await timeZoneOf(tx, ownerId)).slice(0, 7),
              ),
            },
          },
        ],
      },
    }))
  )
    throw conflict(
      "RECURRING_ACTIVE",
      "Primero finalizá los cargos recurrentes de esta tarjeta.",
    );
  const { archived } = input;
  const values = {
    name: input.name,
    lastFour: input.lastFour,
    closingDay: input.closingDay,
    dueDay: input.dueDay,
  };
  const updated = await tx.creditCard.update({
    where: { id },
    data: {
      ...values,
      ...(archived !== undefined && {
        archivedAt: archived ? new Date() : null,
      }),
      version: { increment: 1 },
    },
  });
  await record(context, "updated", id, { ...input });
  return cardDto(updated);
}
export async function createPurchase(
  context: MutationContext,
  cardId: string,
  input: z.infer<typeof C.createPurchaseSchema>,
) {
  const { tx, ownerId } = context,
    card = await cardRow(tx, ownerId, cardId);
  if (card.archivedAt)
    throw conflict(
      "CARD_ARCHIVED",
      "Restaurá la tarjeta antes de cargar una compra.",
    );
  if (
    !input.confirmDuplicate &&
    (await tx.cardPurchase.findFirst({
      where: {
        ownerId,
        cardId,
        description: { equals: input.description, mode: "insensitive" },
        currency: input.currency,
        occurredOn: isoDate(input.occurredOn),
        originalTotalMinor: BigInt(input.amountMinor),
      },
    }))
  )
    throw conflict(
      "POSSIBLE_DUPLICATE",
      "Ya hay una compra con esta tarjeta, descripción, fecha, importe y moneda. Confirmá si querés registrarla otra vez.",
    );
  await validateShares(tx, ownerId, input.shares);
  const amounts = installmentAmounts(
    BigInt(input.amountMinor),
    input.installments,
  );
  const split = installmentAllocations(
    BigInt(input.amountMinor),
    input.installments,
    [
      {
        id: "owner",
        shareBps: 10000 - input.shares.reduce((sum, s) => sum + s.shareBps, 0),
      },
      ...input.shares.map((s) => ({ id: s.contactId, shareBps: s.shareBps })),
    ],
  );
  const purchase = await tx.cardPurchase.create({
    data: {
      ownerId,
      cardId,
      description: input.description,
      occurredOn: isoDate(input.occurredOn),
      currency: input.currency,
      originalTotalMinor: BigInt(input.amountMinor),
      installments: input.installments,
      firstPeriod: periodDate(input.firstPeriod),
    },
  });
  for (let i = 0; i < amounts.length; i++) {
    const period = addMonths(input.firstPeriod, i),
      statement = await statementFor(tx, ownerId, card, period);
    draft(statement);
    const charge = await tx.cardCharge.create({
      data: {
        ownerId,
        statementId: statement.id,
        purchaseId: purchase.id,
        installmentNo: i + 1,
        description: input.description,
        occurredOn: isoDate(input.occurredOn),
        expectedPeriod: periodDate(period),
        currency: input.currency,
        amountMinor: amounts[i],
      },
    });
    await allocations(
      tx,
      ownerId,
      charge,
      statement.period,
      input.shares,
      false,
      split[i],
    );
    await bump(tx, statement.id);
  }
  await record(context, "purchase_created", purchase.id, { ...input });
  return { id: purchase.id, cardId, firstPeriod: input.firstPeriod };
}
async function materializeRecurring(
  tx: Tx,
  ownerId: string,
  statement: Awaited<ReturnType<typeof statementFor>>,
) {
  if (statement.status !== "DRAFT") return;
  const series = await tx.cardRecurringSeries.findMany({
    where: {
      ownerId,
      cardId: statement.cardId,
      firstPeriod: { lte: statement.period },
      OR: [{ endPeriod: null }, { endPeriod: { gte: statement.period } }],
    },
    include: {
      terms: {
        where: { effectivePeriod: { lte: statement.period } },
        orderBy: { effectivePeriod: "desc" },
        take: 1,
      },
    },
  });
  let added = false;
  for (const s of series) {
    const terms = s.terms[0];
    if (!terms) continue;
    if (
      await tx.cardCharge.findUnique({
        where: {
          recurringId_expectedPeriod: {
            recurringId: s.id,
            expectedPeriod: statement.period,
          },
        },
      })
    )
      continue;
    const charge = await tx.cardCharge.create({
      data: {
        ownerId,
        statementId: statement.id,
        recurringId: s.id,
        expectedPeriod: statement.period,
        occurredOn: statement.period,
        description: s.description,
        amountMinor: terms.amountMinor,
        currency: s.currency,
      },
    });
    await allocations(
      tx,
      ownerId,
      charge,
      statement.period,
      sharesSchema.parse(terms.shares),
    );
    added = true;
  }
  if (added) await bump(tx, statement.id);
  return added;
}
async function recurringList(
  tx: Tx,
  ownerId: string,
  cardId: string,
  period: Date,
): Promise<C.CardRecurring[]> {
  const rows = await tx.cardRecurringSeries.findMany({
    where: { ownerId, cardId },
    include: {
      terms: {
        orderBy: { effectivePeriod: "desc" },
      },
    },
  });
  return rows.map((r) => {
    const terms =
      r.terms.find((t) => t.effectivePeriod <= period) ?? r.terms.at(-1);
    return {
      id: r.id,
      description: r.description,
      currency: r.currency,
      firstPeriod: toPeriod(r.firstPeriod),
      endPeriod: r.endPeriod ? toPeriod(r.endPeriod) : null,
      version: r.version,
      amountMinor: terms?.amountMinor.toString() ?? "0",
      shares: terms ? sharesSchema.parse(terms.shares) : [],
    };
  });
}
export async function createRecurring(
  context: MutationContext,
  cardId: string,
  input: z.infer<typeof C.createRecurringSchema>,
) {
  const { tx, ownerId } = context,
    card = await cardRow(tx, ownerId, cardId);
  if (card.archivedAt)
    throw conflict(
      "CARD_ARCHIVED",
      "Restaurá la tarjeta para cargar un recurrente.",
    );
  if (
    await tx.cardStatement.count({
      where: {
        ownerId,
        cardId,
        period: { gte: periodDate(input.firstPeriod) },
        status: { not: "DRAFT" },
      },
    })
  )
    throw conflict(
      "FUTURE_RESOLVED",
      "Hay resúmenes posteriores conciliados o pagados. Reabrilos antes de agregar un recurrente desde este mes.",
    );
  await validateShares(tx, ownerId, input.shares);
  const statement = await statementFor(tx, ownerId, card, input.firstPeriod);
  draft(statement);
  const row = await tx.cardRecurringSeries.create({
    data: {
      ownerId,
      cardId,
      description: input.description,
      currency: input.currency,
      firstPeriod: periodDate(input.firstPeriod),
      terms: {
        create: {
          effectivePeriod: periodDate(input.firstPeriod),
          amountMinor: BigInt(input.amountMinor),
          shares: input.shares,
        },
      },
    },
  });
  await materializeRecurring(tx, ownerId, statement);
  await record(context, "recurring_created", row.id, { ...input });
  return { id: row.id };
}
export async function updateRecurring(
  context: MutationContext,
  id: string,
  input: z.infer<typeof C.updateRecurringSchema>,
) {
  const { tx, ownerId } = context;
  let row = await tx.cardRecurringSeries.findFirst({ where: { id, ownerId } });
  if (!row) throw missing();
  await cardRow(tx, ownerId, row.cardId);
  row = await tx.cardRecurringSeries.findFirstOrThrow({
    where: { id, ownerId },
  });
  checkVersion(row.version, input.version);
  const from = periodDate(input.fromPeriod);
  if (from < row.firstPeriod)
    throw new HttpError(
      400,
      "INVALID_PERIOD",
      "El cambio no puede ser anterior al primer cargo.",
    );
  if (input.shares) await validateShares(tx, ownerId, input.shares);
  if (input.endPeriod !== undefined) {
    if (input.endPeriod && input.endPeriod < toPeriod(row.firstPeriod))
      throw new HttpError(
        400,
        "INVALID_PERIOD",
        "El fin no puede ser anterior al inicio.",
      );
    if (input.endPeriod) {
      const after = await tx.cardCharge.findMany({
        where: {
          recurringId: id,
          expectedPeriod: { gt: periodDate(input.endPeriod) },
        },
        include: { statement: true, line: true, transfers: true },
      });
      if (
        after.some(
          (c) => c.statement.status !== "DRAFT" || c.line || c.transfers.length,
        )
      )
        throw conflict(
          "FUTURE_RESOLVED",
          "Hay cargos posteriores conciliados o arrastrados. Resolvelos antes de finalizar el recurrente.",
        );
      for (const c of after) {
        await tx.cardCharge.delete({ where: { id: c.id } });
        await bump(tx, c.statementId);
      }
    }
  }
  if (input.amountMinor !== undefined || input.shares !== undefined) {
    const previous = await tx.cardRecurringTerms.findFirstOrThrow({
      where: { seriesId: id, effectivePeriod: { lte: from } },
      orderBy: { effectivePeriod: "desc" },
    });
    const amountMinor = input.amountMinor
        ? BigInt(input.amountMinor)
        : previous.amountMinor,
      shares = input.shares ?? sharesSchema.parse(previous.shares);
    await tx.cardRecurringTerms.upsert({
      where: {
        seriesId_effectivePeriod: { seriesId: id, effectivePeriod: from },
      },
      create: {
        ownerId,
        seriesId: id,
        effectivePeriod: from,
        amountMinor,
        shares,
      },
      update: { amountMinor, shares },
    });
    await tx.cardRecurringTerms.updateMany({
      where: { seriesId: id, effectivePeriod: { gt: from } },
      data: {
        ...(input.amountMinor && { amountMinor }),
        ...(input.shares && { shares }),
      },
    });
    const future = await tx.cardCharge.findMany({
      where: {
        recurringId: id,
        expectedPeriod: { gte: from },
        statement: { status: "DRAFT" },
      },
      include: { line: true, statement: true, allocations: true },
    });
    if (future.some((c) => c.line))
      throw conflict(
        "CHARGE_MATCHED",
        "Desvinculá los cargos conciliados antes de cambiar la regla.",
      );
    for (const c of future) {
      const updated = await tx.cardCharge.update({
        where: { id: c.id },
        data: {
          ...(input.amountMinor && { amountMinor }),
          version: { increment: 1 },
        },
      });
      const pieces =
        input.shares ??
        c.allocations
          .filter((a) => a.contactId)
          .map((a) => ({ contactId: a.contactId!, shareBps: a.shareBps }));
      await allocations(tx, ownerId, updated, c.statement.period, pieces);
      await bump(tx, c.statementId);
    }
  }
  await tx.cardRecurringSeries.update({
    where: { id },
    data: {
      ...(input.endPeriod !== undefined && {
        endPeriod: input.endPeriod ? periodDate(input.endPeriod) : null,
      }),
      version: { increment: 1 },
    },
  });
  await record(context, "recurring_changed", id, { ...input });
  return { id };
}
async function detail(
  tx: Tx,
  ownerId: string,
  row: StatementRow,
): Promise<C.CardStatement> {
  return {
    id: row.id,
    card: cardDto(row.card),
    period: toPeriod(row.period),
    closingDate: toIsoDate(row.closingDate),
    dueDate: toIsoDate(row.dueDate),
    status: row.status,
    version: row.version,
    bankArsMinor: row.bankArsMinor?.toString() ?? null,
    bankUsdMinor: row.bankUsdMinor?.toString() ?? null,
    totals: totals(row),
    charges: row.charges.map(chargeDto),
    lines: row.lines.map((l) => ({
      id: l.id,
      description: l.description,
      postedOn: toIsoDate(l.postedOn),
      amountMinor: l.amountMinor.toString(),
      currency: l.currency,
      chargeId: l.chargeId,
      ignoreReason: l.ignoreReason,
      status: l.chargeId
        ? "MATCHED"
        : l.ignoreReason
          ? "IGNORED_WITH_REASON"
          : "UNMATCHED_ACTUAL",
    })),
    deferred: row.transfersFrom.map((t) => ({
      id: t.id,
      chargeId: t.chargeId,
      description: t.charge.description,
      toPeriod: toPeriod(t.toStatement.period),
      reason: t.reason,
    })),
    payment: row.payments[0]
      ? {
          paidOn: toIsoDate(row.payments[0].paidOn),
          channel: row.payments[0].channel,
        }
      : null,
    recurring: await recurringList(tx, ownerId, row.cardId, row.period),
  };
}
export async function getStatement(tx: Tx, ownerId: string, id: string) {
  return detail(tx, ownerId, await statementRow(tx, ownerId, id));
}
export async function getCardStatement(
  tx: Tx,
  ownerId: string,
  cardId: string,
  period: string,
) {
  const card = await cardRow(tx, ownerId, cardId),
    statement = await statementFor(tx, ownerId, card, period);
  await materializeRecurring(tx, ownerId, statement);
  return getStatement(tx, ownerId, statement.id);
}
export async function getCardMonth(tx: Tx, ownerId: string, period: string) {
  const cards = await tx.creditCard.findMany({
    where: {
      ownerId,
      OR: [
        { archivedAt: null },
        { statements: { some: { period: periodDate(period) } } },
        {
          recurring: {
            some: {
              firstPeriod: { lte: periodDate(period) },
              OR: [
                { endPeriod: null },
                { endPeriod: { gte: periodDate(period) } },
              ],
            },
          },
        },
      ],
    },
    orderBy: { id: "asc" },
  });
  const statements = [];
  for (const card of cards) {
    const s = await getCardStatement(tx, ownerId, card.id, period);
    if (s.charges.length || s.lines.length || s.deferred.length)
      statements.push({
        id: s.id,
        cardId: card.id,
        cardName: card.name,
        period: s.period,
        dueDate: s.dueDate,
        status: s.status,
        version: s.version,
        totals: s.totals,
        unresolved:
          s.charges.filter((c) => c.status === "EXPECTED").length +
          s.lines.filter((l) => l.status === "UNMATCHED_ACTUAL").length,
      });
  }
  return { period, statements };
}
export async function changeStatementDates(
  context: MutationContext,
  id: string,
  input: z.infer<typeof C.statementDatesSchema>,
) {
  const { tx, ownerId } = context,
    row = await statementRow(tx, ownerId, id);
  checkVersion(row.version, input.version);
  draft(row);
  if (row.lines.some((l) => toIsoDate(l.postedOn) > input.closingDate))
    throw conflict(
      "POSTING_AFTER_CLOSE",
      "Hay líneas posteriores al cierre indicado.",
    );
  await tx.cardStatement.update({
    where: { id },
    data: {
      closingDate: isoDate(input.closingDate),
      dueDate: isoDate(input.dueDate),
      ...(input.bankArsMinor !== undefined && {
        bankArsMinor:
          input.bankArsMinor === null ? null : BigInt(input.bankArsMinor),
      }),
      ...(input.bankUsdMinor !== undefined && {
        bankUsdMinor:
          input.bankUsdMinor === null ? null : BigInt(input.bankUsdMinor),
      }),
      version: { increment: 1 },
    },
  });
  await record(context, "dates_changed", id, { ...input });
  return getStatement(tx, ownerId, id);
}
export async function changeCardCharge(
  context: MutationContext,
  id: string,
  input: z.infer<typeof C.updateCardChargeSchema>,
) {
  const { tx, ownerId } = context,
    ref = await tx.cardCharge.findFirst({ where: { id, ownerId } });
  if (!ref) throw missing();
  const statement = await statementRow(tx, ownerId, ref.statementId);
  draft(statement);
  checkVersion(statement.version, input.statementVersion);
  const current = statement.charges.find((c) => c.id === id)!;
  checkVersion(current.version, input.version);
  if (current.line)
    throw conflict(
      "CHARGE_MATCHED",
      "Desvinculá la línea antes de corregir el cargo.",
    );
  if (input.shares) await validateShares(tx, ownerId, input.shares);
  const targets =
    input.scope === "THIS_AND_FUTURE" && current.purchaseId
      ? await tx.cardCharge.findMany({
          where: {
            purchaseId: current.purchaseId,
            installmentNo: { gte: current.installmentNo! },
            statement: { status: "DRAFT" },
          },
          include: { ...chargeInclude, statement: true },
        })
      : [{ ...current, statement }];
  if (targets.some((c) => c.line))
    throw conflict(
      "CHARGE_MATCHED",
      "Hay cuotas conciliadas dentro del alcance. Desvinculalas antes de corregirlas.",
    );
  for (const c of targets) {
    const updated = await tx.cardCharge.update({
      where: { id: c.id },
      data: {
        ...(input.description && { description: input.description }),
        ...(input.amountMinor && { amountMinor: BigInt(input.amountMinor) }),
        version: { increment: 1 },
      },
    });
    const previousShares = c.allocations
      .filter((a) => a.contactId)
      .map((a) => ({ contactId: a.contactId!, shareBps: a.shareBps }));
    const shares = input.shares ?? previousShares;
    const changedShares =
      shares.length !== previousShares.length ||
      shares.some(
        (s) =>
          !previousShares.some(
            (p) => p.contactId === s.contactId && p.shareBps === s.shareBps,
          ),
      );
    if (updated.amountMinor !== c.amountMinor || changedShares)
      await allocations(tx, ownerId, updated, c.statement.period, shares);
    else if (updated.description !== c.description)
      await tx.cardAllocation.updateMany({
        where: { chargeId: c.id, ownerId },
        data: { expenseName: updated.description },
      });
    await bump(tx, c.statementId);
  }
  await record(context, "charge_changed", statement.id, {
    chargeId: id,
    ...input,
  });
  return getStatement(tx, ownerId, statement.id);
}
export async function addStatementLine(
  context: MutationContext,
  id: string,
  input: z.infer<typeof C.createStatementLineSchema>,
) {
  const { tx, ownerId } = context,
    row = await statementRow(tx, ownerId, id);
  draft(row);
  checkVersion(row.version, input.version);
  if (input.postedOn > toIsoDate(row.closingDate))
    throw new HttpError(
      400,
      "POSTING_AFTER_CLOSE",
      "La fecha informada es posterior al cierre del resumen.",
    );
  await tx.statementLine.create({
    data: {
      ownerId,
      statementId: id,
      description: input.description,
      postedOn: isoDate(input.postedOn),
      currency: input.currency,
      amountMinor: BigInt(input.amountMinor),
    },
  });
  await bump(tx, id);
  await record(context, "line_added", id, { ...input });
  return getStatement(tx, ownerId, id);
}
export async function matchCardCharge(
  context: MutationContext,
  id: string,
  input: z.infer<typeof C.matchCardChargeSchema>,
) {
  const { tx, ownerId } = context,
    row = await statementRow(tx, ownerId, id);
  draft(row);
  checkVersion(row.version, input.version);
  const charge = row.charges.find((c) => c.id === input.chargeId);
  if (!charge) throw missing();
  if (charge.line)
    throw conflict("ALREADY_MATCHED", "El cargo ya está vinculado.");
  if (input.lineId) {
    const line = row.lines.find((l) => l.id === input.lineId);
    if (!line) throw missing();
    if (line.chargeId || line.ignoreReason)
      throw conflict("LINE_RESOLVED", "La línea ya está resuelta.");
    if (
      line.amountMinor !== charge.amountMinor ||
      line.currency !== charge.currency
    )
      throw conflict(
        "AMOUNT_MISMATCH",
        "Corregí el importe del cargo esperado antes de vincular la diferencia.",
      );
    await tx.statementLine.update({
      where: { id: line.id },
      data: { chargeId: charge.id },
    });
  } else {
    const postedOn = input.postedOn ?? toIsoDate(charge.occurredOn);
    if (postedOn > toIsoDate(row.closingDate))
      throw new HttpError(
        400,
        "POSTING_AFTER_CLOSE",
        "Revisá el cierre o la fecha informada por el banco.",
      );
    await tx.statementLine.create({
      data: {
        ownerId,
        statementId: id,
        chargeId: charge.id,
        description: charge.description,
        postedOn: isoDate(postedOn),
        amountMinor: charge.amountMinor,
        currency: charge.currency,
      },
    });
  }
  await bump(tx, id);
  await record(context, "charge_matched", id, { ...input });
  return getStatement(tx, ownerId, id);
}
export async function resolveStatementLine(
  context: MutationContext,
  id: string,
  lineId: string,
  input: z.infer<typeof C.resolveStatementLineSchema>,
) {
  const { tx, ownerId } = context,
    row = await statementRow(tx, ownerId, id);
  draft(row);
  checkVersion(row.version, input.version);
  const line = row.lines.find((l) => l.id === lineId);
  if (!line) throw missing();
  if (input.action === "UNMATCH")
    await tx.statementLine.update({
      where: { id: lineId },
      data: { chargeId: null, ignoreReason: null },
    });
  else if (input.action === "DELETE")
    await tx.statementLine.delete({ where: { id: lineId } });
  else {
    if (line.chargeId || line.ignoreReason)
      throw conflict(
        "LINE_RESOLVED",
        "La línea ya está resuelta. Desvinculala para corregirla.",
      );
    if (input.action === "IGNORE")
      await tx.statementLine.update({
        where: { id: lineId },
        data: { ignoreReason: input.reason! },
      });
    else {
      if (line.amountMinor <= 0n)
        throw conflict(
          "NEGATIVE_CONSUMPTION",
          "Los descuentos globales se excluyen con motivo; no son consumos.",
        );
      await validateShares(tx, ownerId, input.shares);
      const charge = await tx.cardCharge.create({
        data: {
          ownerId,
          statementId: id,
          expectedPeriod: row.period,
          description: line.description,
          occurredOn: line.postedOn,
          amountMinor: line.amountMinor,
          currency: line.currency,
        },
      });
      await allocations(tx, ownerId, charge, row.period, input.shares);
      await tx.statementLine.update({
        where: { id: lineId },
        data: { chargeId: charge.id },
      });
    }
  }
  await bump(tx, id);
  await record(context, "line_resolved", id, { lineId, ...input });
  return getStatement(tx, ownerId, id);
}
export async function deferCardCharge(
  context: MutationContext,
  id: string,
  chargeId: string,
  input: z.infer<typeof C.deferCardChargeSchema>,
) {
  const { tx, ownerId } = context,
    row = await statementRow(tx, ownerId, id);
  draft(row);
  checkVersion(row.version, input.version);
  const charge = row.charges.find((c) => c.id === chargeId);
  if (!charge) throw missing();
  checkVersion(charge.version, input.chargeVersion);
  if (charge.line)
    throw conflict(
      "CHARGE_MATCHED",
      "Desvinculá el cargo antes de arrastrarlo.",
    );
  const next = addMonths(toPeriod(row.period), 1);
  if (next > "2100-12")
    throw conflict(
      "INVALID_PERIOD",
      "No se puede avanzar fuera del rango de períodos.",
    );
  const target = await statementFor(tx, ownerId, row.card, next);
  draft(target);
  await tx.cardChargeTransfer.create({
    data: {
      ownerId,
      chargeId,
      fromStatementId: id,
      toStatementId: target.id,
      reason: input.reason,
    },
  });
  await tx.cardCharge.update({
    where: { id: chargeId },
    data: { statementId: target.id, version: { increment: 1 } },
  });
  await tx.cardAllocation.updateMany({
    where: { chargeId },
    data: { period: target.period },
  });
  await bump(tx, id);
  await bump(tx, target.id);
  await record(context, "charge_deferred", id, {
    chargeId,
    toPeriod: next,
    reason: input.reason,
  });
  return getStatement(tx, ownerId, id);
}
export async function transitionStatement(
  context: MutationContext,
  id: string,
  input: z.infer<typeof C.statementPaymentSchema>,
  action: "reconcile" | "reopen" | "pay" | "undo",
) {
  const { tx, ownerId } = context,
    row = await statementRow(tx, ownerId, id);
  checkVersion(row.version, input.version);
  if (action === "reconcile") {
    draft(row);
    if (
      row.charges.some((c) => !c.line) ||
      row.lines.some((l) => !l.chargeId && !l.ignoreReason)
    )
      throw conflict(
        "UNRESOLVED_ITEMS",
        "Resolvé los consumos esperados y las líneas desconocidas antes de conciliar.",
      );
    await tx.cardStatement.update({
      where: { id },
      data: { status: "RECONCILED", version: { increment: 1 } },
    });
  } else if (action === "reopen") {
    if (row.status !== "RECONCILED")
      throw conflict(
        "STATEMENT_LOCKED",
        "Primero deshacé el pago del resumen.",
      );
    await tx.cardStatement.update({
      where: { id },
      data: { status: "DRAFT", version: { increment: 1 } },
    });
  } else if (action === "pay") {
    if (row.status !== "RECONCILED")
      throw conflict(
        "NOT_RECONCILED",
        "Primero confirmá la conciliación del resumen completo.",
      );
    const amounts = totals(row);
    await tx.cardPayment.create({
      data: {
        ownerId,
        statementId: id,
        paidOn: isoDate(input.paidOn ?? todayIn(await timeZoneOf(tx, ownerId))),
        channel: input.channel ?? null,
        arsMinor: BigInt(
          amounts.find((a) => a.currency === "ARS")?.amountMinor ?? 0,
        ),
        usdMinor: BigInt(
          amounts.find((a) => a.currency === "USD")?.amountMinor ?? 0,
        ),
      },
    });
    await tx.cardStatement.update({
      where: { id },
      data: { status: "PAID", version: { increment: 1 } },
    });
  } else {
    if (row.status !== "PAID")
      throw conflict("NOT_PAID", "El resumen no tiene un pago activo.");
    await tx.cardStatement.update({
      where: { id },
      data: { status: "RECONCILED", version: { increment: 1 } },
    });
    await tx.cardPayment.updateMany({
      where: { statementId: id, revertedAt: null },
      data: { revertedAt: new Date() },
    });
  }
  await record(context, `statement_${action}`, id, { ...input });
  return getStatement(tx, ownerId, id);
}
