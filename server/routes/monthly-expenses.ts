import { Router, type Request, type Response } from "express";
import { z } from "zod";
import {
  changeOccurrenceSchema,
  createMonthlyExpenseSchema,
  payOccurrenceSchema,
  periodSchema,
  undoPaymentSchema,
} from "../../shared/contracts/expenses";
import {
  changeOccurrence,
  createMonthlyExpense,
  getMonth,
  payOccurrence,
  undoPayment,
} from "../application/monthly-expenses";
import {
  idempotencyKeyPattern,
  idempotent,
  type MutationContext,
} from "../application/mutations";
import { HttpError, parseBody } from "../http";
import { withUser, type Databases } from "../persistence/database";

const idSchema = z.uuid();

function resourceId(req: Request) {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success)
    throw new HttpError(404, "NOT_FOUND", "No encontramos ese gasto.");
  return id.data;
}

export function monthlyExpensesRouter(databases: Databases) {
  const router = Router();

  // Autenticación, origen e identidad ya fueron validados por el middleware de /api/v2.
  async function mutate<T>(
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
    const ownerId: string = res.locals.user.id;
    const result = await withUser(databases.app, ownerId, (tx) => {
      const context = { tx, ownerId, requestId: res.locals.requestId };
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
  }

  router.get("/months/:period", async (req, res) => {
    const period = periodSchema.safeParse(req.params.period);
    if (!period.success)
      throw new HttpError(400, "VALIDATION_ERROR", "El período no es válido.");
    const ownerId: string = res.locals.user.id;
    const month = await withUser(databases.app, ownerId, (tx) =>
      getMonth(tx, ownerId, period.data),
    );
    res.json({ data: month });
  });

  router.post("/expenses", async (req, res) => {
    const body = parseBody(createMonthlyExpenseSchema, req.body);
    await mutate(
      req,
      res,
      { scope: "POST /expenses", body, status: 201 },
      (context) => createMonthlyExpense(context, body),
    );
  });

  router.patch("/occurrences/:id", async (req, res) => {
    const id = resourceId(req);
    const body = parseBody(changeOccurrenceSchema, req.body);
    await mutate(
      req,
      res,
      { scope: `PATCH /occurrences/${id}`, body, status: 200 },
      (context) => changeOccurrence(context, id, body),
    );
  });

  router.post("/occurrences/:id/payments", async (req, res) => {
    const id = resourceId(req);
    const body = parseBody(payOccurrenceSchema, req.body);
    await mutate(
      req,
      res,
      { scope: `POST /occurrences/${id}/payments`, body, status: 201 },
      (context) => payOccurrence(context, id, body),
    );
  });

  router.post("/occurrences/:id/undo-payment", async (req, res) => {
    const id = resourceId(req);
    const body = parseBody(undoPaymentSchema, req.body);
    await mutate(
      req,
      res,
      { scope: `POST /occurrences/${id}/undo-payment`, body, status: 200 },
      (context) => undoPayment(context, id, body),
    );
  });

  return router;
}
