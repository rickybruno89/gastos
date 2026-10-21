import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { withUser } from "../../server/persistence/database";
import type { DebtDetail } from "../../shared/contracts/debts";
import { startTestApp } from "./harness";

test("deudas: principal fijo, pagos parciales, ajustes y cancelación", async (t) => {
  const { config, databases, userA, userB, cookieA, cookieB, call, close } =
    await startTestApp();
  const send = async (
    method: string,
    path: string,
    body: unknown,
    cookie = cookieA,
  ) => {
    const response = await call(`/api/v2${path}`, cookie, {
      method,
      headers: { origin: config.origin, "Idempotency-Key": randomUUID() },
      body: JSON.stringify(body),
    });
    const json = await response.json();
    return {
      status: response.status,
      data: json.data as DebtDetail,
      code: json.error?.code as string | undefined,
    };
  };
  const get = async (path: string, cookie = cookieA) => {
    const response = await call(`/api/v2${path}`, cookie);
    return { status: response.status, body: await response.json() };
  };
  try {
    const lucia = (
      await send("POST", "/contacts", { nickname: "Lucía" }).then(
        (r) => r as unknown as { data: { id: string } },
      )
    ).data;
    let debt: DebtDetail;

    await t.test(
      "registrar un préstamo en su moneda, sin intereses",
      async () => {
        const body = {
          contactId: lucia.id,
          description: "Préstamo en efectivo",
          currency: "USD",
          principalMinor: "100000",
          lentOn: "2026-09-15",
          dueOn: "2026-12-31",
        };
        assert.equal(
          (await send("POST", "/debts", { ...body, dueOn: "2026-09-01" }))
            .status,
          400,
        );
        assert.equal(
          (await send("POST", "/debts", { ...body, contactId: randomUUID() }))
            .status,
          404,
        );
        const created = await send("POST", "/debts", body);
        assert.equal(created.status, 201);
        debt = created.data;
        assert.equal(debt.status, "OPEN");
        assert.equal(debt.balanceMinor, "100000");
        assert.equal(debt.contactName, "Lucía");
        assert.deepEqual(
          debt.events.map((e) => e.kind),
          ["LENT"],
        );
      },
    );

    await t.test(
      "pagos parciales en la moneda de la deuda, sin sobrepago",
      async () => {
        const first = await send("POST", `/debts/${debt.id}/payments`, {
          version: debt.version,
          amountMinor: "25000",
          paidOn: "2026-10-15",
          note: "Me dio ARS al cambio del día",
        });
        assert.equal(first.status, 201);
        assert.equal(first.data.status, "PARTIALLY_PAID");
        assert.equal(first.data.balanceMinor, "75000");
        assert.equal(
          (
            await send("POST", `/debts/${debt.id}/payments`, {
              version: debt.version,
              amountMinor: "1",
              paidOn: "2026-10-16",
            })
          ).code,
          "VERSION_CONFLICT",
        );
        assert.equal(
          (
            await send("POST", `/debts/${debt.id}/payments`, {
              version: first.data.version,
              amountMinor: "75001",
              paidOn: "2026-10-16",
            })
          ).code,
          "PAYMENT_EXCEEDS_BALANCE",
        );
        assert.equal(
          (
            await send("POST", `/debts/${debt.id}/payments`, {
              version: first.data.version,
              amountMinor: "1000",
              paidOn: "2026-09-01",
            })
          ).code,
          "DATE_BEFORE_LOAN",
        );
        debt = first.data;
      },
    );

    await t.test("pagos concurrentes no superan el saldo", async () => {
      const attempts = await Promise.all(
        Array.from({ length: 3 }, () =>
          send("POST", `/debts/${debt.id}/payments`, {
            version: debt.version,
            amountMinor: "50000",
            paidOn: "2026-10-20",
          }),
        ),
      );
      assert.deepEqual(attempts.map((a) => a.status).sort(), [201, 409, 409]);
      debt = (await get(`/debts/${debt.id}`)).body.data;
      assert.equal(debt.balanceMinor, "25000");
    });

    await t.test("deshacer un pago lo conserva como revertido", async () => {
      const payment = debt.events.find(
        (e) => e.kind === "PAYMENT" && e.amountMinor === "50000",
      )!;
      const undone = await send(
        "POST",
        `/debts/${debt.id}/payments/${payment.id}/undo`,
        { version: debt.version },
      );
      assert.equal(undone.status, 200);
      assert.equal(undone.data.balanceMinor, "75000");
      assert.equal(
        undone.data.events.find((e) => e.id === payment.id)?.reverted,
        true,
      );
      assert.equal(
        (
          await send("POST", `/debts/${debt.id}/payments/${payment.id}/undo`, {
            version: undone.data.version,
          })
        ).code,
        "PAYMENT_REVERTED",
      );
      debt = undone.data;
    });

    await t.test(
      "ajustes explícitos con motivo: aumentar y perdonar parte",
      async () => {
        assert.equal(
          (
            await send("POST", `/debts/${debt.id}/adjustments`, {
              version: debt.version,
              kind: "INCREASE",
              amountMinor: "20000",
              effectiveOn: "2026-10-18",
              reason: " ",
            })
          ).status,
          400,
        );
        const increased = await send("POST", `/debts/${debt.id}/adjustments`, {
          version: debt.version,
          kind: "INCREASE",
          amountMinor: "20000",
          effectiveOn: "2026-10-18",
          reason: "Le presté para el pasaje",
        });
        assert.equal(increased.status, 201);
        assert.equal(increased.data.owedMinor, "120000");
        assert.equal(increased.data.balanceMinor, "95000");
        assert.equal(
          (
            await send("POST", `/debts/${debt.id}/adjustments`, {
              version: increased.data.version,
              kind: "FORGIVE",
              amountMinor: "95001",
              effectiveOn: "2026-10-19",
              reason: "Regalo",
            })
          ).code,
          "FORGIVE_EXCEEDS_BALANCE",
        );
        const forgiven = await send("POST", `/debts/${debt.id}/adjustments`, {
          version: increased.data.version,
          kind: "FORGIVE",
          amountMinor: "5000",
          effectiveOn: "2026-10-19",
          reason: "Redondeo",
        });
        assert.equal(forgiven.data.balanceMinor, "90000");
        assert.equal(forgiven.data.forgivenMinor, "5000");
        debt = forgiven.data;
      },
    );

    await t.test(
      "cancelar perdona el saldo sin inventar un pago y se puede reabrir",
      async () => {
        const cancelled = await send("POST", `/debts/${debt.id}/cancel`, {
          version: debt.version,
          reason: "No me lo va a devolver",
        });
        assert.equal(cancelled.data.status, "CANCELLED");
        assert.equal(cancelled.data.paidMinor, debt.paidMinor);
        assert.equal(
          (
            await send("POST", `/debts/${debt.id}/payments`, {
              version: cancelled.data.version,
              amountMinor: "1000",
              paidOn: "2026-10-20",
            })
          ).code,
          "DEBT_CANCELLED",
        );
        const list = (await get("/debts")).body.data;
        assert.deepEqual(list.totals, []);
        const reopened = await send("POST", `/debts/${debt.id}/reopen`, {
          version: cancelled.data.version,
        });
        assert.equal(reopened.data.status, "PARTIALLY_PAID");
        assert.equal(reopened.data.balanceMinor, "90000");
        const paid = await send("POST", `/debts/${debt.id}/payments`, {
          version: reopened.data.version,
          amountMinor: "90000",
          paidOn: "2026-10-20",
        });
        assert.equal(paid.data.status, "PAID");
        assert.equal(
          (
            await send("POST", `/debts/${debt.id}/cancel`, {
              version: paid.data.version,
              reason: "Nada",
            })
          ).code,
          "DEBT_PAID",
        );
        debt = paid.data;
      },
    );

    await t.test(
      "resumen por moneda y separación de gastos y repartos",
      async () => {
        await send("POST", "/debts", {
          contactId: lucia.id,
          description: "Préstamo ARS",
          currency: "ARS",
          principalMinor: "5000000",
          lentOn: "2026-10-01",
        });
        const { debts, totals } = (await get("/debts")).body.data;
        assert.deepEqual(totals, [
          { currency: "ARS", outstandingMinor: "5000000", count: 1 },
        ]);
        assert.equal(debts[0].description, "Préstamo ARS");
        assert.equal(debts.at(-1).status, "PAID");
        // Las deudas no aparecen en el mes ni en los compartidos.
        const month = (await get("/months/2026-10")).body.data;
        assert.deepEqual(month.occurrences, []);
        const shared = (await get("/shared/2026-10")).body.data;
        assert.deepEqual(shared.people, []);
      },
    );

    await t.test(
      "las deudas son privadas y la base protege el saldo",
      async () => {
        assert.equal((await get(`/debts/${debt.id}`, cookieB)).status, 404);
        assert.deepEqual((await get("/debts", cookieB)).body.data.debts, []);
        assert.equal(
          (
            await send(
              "POST",
              `/debts/${debt.id}/payments`,
              { version: debt.version, amountMinor: "1", paidOn: "2026-10-20" },
              cookieB,
            )
          ).status,
          404,
        );
        assert.deepEqual(
          await withUser(databases.app, userB.id, (tx) =>
            tx.personalDebt.findMany(),
          ),
          [],
        );
        // Saldo negativo, ajustes editables o pagos modificados se rechazan en la base.
        await assert.rejects(() =>
          withUser(databases.app, userA.id, (tx) =>
            tx.personalDebtPayment.create({
              data: {
                ownerId: userA.id,
                debtId: debt.id,
                amountMinor: 1n,
                paidOn: new Date("2026-10-20T00:00:00Z"),
              },
            }),
          ),
        );
        await assert.rejects(() =>
          withUser(databases.app, userA.id, (tx) =>
            tx.personalDebtAdjustment.updateMany({
              where: { debtId: debt.id },
              data: { amountMinor: 1n },
            }),
          ),
        );
        await assert.rejects(() =>
          withUser(databases.app, userA.id, (tx) =>
            tx.personalDebtPayment.updateMany({
              where: { debtId: debt.id },
              data: { amountMinor: 1n },
            }),
          ),
        );
        const audit = await withUser(databases.app, userA.id, (tx) =>
          tx.auditLog.findMany({
            where: { entityId: debt.id },
            orderBy: { createdAt: "asc" },
          }),
        );
        assert.ok(
          [
            "debt.created",
            "debt.payment_added",
            "debt.payment_undone",
            "debt.increased",
            "debt.partially_forgiven",
            "debt.cancelled",
            "debt.reopened",
          ].every((action) => audit.some((entry) => entry.action === action)),
        );
      },
    );
  } finally {
    await close();
  }
});
