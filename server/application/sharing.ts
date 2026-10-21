import type { z } from "zod";
import type { Prisma } from "../generated/prisma/client";
import type {
  Contact,
  SharedMonth,
  ShareInput,
  createContactSchema,
  updateContactSchema,
} from "../../shared/contracts/sharing";
import { allocateMoney } from "../../shared/domain/money";
import { todayIn } from "../../shared/domain/periods";
import { HttpError } from "../http";
import { audit, type MutationContext } from "./mutations";
import { periodDate, timeZoneOf, toPeriod, type Tx } from "./common";

export type Identity = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
};

const INVITATION_DAYS = 30;
const conflict = (code: string, message: string) =>
  new HttpError(409, code, message);
const contactNotFound = () =>
  new HttpError(404, "NOT_FOUND", "No encontramos ese contacto.");
const connectionNotFound = () =>
  new HttpError(404, "NOT_FOUND", "No encontramos esa invitación.");

const contactInclude = {
  connection: true,
} satisfies Prisma.ContactInclude;
type ContactRow = Prisma.ContactGetPayload<{ include: typeof contactInclude }>;

function toContact(row: ContactRow, ownerId: string): Contact {
  const connection = row.connection;
  const sent = connection?.inviterId === ownerId;
  return {
    id: row.id,
    nickname: row.nickname,
    email: row.email,
    archived: row.archivedAt !== null,
    version: row.version,
    connection: connection
      ? {
          id: connection.id,
          status: connection.status,
          direction: sent ? "SENT" : "RECEIVED",
          otherName: sent ? connection.inviteeName : connection.inviterName,
          acceptedPeriod: connection.acceptedPeriod
            ? toPeriod(connection.acceptedPeriod)
            : null,
        }
      : null,
  };
}

async function loadContact(tx: Tx, ownerId: string, id: string) {
  const row = await tx.contact.findFirst({
    where: { id, ownerId },
    include: contactInclude,
  });
  if (!row) throw contactNotFound();
  return row;
}

export async function listContacts(tx: Tx, ownerId: string) {
  const rows = await tx.contact.findMany({
    where: { ownerId },
    include: contactInclude,
    orderBy: [
      { archivedAt: { sort: "asc", nulls: "first" } },
      { nickname: "asc" },
    ],
  });
  return rows.map((row) => toContact(row, ownerId));
}

export async function createContact(
  context: MutationContext,
  input: z.infer<typeof createContactSchema>,
) {
  const { tx, ownerId } = context;
  const row = await tx.contact.create({
    data: { ownerId, nickname: input.nickname, email: input.email ?? null },
    include: contactInclude,
  });
  await audit(context, {
    action: "contact.created",
    entityType: "Contact",
    entityId: row.id,
    data: { nickname: input.nickname, hasEmail: Boolean(input.email) },
  });
  return toContact(row, ownerId);
}

export async function updateContact(
  context: MutationContext,
  id: string,
  input: z.infer<typeof updateContactSchema>,
) {
  const { tx, ownerId } = context;
  const current = await loadContact(tx, ownerId, id);
  const linked =
    current.connection &&
    ["PENDING", "ACCEPTED"].includes(current.connection.status);
  if (input.email !== undefined && input.email !== current.email && linked)
    throw conflict(
      "CONTACT_CONNECTED",
      "Desconectá a esta persona antes de cambiar su email.",
    );
  const updated = await tx.contact.updateMany({
    where: { id, ownerId, version: input.version },
    data: {
      ...(input.nickname !== undefined && { nickname: input.nickname }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.archived !== undefined && {
        archivedAt: input.archived ? new Date() : null,
      }),
      version: { increment: 1 },
    },
  });
  if (!updated.count)
    throw conflict(
      "VERSION_CONFLICT",
      "El contacto cambió mientras lo editabas. Actualizá y volvé a intentar.",
    );
  await audit(context, {
    action: "contact.updated",
    entityType: "Contact",
    entityId: id,
    data: {
      ...(input.nickname !== undefined && { nickname: input.nickname }),
      ...(input.email !== undefined && { emailChanged: true }),
      ...(input.archived !== undefined && { archived: input.archived }),
    },
  });
  return toContact(await loadContact(tx, ownerId, id), ownerId);
}

