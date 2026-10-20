import { Router } from "express";
import {
  annualPaymentSchema,
  changeOccurrenceSchema,
  createMonthlyExpenseSchema,
  payOccurrenceSchema,
  periodSchema,
  reasonInputSchema,
  renameMonthlyExpenseSchema,
  undoPaymentSchema,
  versionOnlySchema,
} from "../../shared/contracts/expenses";
import { putSharesSchema } from "../../shared/contracts/sharing";
import {
  cancelFromOccurrence,
  changeOccurrence,
  changeShares,
  createMonthlyExpense,
  getMonth,
  payAnnual,
  payOccurrence,
  renameMonthlyExpense,
  restoreOccurrence,
  skipOccurrence,
  undoPayment,
} from "../application/monthly-expenses";
import { HttpError, parseBody } from "../http";
import type { Databases } from "../persistence/database";
import { createMutate, readAs, resourceId } from "./helpers";

export function monthlyExpensesRouter(databases: Databases) {
  const router = Router();
  const mutate = createMutate(databases);

  router.get("/months/:period", async (req, res) => {
    const period = periodSchema.safeParse(req.params.period);
    if (!period.success)
      throw new HttpError(400, "VALIDATION_ERROR", "El período no es válido.");
    const month = await readAs(databases, res, (tx) =>
      getMonth(tx, res.locals.user.id, period.data),
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

  router.patch("/expenses/:id", async (req, res) => {
    const id = resourceId(req);
    const body = parseBody(renameMonthlyExpenseSchema, req.body);
    await mutate(
      req,
      res,
      { scope: `PATCH /expenses/${id}`, body, status: 200 },
      (context) => renameMonthlyExpense(context, id, body),
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

  router.put("/occurrences/:id/shares", async (req, res) => {
    const id = resourceId(req);
    const body = parseBody(putSharesSchema, req.body);
    await mutate(
      req,
      res,
      { scope: `PUT /occurrences/${id}/shares`, body, status: 200 },
      (context) => changeShares(context, id, body),
    );
  });

  router.post("/occurrences/:id/annual-payments", async (req, res) => {
    const id = resourceId(req);
    const body = parseBody(annualPaymentSchema, req.body);
    await mutate(
      req,
      res,
      { scope: `POST /occurrences/${id}/annual-payments`, body, status: 201 },
      (context) => payAnnual(context, id, body),
    );
  });

  router.post("/occurrences/:id/skip", async (req, res) => {
    const id = resourceId(req);
    const body = parseBody(reasonInputSchema, req.body);
    await mutate(
      req,
      res,
      { scope: `POST /occurrences/${id}/skip`, body, status: 200 },
      (context) => skipOccurrence(context, id, body),
    );
  });

  router.post("/occurrences/:id/cancel", async (req, res) => {
    const id = resourceId(req);
    const body = parseBody(reasonInputSchema, req.body);
    await mutate(
      req,
      res,
      { scope: `POST /occurrences/${id}/cancel`, body, status: 200 },
      (context) => cancelFromOccurrence(context, id, body),
    );
  });

  router.post("/occurrences/:id/restore", async (req, res) => {
    const id = resourceId(req);
    const body = parseBody(versionOnlySchema, req.body);
    await mutate(
      req,
      res,
      { scope: `POST /occurrences/${id}/restore`, body, status: 200 },
      (context) => restoreOccurrence(context, id, body),
    );
  });

  return router;
}
