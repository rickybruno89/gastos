import type { Request, Response } from "express";
import { z } from "zod";
import {
  idempotencyKeyPattern,
  idempotent,
  type MutationContext,
} from "../application/mutations";
import type { Identity } from "../application/sharing";
import { HttpError } from "../http";
import { withUser, type Databases } from "../persistence/database";

const idSchema = z.uuid();

export function resourceId(
  req: Request,
  message = "No encontramos ese gasto.",
) {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) throw new HttpError(404, "NOT_FOUND", message);
  return id.data;
}

// Identidad resuelta por el middleware de /api/v2; el email solo cuenta si Google lo verificó.
export function identityOf(res: Response): Identity {
  const { id, name, email, emailVerified } = res.locals.user;
  return { id, name, email, emailVerified: Boolean(emailVerified) };
}

export function readAs<T>(
  databases: Databases,
  res: Response,
  operation: Parameters<typeof withUser<T>>[2],
) {
  const identity = identityOf(res);
  return withUser(
    databases.app,
    identity.id,
    operation,
    identity.emailVerified ? identity.email : undefined,
  );
}

// Toda mutación financiera: Idempotency-Key, transacción con identidad y respuesta reproducible.
export function createMutate(databases: Databases) {
  return async function mutate<T>(
    req: Request,
    res: Response,
    input: { scope: string; body: T; status: number },
    operation: (context: MutationContext) => Promise<object>,
  ) {
    const key = req.get("idempotency-key");
    if (!key || !idempotencyKeyPattern.test(key))
      throw new HttpError(
        400,
        "IDEMPOTENCY_KEY_REQUIRED",
        "La operación requiere un encabezado Idempotency-Key válido.",
      );
    const result = await readAs(databases, res, (tx) => {
      const context = {
        tx,
        ownerId: identityOf(res).id,
        requestId: res.locals.requestId,
      };
      return idempotent(
        context,
        { key, scope: input.scope, body: input.body },
        async () => ({
          status: input.status,
          body: { data: JSON.parse(JSON.stringify(await operation(context))) },
        }),
      );
    });
    res.status(result.status).json(result.body);
  };
}