// Valida contactos propios y activos y reemplaza el reparto de una versión de condiciones.
export async function replaceTermsShares(
  tx: Tx,
  ownerId: string,
  termsIds: string[],
  shares: ShareInput,
) {
  if (shares.length) {
    const contacts = await tx.contact.findMany({
      where: { ownerId, id: { in: shares.map((share) => share.contactId) } },
    });
    if (contacts.length !== shares.length) throw contactNotFound();
    if (contacts.some((contact) => contact.archivedAt))
      throw conflict(
        "CONTACT_ARCHIVED",
        "Uno de los contactos está archivado. Restauralo para compartir con esa persona.",
      );
  }
  await tx.monthlyExpenseTermsShare.deleteMany({
    where: { termsId: { in: termsIds } },
  });
  if (shares.length)
    await tx.monthlyExpenseTermsShare.createMany({
      data: termsIds.flatMap((termsId) =>
        shares.map((share) => ({ ownerId, termsId, ...share })),
      ),
    });
}

// Reemplaza el snapshot de reparto de una ocurrencia pendiente con sus condiciones vigentes.
// Omitidas, cubiertas o de baja no reparten; las pagadas conservan su snapshot.
export async function syncAllocations(
  tx: Tx,
  ownerId: string,
  occurrenceId: string,
  baseAmountMinor?: bigint,
) {
  await tx.$queryRaw`SELECT id FROM public."MonthlyExpenseOccurrence" WHERE id = ${occurrenceId}::uuid FOR UPDATE`;
  const occurrence = await tx.monthlyExpenseOccurrence.findFirstOrThrow({
    where: { id: occurrenceId, ownerId },
    include: { series: { select: { name: true } } },
  });
  if (occurrence.status === "PAID") return;
  await tx.occurrenceAllocation.deleteMany({ where: { occurrenceId } });
  if (occurrence.status !== "PLANNED") return;
  const terms = await tx.monthlyExpenseTerms.findFirstOrThrow({
    where: {
      seriesId: occurrence.seriesId,
      effectivePeriod: { lte: occurrence.period },
    },
    orderBy: { effectivePeriod: "desc" },
    include: { shares: { include: { contact: true } } },
  });
  if (!terms.shares.length) return;
  const base = baseAmountMinor ?? occurrence.amountMinor;
  const contactsBps = terms.shares.reduce((sum, s) => sum + s.shareBps, 0);
  const allocated = allocateMoney(
    { amountMinor: base.toString(), currency: occurrence.currency },
    [
      { id: "owner", shareBps: 10_000 - contactsBps },
      ...terms.shares.map((share) => ({
        id: share.contactId,
        shareBps: share.shareBps,
      })),
    ],
  );
  const contacts = new Map(terms.shares.map((s) => [s.contactId, s.contact]));
  await tx.occurrenceAllocation.createMany({
    data: allocated.map((item) => {
      const contact = item.id === "owner" ? null : contacts.get(item.id)!;
      return {
        ownerId,
        occurrenceId,
        contactId: contact?.id ?? null,
        connectionId: contact?.connectionId ?? null,
        period: occurrence.period,
        expenseName: occurrence.series.name,
        shareBps: item.shareBps,
        baseAmountMinor: base,
        amountMinor: BigInt(item.money.amountMinor),
        currency: occurrence.currency,
      };
    }),
  });
}

