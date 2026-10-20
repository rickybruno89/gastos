import { createHash } from "node:crypto";
import type { Prisma } from "../generated/prisma/client";
import { HttpError } from "../http";

export type MutationContext = {
  tx: Prisma.TransactionClient;
  ownerId: string;
  requestId: string;
};
export type MutationResult = { status: number; body: Prisma.InputJsonObject };

export const idempotencyKeyPattern = /^[A-Za-z0-9-]{16,80}$/;

// Se ejecuta dentro de la transacción de la operación: si ésta falla, la clave
// se libera junto con el resto de los cambios y el cliente puede reintentar.
export async function idempotent(
  context: MutationContext,
  request: { key: string; scope: string; body: unknown },
  operation: () => Promise<MutationResult>,
): Promise<MutationResult> {
  const { tx, ownerId } = context;
  const requestHash = createHash("sha256")
    .update(JSON.stringify({ scope: request.scope, body: request.body }))
    .digest("hex");
  // ON CONFLICT espera a una transacción concurrente con la misma clave.
  const claimed = await tx.$executeRaw`
    INSERT INTO public."IdempotencyKey" ("ownerId", "key", "scope", "requestHash")
    VALUES (${ownerId}, ${request.key}, ${request.scope}, ${requestHash})
    ON CONFLICT DO NOTHING`;
  if (claimed === 0) {
    const stored = await tx.idempotencyKey.findUnique({
      where: { ownerId_key: { ownerId, key: request.key } },
    });
    if (
      !stored ||
      stored.scope !== request.scope ||
      stored.requestHash !== requestHash ||
      stored.responseStatus === null
    )
      throw new HttpError(
        422,
        "IDEMPOTENCY_KEY_REUSED",
        "La clave de idempotencia ya se usó con otra operación.",
      );
    return {
      status: stored.responseStatus,
      body: stored.responseBody as Prisma.InputJsonObject,
    };
  }
  const result = await operation();
  await tx.idempotencyKey.update({
    where: { ownerId_key: { ownerId, key: request.key } },
    data: { responseStatus: result.status, responseBody: result.body },
  });
  return result;
}

export async function audit(
  context: MutationContext,
  entry: {
    action: string;
    entityType: string;
    entityId: string;
    data: Prisma.InputJsonObject;
  },
) {
  await context.tx.auditLog.create({
    data: {
      ownerId: context.ownerId,
      requestId: context.requestId,
      ...entry,
    },
  });
}
