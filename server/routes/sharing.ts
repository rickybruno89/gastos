import { Router } from "express";
import { periodSchema } from "../../shared/contracts/expenses";
import {
  createContactSchema,
  updateContactSchema,
} from "../../shared/contracts/sharing";
import {
  acceptInvitation,
  createContact,
  disconnect,
  getSharedMonth,
  inviteContact,
  listContacts,
  listInvitations,
  rejectInvitation,
  updateContact,
} from "../application/sharing";
import { HttpError, parseBody } from "../http";
import type { Databases } from "../persistence/database";
import { createMutate, identityOf, readAs, resourceId } from "./helpers";

const contactMissing = "No encontramos ese contacto.";
const invitationMissing = "No encontramos esa invitación.";

export function sharingRouter(databases: Databases) {
  const router = Router();
  const mutate = createMutate(databases);

  router.get("/contacts", async (_req, res) => {
    const contacts = await readAs(databases, res, (tx) =>
      listContacts(tx, identityOf(res).id),
    );
    res.json({ data: contacts });
  });

  router.post("/contacts", async (req, res) => {
    const body = parseBody(createContactSchema, req.body);
    await mutate(
      req,
      res,
      { scope: "POST /contacts", body, status: 201 },
      (context) => createContact(context, body),
    );
  });

  router.patch("/contacts/:id", async (req, res) => {
    const id = resourceId(req, contactMissing);
    const body = parseBody(updateContactSchema, req.body);
    await mutate(
      req,
      res,
      { scope: `PATCH /contacts/${id}`, body, status: 200 },
      (context) => updateContact(context, id, body),
    );
  });

  router.post("/contacts/:id/invitation", async (req, res) => {
    const id = resourceId(req, contactMissing);
    await mutate(
      req,
      res,
      { scope: `POST /contacts/${id}/invitation`, body: {}, status: 201 },
      (context) => inviteContact(context, id, identityOf(res)),
    );
  });

  router.get("/invitations", async (_req, res) => {
    const invitations = await readAs(databases, res, (tx) =>
      listInvitations(tx, identityOf(res)),
    );
    res.json({ data: invitations });
  });

  router.post("/invitations/:id/accept", async (req, res) => {
    const id = resourceId(req, invitationMissing);
    await mutate(
      req,
      res,
      { scope: `POST /invitations/${id}/accept`, body: {}, status: 200 },
      (context) => acceptInvitation(context, id, identityOf(res)),
    );
  });

  router.post("/invitations/:id/reject", async (req, res) => {
    const id = resourceId(req, invitationMissing);
    await mutate(
      req,
      res,
      { scope: `POST /invitations/${id}/reject`, body: {}, status: 200 },
      (context) => rejectInvitation(context, id, identityOf(res)),
    );
  });

  router.post("/connections/:id/disconnect", async (req, res) => {
    const id = resourceId(req, invitationMissing);
    await mutate(
      req,
      res,
      { scope: `POST /connections/${id}/disconnect`, body: {}, status: 200 },
      (context) => disconnect(context, id),
    );
  });

  router.get("/shared/:period", async (req, res) => {
    const period = periodSchema.safeParse(req.params.period);
    if (!period.success)
      throw new HttpError(400, "VALIDATION_ERROR", "El período no es válido.");
    const shared = await readAs(databases, res, (tx) =>
      getSharedMonth(tx, identityOf(res).id, period.data),
    );
    res.json({ data: shared });
  });

  return router;
}