export async function inviteContact(
  context: MutationContext,
  contactId: string,
  identity: Identity,
) {
  const { tx, ownerId } = context;
  const contact = await loadContact(tx, ownerId, contactId);
  if (contact.archivedAt)
    throw conflict("CONTACT_ARCHIVED", "Restaurá el contacto para invitarlo.");
  if (!contact.email)
    throw conflict(
      "CONTACT_EMAIL_REQUIRED",
      "Agregá el email de esta persona para invitarla.",
    );
  if (contact.email === identity.email.toLowerCase())
    throw conflict("SELF_INVITE", "No podés invitarte a vos mismo.");
  if (
    contact.connection &&
    ["PENDING", "ACCEPTED"].includes(contact.connection.status)
  )
    throw conflict(
      "ALREADY_CONNECTED",
      "Ya hay una invitación o conexión activa con esta persona.",
    );
  const connection = await tx.userConnection.create({
    data: {
      inviterId: ownerId,
      inviterName: identity.name.slice(0, 120),
      inviteeEmail: contact.email,
      expiresAt: new Date(Date.now() + INVITATION_DAYS * 86_400_000),
    },
  });
  await tx.contact.update({
    where: { id: contactId },
    data: { connectionId: connection.id, version: { increment: 1 } },
  });
  // Todos los repartos con este contacto, incluido el historial, quedan
  // asociados: la contraparte los ve completos cuando acepta.
  await tx.occurrenceAllocation.updateMany({
    where: { ownerId, contactId },
    data: { connectionId: connection.id },
  });
  await audit(context, {
    action: "connection.invited",
    entityType: "UserConnection",
    entityId: connection.id,
    data: { contactId },
  });
  return toContact(await loadContact(tx, ownerId, contactId), ownerId);
}

