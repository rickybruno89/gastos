import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { withUser } from "../../server/persistence/database";
import type { Month, Occurrence } from "../../shared/contracts/expenses";
import { startTestApp } from "./harness";

test("gastos mensuales: crear, consultar, cambiar importe, pagar y deshacer", async (t) => {
  const { config, databases, userA, userB, cookieA, cookieB, call, close } =
    await startTestApp();
  const send = (
    method: string,
    path: string,
    body: unknown,
    options: { cookie?: string; key?: string | null } = {},
  ) =>
    call(`/api/v2${path}`, options.cookie ?? cookieA, {
      method,
      headers: {
        origin: config.origin,
        ...(options.key !== null && {
          "Idempotency-Key": options.key ?? randomUUID(),
        }),
      },
      body: JSON.stringify(body),
    });
  const month = async (period: string, cookie = cookieA) => {
    const response = await call(`/api/v2/months/${period}`, cookie);
    assert.equal(response.status, 200);
    return (await response.json()).data as Month;
  };
  const find = async (period: string, name: string) => {
    const row = (await month(period)).occurrences.find((o) => o.name === name);
    assert.ok(row, `${name} en ${period}`);
    return row;
  };
  const create = async (body: Record<string, unknown>) => {
    const response = await send("POST", "/expenses", body);
    assert.equal(response.status, 201);
    return (await response.json()).data;
  };
  try {
    await t.test(
      "crear exige Idempotency-Key, origen y datos válidos",
      async () => {
        const body = {
          name: "Alquiler",
          currency: "ARS",
          amountMinor: "28000000",
          dueDay: 31,
          firstPeriod: "2026-10",
        };
        assert.equal(
          (await send("POST", "/expenses", body, { key: null })).status,
          400,
        );
        assert.equal(
          (
            await call("/api/v2/expenses", cookieA, {
              method: "POST",
              headers: { "Idempotency-Key": randomUUID() },
              body: JSON.stringify(body),
            })
          ).status,
          403,
        );
        for (const invalid of [
          { ...body, amountMinor: "0" },
          { ...body, amountMinor: "10.5" },
          { ...body, currency: "EUR" },
          { ...body, dueDay: 32 },
          { ...body, firstPeriod: "2026-13" },
          { ...body, ownerId: userB.id },
        ])
          assert.equal(
            (await send("POST", "/expenses", invalid)).status,
            400,
            JSON.stringify(invalid),
          );
        const created = await create(body);
        assert.equal(created.firstPeriod, "2026-10");
        await create({
          name: "Suscripción",
          currency: "USD",
          amountMinor: "2000",
          dueDay: 5,
          firstPeriod: "2026-10",
        });
      },
    );

    await t.test(
      "consultar materializa una sola vez, sin meses anteriores y con meses cortos",
      async () => {
        assert.deepEqual((await month("2026-09")).occurrences, []);
        const [first, second] = await Promise.all([
          month("2026-10"),
          month("2026-10"),
        ]);
        assert.deepEqual(
          first.occurrences.map((o) => o.id),
          second.occurrences.map((o) => o.id),
        );
        assert.equal(first.occurrences.length, 2);
        assert.deepEqual(first.totals, [
          { currency: "ARS", pendingMinor: "28000000", paidMinor: "0" },
          { currency: "USD", pendingMinor: "2000", paidMinor: "0" },
        ]);
        assert.match(first.today, /^\d{4}-\d{2}-\d{2}$/);
        const rent = first.occurrences.find((o) => o.name === "Alquiler")!;
        assert.equal(rent.dueDate, "2026-10-31");
        assert.equal(rent.status, "PLANNED");
        assert.equal(rent.payment, null);
        const november = await find("2026-11", "Alquiler");
        assert.equal(november.dueDate, "2026-11-30");
        assert.equal(november.dueDay, 31);
        assert.equal((await find("2027-02", "Alquiler")).dueDate, "2027-02-28");
      },
    );

    await t.test(
      "cambiar importe distingue solo este mes de este mes y futuros",
      async () => {
        const october = await find("2026-10", "Alquiler");
        const onlyThis = await send("PATCH", `/occurrences/${october.id}`, {
          version: october.version,
          amount: { amountMinor: "29000000", scope: "THIS_MONTH" },
        });
        assert.equal(onlyThis.status, 200);
        assert.equal((await onlyThis.json()).data.amountMinor, "29000000");
        assert.equal(
          (await find("2026-11", "Alquiler")).amountMinor,
          "28000000",
        );

        // Diciembre ya materializado y enero sin consultar siguen la nueva regla.
        await find("2026-12", "Alquiler");
        const november = await find("2026-11", "Alquiler");
        const future = await send("PATCH", `/occurrences/${november.id}`, {
          version: november.version,
          amount: { amountMinor: "30000000", scope: "THIS_AND_FUTURE" },
        });
        assert.equal(future.status, 200);
        assert.equal(
          (await find("2026-10", "Alquiler")).amountMinor,
          "29000000",
        );
        assert.equal(
          (await find("2026-11", "Alquiler")).amountMinor,
          "30000000",
        );
        assert.equal(
          (await find("2026-12", "Alquiler")).amountMinor,
          "30000000",
        );
        assert.equal(
          (await find("2027-01", "Alquiler")).amountMinor,
          "30000000",
        );

        const stale = await send("PATCH", `/occurrences/${november.id}`, {
          version: november.version,
          amount: { amountMinor: "1", scope: "THIS_MONTH" },
        });
        assert.equal(stale.status, 409);
        assert.equal((await stale.json()).error.code, "VERSION_CONFLICT");
      },
    );

    await t.test(
      "un nuevo vencimiento actualiza el mes actual y la regla futura",
      async () => {
        const december = await find("2026-12", "Alquiler");
        const response = await send("PATCH", `/occurrences/${december.id}`, {
          version: december.version,
          dueDay: 10,
        });
        assert.equal(response.status, 200);
        assert.equal((await response.json()).data.dueDate, "2026-12-10");
        assert.equal((await find("2026-11", "Alquiler")).dueDate, "2026-11-30");
        assert.equal((await find("2027-01", "Alquiler")).dueDate, "2027-01-10");
        assert.equal((await find("2027-02", "Alquiler")).dueDate, "2027-02-10");
        // El importe de la regla futura se conserva.
        assert.equal(
          (await find("2027-02", "Alquiler")).amountMinor,
          "30000000",
        );
      },
    );

    await t.test(
      "pagar es idempotente, auditable y bloquea la edición",
      async () => {
        const october = await find("2026-10", "Alquiler");
        const key = randomUUID();
        const body = { version: october.version };
        const paid = await send(
          "POST",
          `/occurrences/${october.id}/payments`,
          body,
          { key },
        );
        assert.equal(paid.status, 201);
        const paidBody = await paid.json();
        assert.equal(paidBody.data.status, "PAID");
        const today = (await month("2026-10")).today;
        assert.deepEqual(paidBody.data.payment, {
          paidOn: today,
          channel: null,
          amountMinor: "29000000",
          annual: false,
        });

        const replay = await send(
          "POST",
          `/occurrences/${october.id}/payments`,
          body,
          { key },
        );
        assert.equal(replay.status, 201);
        assert.deepEqual(await replay.json(), paidBody);
        const reused = await send(
          "POST",
          `/occurrences/${october.id}/payments`,
          { version: october.version, channel: "Transferencia" },
          { key },
        );
        assert.equal(reused.status, 422);

        const again = await send(
          "POST",
          `/occurrences/${october.id}/payments`,
          {
            version: paidBody.data.version,
          },
        );
        assert.equal(again.status, 409);
        assert.equal((await again.json()).error.code, "OCCURRENCE_PAID");
        const edit = await send("PATCH", `/occurrences/${october.id}`, {
          version: paidBody.data.version,
          amount: { amountMinor: "1", scope: "THIS_MONTH" },
        });
        assert.equal(edit.status, 409);
        assert.equal((await edit.json()).error.code, "OCCURRENCE_PAID");

        const totals = (await month("2026-10")).totals.find(
          (total) => total.currency === "ARS",
        );
        assert.deepEqual(totals, {
          currency: "ARS",
          pendingMinor: "0",
          paidMinor: "29000000",
        });
      },
    );

    await t.test(
      "un pago futuro queda protegido ante cambios de regla anteriores",
      async () => {
        const january = await find("2027-01", "Alquiler");
        const paid = await send("POST", `/occurrences/${january.id}/payments`, {
          version: january.version,
          paidOn: "2027-01-03",
          channel: "Débito",
        });
        assert.equal(paid.status, 201);
        const december = await find("2026-12", "Alquiler");
        const change = await send("PATCH", `/occurrences/${december.id}`, {
          version: december.version,
          amount: { amountMinor: "31000000", scope: "THIS_AND_FUTURE" },
        });
        assert.equal(change.status, 200);
        const after = await find("2027-01", "Alquiler");
        assert.equal(after.amountMinor, "30000000");
        assert.deepEqual(after.payment, {
          paidOn: "2027-01-03",
          channel: "Débito",
          amountMinor: "30000000",
          annual: false,
        });
        assert.equal(
          (await find("2027-02", "Alquiler")).amountMinor,
          "31000000",
        );
      },
    );

    await t.test(
      "deshacer devuelve el gasto a pendiente y permite corregirlo",
      async () => {
        const october = await find("2026-10", "Alquiler");
        const undone = await send(
          "POST",
          `/occurrences/${october.id}/undo-payment`,
          { version: october.version },
        );
        assert.equal(undone.status, 200);
        const body = (await undone.json()).data as Occurrence;
        assert.equal(body.status, "PLANNED");
        assert.equal(body.payment, null);
        const twice = await send(
          "POST",
          `/occurrences/${october.id}/undo-payment`,
          { version: body.version },
        );
        assert.equal((await twice.json()).error.code, "NOT_PAID");
        const fixed = await send("PATCH", `/occurrences/${october.id}`, {
          version: body.version,
          amount: { amountMinor: "28500000", scope: "THIS_MONTH" },
        });
        assert.equal(fixed.status, 200);
        const payments = await withUser(databases.app, userA.id, (tx) =>
          tx.expensePayment.findMany({ where: { occurrenceId: october.id } }),
        );
        assert.equal(payments.length, 1);
        assert.ok(payments[0].revertedAt);
        const actions = await withUser(databases.app, userA.id, (tx) =>
          tx.auditLog.findMany({
            where: { entityId: october.id },
            orderBy: { createdAt: "asc" },
          }),
        );
        assert.deepEqual(
          actions.map((entry) => entry.action),
          [
            "occurrence.changed",
            "occurrence.paid",
            "occurrence.payment_undone",
            "occurrence.changed",
          ],
        );
      },
    );

    await t.test("doble click concurrente registra un solo pago", async () => {
      const subscription = await find("2026-10", "Suscripción");
      const responses = await Promise.all(
        Array.from({ length: 4 }, () =>
          send("POST", `/occurrences/${subscription.id}/payments`, {
            version: subscription.version,
          }),
        ),
      );
      assert.deepEqual(
        responses.map((response) => response.status).sort(),
        [201, 409, 409, 409],
      );
      const payments = await withUser(databases.app, userA.id, (tx) =>
        tx.expensePayment.count({
          where: { occurrenceId: subscription.id, revertedAt: null },
        }),
      );
      assert.equal(payments, 1);
    });

    await t.test(
      "otra cuenta no ve ni modifica los gastos ajenos",
      async () => {
        assert.deepEqual((await month("2026-10", cookieB)).occurrences, []);
        const october = await find("2026-10", "Alquiler");
        for (const [method, path, body] of [
          [
            "PATCH",
            `/occurrences/${october.id}`,
            { version: october.version, dueDay: 1 },
          ],
          [
            "POST",
            `/occurrences/${october.id}/payments`,
            { version: october.version },
          ],
          [
            "POST",
            `/occurrences/${october.id}/undo-payment`,
            { version: october.version },
          ],
        ] as const) {
          const response = await send(method, path, body, { cookie: cookieB });
          assert.equal(response.status, 404);
        }
        assert.equal(
          (await call(`/api/v2/months/2026-10`)).status,
          401,
          "sin sesión",
        );
        assert.equal(
          (await call(`/api/v2/months/2026-1`, cookieA)).status,
          400,
        );
        const rows = await withUser(databases.app, userB.id, (tx) =>
          Promise.all([
            tx.monthlyExpenseSeries.count(),
            tx.monthlyExpenseOccurrence.count(),
            tx.expensePayment.count(),
            tx.auditLog.count(),
            tx.idempotencyKey.count(),
          ]),
        );
        assert.deepEqual(rows, [0, 0, 0, 0, 0]);
        await assert.rejects(() =>
          withUser(databases.app, userB.id, (tx) =>
            tx.monthlyExpenseOccurrence.create({
              data: {
                ownerId: userB.id,
                seriesId: october.seriesId,
                period: new Date("2030-01-01T00:00:00Z"),
                dueDate: new Date("2030-01-10T00:00:00Z"),
                amountMinor: 1n,
                currency: "ARS",
              },
            }),
          ),
        );
      },
    );

    await t.test(
      "la base rechaza editar una ocurrencia pagada y el audit log es solo de alta",
      async () => {
        const january = await find("2027-01", "Alquiler");
        await assert.rejects(() =>
          withUser(databases.app, userA.id, (tx) =>
            tx.monthlyExpenseOccurrence.update({
              where: { id: january.id },
              data: { amountMinor: 1n },
            }),
          ),
        );
        await assert.rejects(() =>
          withUser(databases.app, userA.id, (tx) => tx.auditLog.deleteMany({})),
        );
      },
    );
  } finally {
    await close();
  }
});
