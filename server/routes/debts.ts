import { Router } from "express";
import { z } from "zod";
import {
  cancelDebtSchema,
  createDebtSchema,
  debtAdjustmentSchema,
  debtPaymentSchema,
  debtVersionSchema,
  updateDebtSchema,
} from "../../shared/contracts/debts";
import {
  addDebtAdjustment,
  addDebtPayment,
  cancelDebt,
  createDebt,
  getDebt,
  listDebts,
  reopenDebt,
  undoDebtPayment,
  updateDebt,
} from "../application/debts";
import { HttpError, parseBody } from "../http";
import type { Databases } from "../persistence/database";
import { createMutate, identityOf, readAs, resourceId } from "./helpers";

const debtMissing = "No encontramos esa deuda.";

export function debtsRouter(databases: Databases) {
  const router = Router();
  const mutate = createMutate(databases);

  router.get("/debts", async (_req, res) => {
    const data = await readAs(databases, res, (tx) =>
      listDebts(tx, identityOf(res).id),
    );
    res.json({ data });
  });

  router.get("/debts/:id", async (req, res) => {
    const id = resourceId(req, debtMissing);
    const data = await readAs(databases, res, (tx) =>
      getDebt(tx, identityOf(res).id, id),
    );
    res.json({ data });
  });

  router.post("/debts", async (req, res) => {
    const body = parseBody(createDebtSchema, req.body);
    await mutate(
      req,
      res,
      { scope: "POST /debts", body, status: 201 },
      (context) => createDebt(context, body),
    );
  });

  router.patch("/debts/:id", async (req, res) => {
    const id = resourceId(req, debtMissing);
    const body = parseBody(updateDebtSchema, req.body);
    await mutate(
      req,
      res,
      { scope: `PATCH /debts/${id}`, body, status: 200 },
      (context) => updateDebt(context, id, body),
    );
  });

  router.post("/debts/:id/payments", async (req, res) => {
    const id = resourceId(req, debtMissing);
    const body = parseBody(debtPaymentSchema, req.body);
    await mutate(
      req,
      res,
      { scope: `POST /debts/${id}/payments`, body, status: 201 },
      (context) => addDebtPayment(context, id, body),
    );
  });

  router.post("/debts/:id/payments/:paymentId/undo", async (req, res) => {
    const id = resourceId(req, debtMissing);
    const paymentId = z.uuid().safeParse(req.params.paymentId);
    if (!paymentId.success)
      throw new HttpError(404, "NOT_FOUND", "No encontramos ese pago.");
    const body = parseBody(debtVersionSchema, req.body);
    await mutate(
      req,
      res,
      {
        scope: `POST /debts/${id}/payments/${paymentId.data}/undo`,
        body,
        status: 200,
      },
      (context) => undoDebtPayment(context, id, paymentId.data, body),
    );
  });

  router.post("/debts/:id/adjustments", async (req, res) => {
    const id = resourceId(req, debtMissing);
    const body = parseBody(debtAdjustmentSchema, req.body);
    await mutate(
      req,
      res,
      { scope: `POST /debts/${id}/adjustments`, body, status: 201 },
      (context) => addDebtAdjustment(context, id, body),
    );
  });

  router.post("/debts/:id/cancel", async (req, res) => {
    const id = resourceId(req, debtMissing);
    const body = parseBody(cancelDebtSchema, req.body);
    await mutate(
      req,
      res,
      { scope: `POST /debts/${id}/cancel`, body, status: 200 },
      (context) => cancelDebt(context, id, body),
    );
  });

  router.post("/debts/:id/reopen", async (req, res) => {
    const id = resourceId(req, debtMissing);
    const body = parseBody(debtVersionSchema, req.body);
    await mutate(
      req,
      res,
      { scope: `POST /debts/${id}/reopen`, body, status: 200 },
      (context) => reopenDebt(context, id, body),
    );
  });

  return router;
}
