import { Router, type Request } from "express";
import { z } from "zod";
import * as schema from "../../shared/contracts/cards";
import { periodSchema } from "../../shared/contracts/primitives";
import * as cards from "../application/cards";
import type { MutationContext } from "../application/mutations";
import type { Databases } from "../persistence/database";
import { HttpError, parseBody } from "../http";
import { createMutate, identityOf, readAs, resourceId } from "./helpers";
const idOf = (req: Request) =>
  resourceId(req, "No encontramos esa tarjeta o resumen.");
function extraId(req: Request, name: string) {
  const value = z.uuid().safeParse(req.params[name]);
  if (!value.success)
    throw new HttpError(404, "NOT_FOUND", "No encontramos ese recurso.");
  return value.data;
}
export function cardsRouter(databases: Databases) {
  const router = Router(),
    mutate = createMutate(databases);
  router.get("/cards", async (_req, res) => {
    res.json({
      data: await readAs(databases, res, (tx) =>
        cards.listCards(tx, identityOf(res).id),
      ),
    });
  });
  router.get("/card-months/:period", async (req, res) => {
    const period = parseBody(periodSchema, req.params.period);
    res.json({
      data: await readAs(databases, res, (tx) =>
        cards.getCardMonth(tx, identityOf(res).id, period),
      ),
    });
  });
  router.get("/cards/:id/statements/:period", async (req, res) => {
    const id = idOf(req),
      period = parseBody(periodSchema, req.params.period);
    res.json({
      data: await readAs(databases, res, (tx) =>
        cards.getCardStatement(tx, identityOf(res).id, id, period),
      ),
    });
  });
  router.get("/statements/:id", async (req, res) => {
    const id = idOf(req);
    res.json({
      data: await readAs(databases, res, (tx) =>
        cards.getStatement(tx, identityOf(res).id, id),
      ),
    });
  });
  function mutation<T>(
    method: "post" | "patch",
    path: string,
    contract: z.ZodType<T>,
    operation: (
      context: MutationContext,
      req: Request,
      body: T,
    ) => Promise<object>,
    status = 200,
  ) {
    router[method](path, async (req, res) => {
      const body = parseBody(contract, req.body);
      await mutate(
        req,
        res,
        { scope: `${method.toUpperCase()} ${req.path}`, body, status },
        (context) => operation(context, req, body),
      );
    });
  }
  mutation(
    "post",
    "/cards",
    schema.createCardSchema,
    (c, _r, b) => cards.createCard(c, b),
    201,
  );
  mutation("patch", "/cards/:id", schema.updateCardSchema, (c, r, b) =>
    cards.updateCard(c, idOf(r), b),
  );
  mutation(
    "post",
    "/cards/:id/purchases",
    schema.createPurchaseSchema,
    (c, r, b) => cards.createPurchase(c, idOf(r), b),
    201,
  );
  mutation(
    "post",
    "/cards/:id/recurring",
    schema.createRecurringSchema,
    (c, r, b) => cards.createRecurring(c, idOf(r), b),
    201,
  );
  mutation(
    "patch",
    "/card-recurring/:id",
    schema.updateRecurringSchema,
    (c, r, b) => cards.updateRecurring(c, idOf(r), b),
  );
  mutation("patch", "/statements/:id", schema.statementDatesSchema, (c, r, b) =>
    cards.changeStatementDates(c, idOf(r), b),
  );
  mutation(
    "patch",
    "/card-charges/:id",
    schema.updateCardChargeSchema,
    (c, r, b) => cards.changeCardCharge(c, idOf(r), b),
  );
  mutation(
    "post",
    "/statements/:id/lines",
    schema.createStatementLineSchema,
    (c, r, b) => cards.addStatementLine(c, idOf(r), b),
    201,
  );
  mutation(
    "post",
    "/statements/:id/matches",
    schema.matchCardChargeSchema,
    (c, r, b) => cards.matchCardCharge(c, idOf(r), b),
  );
  mutation(
    "post",
    "/statements/:id/lines/:lineId/resolve",
    schema.resolveStatementLineSchema,
    (c, r, b) =>
      cards.resolveStatementLine(c, idOf(r), extraId(r, "lineId"), b),
  );
  mutation(
    "post",
    "/statements/:id/charges/:chargeId/defer",
    schema.deferCardChargeSchema,
    (c, r, b) => cards.deferCardCharge(c, idOf(r), extraId(r, "chargeId"), b),
  );
  for (const [path, action] of [
    ["reconcile", "reconcile"],
    ["reopen", "reopen"],
    ["payments", "pay"],
    ["undo-payment", "undo"],
  ] as const)
    mutation(
      "post",
      `/statements/:id/${path}`,
      action === "pay"
        ? schema.statementPaymentSchema
        : schema.statementVersionSchema,
      (c, r, b) => cards.transitionStatement(c, idOf(r), b, action),
    );
  return router;
}