export async function listInvitations(tx: Tx, identity: Identity) {
  const rows = await tx.userConnection.findMany({
    where: {
      status: "PENDING",
      inviteeEmail: identity.email.toLowerCase(),
      inviterId: { not: identity.id },
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => ({
    id: row.id,
    inviterName: row.inviterName,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
  }));
}

async function pendingFor(tx: Tx, id: string, identity: Identity) {
  const row = await tx.userConnection.findFirst({
    where: {
      id,
      status: "PENDING",
      inviteeEmail: identity.email.toLowerCase(),
      inviterId: { not: identity.id },
    },
  });
  if (!row) throw connectionNotFound();
  if (row.expiresAt <= new Date())
    throw conflict(
      "INVITATION_EXPIRED",
      "La invitación venció. Pedile a la otra persona que te invite de nuevo.",
    );
  return row;
}

export async function acceptInvitation(
  context: MutationContext,
  id: string,
  identity: Identity,
) {
  const { tx, ownerId } = context;
  if (!identity.emailVerified)
    throw new HttpError(
      403,
      "EMAIL_NOT_VERIFIED",
      "Tu email no está verificado; no podemos aceptar la invitación.",
    );
  const invitation = await pendingFor(tx, id, identity);
  const acceptedPeriod = todayIn(await timeZoneOf(tx, ownerId)).slice(0, 7);
  const updated = await tx.userConnection.updateMany({
    where: { id, status: "PENDING" },
    data: {
      status: "ACCEPTED",
      inviteeId: ownerId,
      inviteeName: identity.name.slice(0, 120),
      acceptedPeriod: periodDate(acceptedPeriod),
      respondedAt: new Date(),
    },
  });
  if (!updated.count) throw connectionNotFound();
  // La cuenta que acepta obtiene su propio contacto, con su propio apodo.
  const contact = await tx.contact.create({
    data: {
      ownerId,
      nickname: invitation.inviterName.slice(0, 60),
      connectionId: id,
    },
    include: contactInclude,
  });
  await audit(context, {
    action: "connection.accepted",
    entityType: "UserConnection",
    entityId: id,
    data: { contactId: contact.id, acceptedPeriod },
  });
  return toContact(contact, ownerId);
}

export async function rejectInvitation(
  context: MutationContext,
  id: string,
  identity: Identity,
) {
  const { tx } = context;
  await pendingFor(tx, id, identity);
  // Registrar quién rechaza lo hace parte de la conexión, como exige RLS.
  await tx.userConnection.update({
    where: { id },
    data: {
      status: "REJECTED",
      inviteeId: context.ownerId,
      inviteeName: identity.name.slice(0, 120),
      respondedAt: new Date(),
    },
  });
  await audit(context, {
    action: "connection.rejected",
    entityType: "UserConnection",
    entityId: id,
    data: {},
  });
  return { id, status: "REJECTED" as const };
}

// Cancela una invitación enviada o corta una conexión. No borra snapshots ni saldos propios.
export async function disconnect(context: MutationContext, id: string) {
  const { tx, ownerId } = context;
  const row = await tx.userConnection.findFirst({
    where: { id, OR: [{ inviterId: ownerId }, { inviteeId: ownerId }] },
  });
  if (!row) throw connectionNotFound();
  const status =
    row.status === "PENDING" && row.inviterId === ownerId
      ? "REJECTED"
      : row.status === "ACCEPTED"
        ? "BLOCKED"
        : null;
  if (!status)
    throw conflict("NOT_CONNECTED", "Esta conexión ya no está activa.");
  await tx.userConnection.update({
    where: { id },
    data: { status, respondedAt: new Date() },
  });
  await audit(context, {
    action:
      status === "BLOCKED" ? "connection.disconnected" : "connection.cancelled",
    entityType: "UserConnection",
    entityId: id,
    data: {},
  });
  return { id, status };
}

// Saldos derivados del período: lo que te deben por tus gastos y lo que debés
// por gastos de cuentas conectadas. Nunca se persisten ni tienen pagos propios.
export async function getSharedMonth(
  tx: Tx,
  ownerId: string,
  period: string,
): Promise<SharedMonth> {
  const date = periodDate(period);
  // Consultas secuenciales: comparten la conexión de la transacción.
  const mine = await tx.occurrenceAllocation.findMany({
    where: { ownerId, period: date, contactId: { not: null } },
    orderBy: { createdAt: "asc" },
  });
  // RLS deja ver solo las filas propias de la contraparte, con conexión aceptada.
  const theirs = await tx.occurrenceAllocation.findMany({
    where: { ownerId: { not: ownerId }, period: date },
    include: { connection: true },
    orderBy: { createdAt: "asc" },
  });
  const contacts = await tx.contact.findMany({
    where: { ownerId },
    include: contactInclude,
  });
  const byContact = new Map(contacts.map((c) => [c.id, c]));
  const byConnection = new Map(
    contacts.filter((c) => c.connectionId).map((c) => [c.connectionId!, c]),
  );
  type Person = SharedMonth["people"][number];
  const people = new Map<string, Person>();
  function person(
    key: string,
    init: () => Omit<Person, "balances" | "theyOwe" | "iOwe">,
  ) {
    let entry = people.get(key);
    if (!entry) {
      entry = { ...init(), balances: [], theyOwe: [], iOwe: [] };
      people.set(key, entry);
    }
    return entry;
  }
  const line = (row: (typeof mine)[number]) => ({
    expenseName: row.expenseName,
    totalMinor: row.baseAmountMinor.toString(),
    shareBps: row.shareBps,
    amountMinor: row.amountMinor.toString(),
    currency: row.currency,
  });
  const fromContact = (contact: ContactRow) => () => ({
    key: `contact:${contact.id}`,
    name: contact.nickname,
    contactId: contact.id,
    connected: contact.connection?.status === "ACCEPTED",
  });
  for (const row of mine) {
    const contact = byContact.get(row.contactId!)!;
    person(`contact:${contact.id}`, fromContact(contact)).theyOwe.push(
      line(row),
    );
  }
  for (const row of theirs) {
    const contact = byConnection.get(row.connectionId!);
    const connection = row.connection!;
    const entry = contact
      ? person(`contact:${contact.id}`, fromContact(contact))
      : person(`connection:${connection.id}`, () => ({
          key: `connection:${connection.id}`,
          name:
            (connection.inviterId === ownerId
              ? connection.inviteeName
              : connection.inviterName) ?? "Cuenta conectada",
          contactId: null,
          connected: connection.status === "ACCEPTED",
        }));
    entry.iOwe.push(line(row));
  }
  for (const entry of people.values())
    entry.balances = (["ARS", "USD"] as const)
      .map((currency) => {
        const sum = (rows: { currency: string; amountMinor: string }[]) =>
          rows
            .filter((r) => r.currency === currency)
            .reduce((total, r) => total + BigInt(r.amountMinor), 0n);
        const theyOwe = sum(entry.theyOwe);
        const iOwe = sum(entry.iOwe);
        return theyOwe || iOwe
          ? {
              currency,
              theyOweMinor: theyOwe.toString(),
              iOweMinor: iOwe.toString(),
            }
          : null;
      })
      .filter((balance) => balance !== null);
  return {
    period,
    people: [...people.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "es"),
    ),
  };
}
