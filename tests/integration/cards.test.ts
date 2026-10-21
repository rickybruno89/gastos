import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { startTestApp } from "./harness";
import { withUser } from "../../server/persistence/database";
import type { CardStatement, CreditCard } from "../../shared/contracts/cards";
import type { Contact } from "../../shared/contracts/sharing";

test("tarjetas: cuotas, recurrentes, conciliación y pago completo", async (t) => {
  const h = await startTestApp();
  async function send<T = CardStatement>(
    path: string,
    body: unknown,
    method = "POST",
    cookie = h.cookieA,
    key = randomUUID(),
  ) {
    const r = await h.call("/api/v2" + path, cookie, {
        method,
        headers: { origin: h.config.origin, "Idempotency-Key": key },
        body: JSON.stringify(body),
      }),
      json = await r.json();
    return { status: r.status, data: json.data as T, code: json.error?.code };
  }
  async function get<T = CardStatement>(path: string, cookie = h.cookieA) {
    const r = await h.call("/api/v2" + path, cookie);
    assert.equal(r.status, 200);
    return (await r.json()).data as T;
  }
  async function statement(period = "2026-10", cookie = h.cookieA) {
    return get(`/cards/${card.id}/statements/${period}`, cookie);
  }
  let card: CreditCard, contact: Contact, s: CardStatement;
  try {
    await t.test("tarjeta propia, contratos e idempotencia", async () => {
      const input = {
          name: "Visa de prueba",
          lastFour: "4821",
          closingDay: 31,
          dueDay: 10,
        },
        key = randomUUID();
      const created = await send<CreditCard>(
        "/cards",
        input,
        "POST",
        h.cookieA,
        key,
      );
      assert.equal(created.status, 201);
      card = created.data;
      assert.deepEqual(
        (await send<CreditCard>("/cards", input, "POST", h.cookieA, key)).data,
        card,
      );
      assert.equal(
        (await send("/cards", { ...input, ownerId: h.userB.id })).status,
        400,
      );
      contact = (
        await send<Contact>("/contacts", {
          nickname: "Juan",
          email: h.userB.email,
        })
      ).data;
      s = await statement("2027-02");
      assert.equal(s.closingDate, "2027-02-28");
      assert.equal(s.dueDate, "2027-03-10");
      assert.deepEqual(await get("/cards", h.cookieB), []);
    });
    await t.test(
      "cuotas conservan centavos, reparto del total y una fuente canónica",
      async () => {
        const purchase = await send<{ id: string }>(
          `/cards/${card.id}/purchases`,
          {
            description: "Heladera",
            occurredOn: "2026-10-01",
            firstPeriod: "2026-10",
            amountMinor: "100",
            currency: "ARS",
            installments: 3,
            shares: [{ contactId: contact.id, shareBps: 5000 }],
          },
        );
        assert.equal(purchase.status, 201);
        const months = await Promise.all(
          ["2026-10", "2026-11", "2026-12"].map((p) => statement(p)),
        );
        assert.deepEqual(
          months.map((m) => m.charges[0].amountMinor),
          ["34", "33", "33"],
        );
        assert.equal(
          months.reduce(
            (sum, m) =>
              sum +
              BigInt(
                m.charges[0].allocations.find(
                  (a) => a.contactId === contact.id,
                )!.amountMinor,
              ),
            0n,
          ),
          50n,
        );
        assert.deepEqual(
          months.map((m) => m.charges[0].installmentNo),
          [1, 2, 3],
        );
        assert.equal(
          (
            await h.call(
              `/api/v2/card-charges/${months[0].charges[0].id}/payments`,
              h.cookieA,
              {
                method: "POST",
                headers: { origin: h.config.origin },
                body: "{}",
              },
            )
          ).status,
          404,
        );
        const repeat = await Promise.all(
          Array.from({ length: 5 }, () => statement()),
        );
        assert.ok(repeat.every((m) => m.charges.length === 1));
        s = months[0];
        const renamed = await send(
          `/card-charges/${s.charges[0].id}`,
          {
            version: s.charges[0].version,
            statementVersion: s.version,
            description: "Heladera nueva",
            amountMinor: s.charges[0].amountMinor,
            shares: [{ contactId: contact.id, shareBps: 5000 }],
          },
          "PATCH",
        );
        assert.equal(renamed.status, 200);
        assert.deepEqual(
          renamed.data.charges[0].allocations,
          s.charges[0].allocations,
        );
        s = renamed.data;
      },
    );
    await t.test(
      "diferencia real exige corregir antes de vincular; nunca mezcla monedas",
      async () => {
        const added = await send(`/statements/${s.id}/lines`, {
          version: s.version,
          description: "Heladera banco",
          postedOn: "2026-10-02",
          amountMinor: "35",
          currency: "ARS",
        });
        assert.equal(added.status, 201);
        s = added.data;
        assert.equal(
          (
            await send(`/statements/${s.id}/matches`, {
              version: s.version,
              chargeId: s.charges[0].id,
              lineId: s.lines[0].id,
            })
          ).code,
          "AMOUNT_MISMATCH",
        );
        assert.equal(
          (await send(`/statements/${s.id}/payments`, { version: s.version }))
            .code,
          "NOT_RECONCILED",
        );
        assert.equal(
          (await send(`/statements/${s.id}/reconcile`, { version: s.version }))
            .code,
          "UNRESOLVED_ITEMS",
        );
        const corrected = await send(
          `/card-charges/${s.charges[0].id}`,
          {
            version: s.charges[0].version,
            statementVersion: s.version,
            amountMinor: "35",
          },
          "PATCH",
        );
        assert.equal(corrected.status, 200);
        s = corrected.data;
        s = (
          await send(`/statements/${s.id}/matches`, {
            version: s.version,
            chargeId: s.charges[0].id,
            lineId: s.lines[0].id,
          })
        ).data;
        assert.equal(s.charges[0].status, "MATCHED");
        assert.equal(
          s.charges[0].allocations.reduce(
            (sum, a) => sum + BigInt(a.amountMinor),
            0n,
          ),
          35n,
        );
        assert.equal(
          (
            await send(
              `/card-charges/${s.charges[0].id}`,
              {
                version: s.charges[0].version,
                statementVersion: s.version,
                amountMinor: "36",
              },
              "PATCH",
            )
          ).code,
          "CHARGE_MATCHED",
        );
        await send(`/cards/${card.id}/purchases`, {
          description: "Servicio USD",
          occurredOn: "2026-10-02",
          firstPeriod: "2026-10",
          amountMinor: "2500",
          currency: "USD",
          installments: 1,
        });
        s = await statement();
        assert.deepEqual(s.totals, [
          { currency: "ARS", amountMinor: "35" },
          { currency: "USD", amountMinor: "2500" },
        ]);
        s = (
          await send(`/statements/${s.id}/matches`, {
            version: s.version,
            chargeId: s.charges.find((c) => c.currency === "USD")!.id,
          })
        ).data;
      },
    );
    await t.test(
      "desconocidos: consumo compartido nuevo o ajuste excluido con motivo",
      async () => {
        s = (
          await send(`/statements/${s.id}/lines`, {
            version: s.version,
            description: "Consumo olvidado",
            postedOn: "2026-10-03",
            amountMinor: "500",
            currency: "ARS",
          })
        ).data;
        const unknown = s.lines.find((l) => l.status === "UNMATCHED_ACTUAL")!;
        s = (
          await send(`/statements/${s.id}/lines/${unknown.id}/resolve`, {
            version: s.version,
            action: "CREATE_CHARGE",
            shares: [{ contactId: contact.id, shareBps: 10000 }],
          })
        ).data;
        assert.equal(
          s.charges
            .find((c) => c.description === "Consumo olvidado")!
            .allocations.find((a) => a.contactId === contact.id)!.amountMinor,
          "500",
        );
        s = (
          await send(`/statements/${s.id}/lines`, {
            version: s.version,
            description: "Impuesto",
            postedOn: "2026-10-31",
            amountMinor: "90000",
            currency: "ARS",
          })
        ).data;
        const tax = s.lines.find((l) => l.description === "Impuesto")!;
        assert.equal(
          (
            await send(`/statements/${s.id}/lines/${tax.id}/resolve`, {
              version: s.version,
              action: "IGNORE",
            })
          ).status,
          400,
        );
        s = (
          await send(`/statements/${s.id}/lines/${tax.id}/resolve`, {
            version: s.version,
            action: "IGNORE",
            reason: "Impuesto del banco",
          })
        ).data;
        assert.equal(
          s.totals.find((t) => t.currency === "ARS")!.amountMinor,
          "535",
        );
        const shared = await get<{
          people: { theyOwe: { amountMinor: string }[] }[];
        }>("/shared/2026-10");
        assert.equal(
          shared.people[0].theyOwe.reduce(
            (sum, l) => sum + BigInt(l.amountMinor),
            0n,
          ),
          518n,
        );
      },
    );
    await t.test(
      "pago completo concurrente, inmutabilidad en base, undo y corrección",
      async () => {
        s = (
          await send(`/statements/${s.id}/reconcile`, { version: s.version })
        ).data;
        assert.equal(s.status, "RECONCILED");
        const attempts = await Promise.all(
          Array.from({ length: 3 }, () =>
            send(`/statements/${s.id}/payments`, {
              version: s.version,
              paidOn: "2026-11-10",
              channel: "Transferencia",
              notes: "Juan pagó la mitad",
            }),
          ),
        );
        assert.deepEqual(attempts.map((a) => a.status).sort(), [200, 409, 409]);
        s = attempts.find((a) => a.status === 200)!.data;
        assert.equal(s.status, "PAID");
        assert.equal(s.payment?.notes, "Juan pagó la mitad");
        assert.ok(s.charges.every((c) => c.status === "MATCHED"));
        assert.equal(
          await withUser(h.databases.app, h.userA.id, (tx) =>
            tx.cardPayment.count({
              where: { statementId: s.id, revertedAt: null },
            }),
          ),
          1,
        );
        await assert.rejects(() =>
          withUser(h.databases.app, h.userA.id, (tx) =>
            tx.cardCharge.update({
              where: { id: s.charges[0].id },
              data: { amountMinor: 99n },
            }),
          ),
        );
        await assert.rejects(() =>
          withUser(h.databases.app, h.userA.id, (tx) =>
            tx.cardAllocation.updateMany({
              where: { chargeId: s.charges[0].id },
              data: { amountMinor: 99n },
            }),
          ),
        );
        assert.equal(
          (
            await send(
              `/statements/${s.id}`,
              {
                version: s.version,
                closingDate: "2026-10-30",
                dueDate: "2026-11-10",
              },
              "PATCH",
            )
          ).code,
          "STATEMENT_LOCKED",
        );
        const paidShared = await get("/shared/2026-10");
        s = (
          await send(`/statements/${s.id}/undo-payment`, { version: s.version })
        ).data;
        assert.equal(s.status, "RECONCILED");
        assert.equal(s.payment, null);
        assert.deepEqual(await get("/shared/2026-10"), paidShared);
        s = (await send(`/statements/${s.id}/reopen`, { version: s.version }))
          .data;
        assert.equal(s.status, "DRAFT");
        const payment = await withUser(h.databases.app, h.userA.id, (tx) =>
          tx.cardPayment.findFirstOrThrow({ where: { statementId: s.id } }),
        );
        assert.ok(payment.revertedAt);
      },
    );
    await t.test(
      "contraparte lee solo su parte y ve meses sin que el propietario los abra",
      async () => {
        const invited = await send<Contact>(
          `/contacts/${contact.id}/invitation`,
          {},
        );
        assert.equal(invited.status, 201);
        assert.equal(
          (
            await send(
              `/invitations/${invited.data.connection!.id}/accept`,
              {},
              "POST",
              h.cookieB,
            )
          ).status,
          200,
        );
        const incoming = await get<{
          people: { iOwe: { expenseName: string; amountMinor: string }[] }[];
        }>("/shared/2026-11", h.cookieB);
        assert.equal(incoming.people[0].iOwe[0].amountMinor, "17");
        const denied = await h.call(`/api/v2/statements/${s.id}`, h.cookieB);
        assert.equal(denied.status, 404);
        const visible = await withUser(h.databases.app, h.userB.id, (tx) =>
          tx.cardAllocation.findMany({
            where: { period: new Date("2026-11-01") },
          }),
        );
        assert.equal(visible.length, 1);
        assert.equal(visible[0].contactId, contact.id);
        const ownContact = (
          await send<Contact>(
            "/contacts",
            { nickname: "Ajeno" },
            "POST",
            h.cookieB,
          )
        ).data;
        assert.equal(
          (
            await send(`/cards/${card.id}/purchases`, {
              description: "No",
              occurredOn: "2026-10-01",
              firstPeriod: "2026-10",
              amountMinor: "100",
              currency: "ARS",
              shares: [{ contactId: ownContact.id, shareBps: 5000 }],
            })
          ).status,
          404,
        );
        await send("/expenses", {
          name: "Mensual compartido",
          currency: "ARS",
          amountMinor: "10001",
          dueDay: 20,
          firstPeriod: "2027-01",
          intervalMonths: 2,
          shares: [{ contactId: contact.id, shareBps: 5000 }],
        });
        const future = await get<{
          people: { iOwe: { expenseName: string; amountMinor: string }[] }[];
        }>("/shared/2027-01", h.cookieB);
        assert.equal(
          future.people[0].iOwe.find(
            (l) => l.expenseName === "Mensual compartido",
          )!.amountMinor,
          "5001",
        );
        const intermediate = await get<{ people: unknown[] }>(
          "/shared/2027-02",
          h.cookieB,
        );
        assert.equal(intermediate.people.length, 0);
        await get("/months/2027-01");
        assert.deepEqual(await get("/shared/2027-01", h.cookieB), future);
      },
    );
    let recurringId: string;
    await t.test(
      "recurrentes on-demand, forecast conectado, cambios futuros y baja/reactivación",
      async () => {
        const created = await send<{ id: string }>(
          `/cards/${card.id}/recurring`,
          {
            description: "Streaming",
            currency: "USD",
            amountMinor: "1201",
            firstPeriod: "2026-11",
            shares: [{ contactId: contact.id, shareBps: 5000 }],
          },
        );
        assert.equal(created.status, 201);
        recurringId = created.data.id;
        const forecast = await get<{
          people: { iOwe: { expenseName: string; amountMinor: string }[] }[];
        }>("/shared/2027-03", h.cookieB);
        assert.equal(
          forecast.people[0].iOwe.find((l) => l.expenseName === "Streaming")!
            .amountMinor,
          "601",
        );
        let december = await statement("2026-12");
        const series = december.recurring.find((r) => r.id === recurringId)!;
        assert.equal(
          (
            await send(
              `/card-recurring/${recurringId}`,
              {
                version: series.version,
                fromPeriod: "2026-12",
                amountMinor: "2000",
              },
              "PATCH",
            )
          ).status,
          200,
        );
        december = await statement("2026-12");
        assert.equal(
          december.charges.find((c) => c.recurringId === recurringId)!
            .amountMinor,
          "2000",
        );
        const march = await statement("2027-03");
        assert.equal(
          march.charges.find((c) => c.recurringId === recurringId)!.amountMinor,
          "2000",
        );
        december = await statement("2026-12");
        const decemberCharge = december.charges.find(
          (c) => c.recurringId === recurringId,
        )!;
        assert.equal(
          (
            await send(
              `/card-charges/${decemberCharge.id}`,
              {
                version: decemberCharge.version,
                statementVersion: december.version,
                amountMinor: "2500",
                scope: "THIS_AND_FUTURE",
              },
              "PATCH",
            )
          ).status,
          200,
        );
        assert.equal(
          (await statement("2027-03")).charges.find(
            (c) => c.recurringId === recurringId,
          )!.amountMinor,
          "2500",
        );
        const currentSeries = (await statement("2027-03")).recurring.find(
          (r) => r.id === recurringId,
        )!;
        assert.equal(
          (
            await send(
              `/card-recurring/${recurringId}`,
              {
                version: currentSeries.version,
                fromPeriod: "2026-12",
                endPeriod: "2026-12",
              },
              "PATCH",
            )
          ).status,
          200,
        );
        assert.equal((await statement("2027-03")).charges.length, 0);
        const stopped = (await statement("2026-12")).recurring.find(
          (r) => r.id === recurringId,
        )!;
        assert.equal(
          (
            await send(
              `/card-recurring/${recurringId}`,
              {
                version: stopped.version,
                fromPeriod: "2026-12",
                endPeriod: null,
              },
              "PATCH",
            )
          ).status,
          200,
        );
        const reads = await Promise.all(
          Array.from({ length: 3 }, () => statement("2027-03")),
        );
        assert.ok(
          reads.every(
            (m) =>
              m.charges.filter((c) => c.recurringId === recurringId).length ===
              1,
          ),
        );
      },
    );
    await t.test(
      "ausente se arrastra sin duplicar ni cambiar la fecha/período de origen",
      async () => {
        let november = await statement("2026-11");
        const absent = november.charges.find(
          (c) => c.recurringId === recurringId,
        )!;
        const before = await get<{
          people: { iOwe: { expenseName: string }[] }[];
        }>("/shared/2026-11", h.cookieB);
        assert.ok(
          before.people[0].iOwe.some((l) => l.expenseName === "Streaming"),
        );
        const deferred = await send(
          `/statements/${november.id}/charges/${absent.id}/defer`,
          {
            version: november.version,
            chargeVersion: absent.version,
            reason: "No apareció en el banco",
          },
        );
        assert.equal(deferred.status, 200);
        november = deferred.data;
        assert.equal(november.deferred.length, 1);
        assert.equal(november.deferred[0].toPeriod, "2026-12");
        assert.ok(
          !(await statement("2026-11")).charges.some((c) => c.id === absent.id),
        );
        const december = await statement("2026-12"),
          carried = december.charges.find((c) => c.id === absent.id)!;
        assert.equal(carried.expectedPeriod, "2026-11");
        assert.equal(carried.occurredOn, "2026-11-01");
        assert.equal(
          december.charges.filter((c) => c.recurringId === recurringId).length,
          2,
        );
        const incoming = await get<{
          people: { iOwe: { expenseName: string }[] }[];
        }>("/shared/2026-11", h.cookieB);
        assert.ok(
          !incoming.people[0].iOwe.some((l) => l.expenseName === "Streaming"),
        );
        assert.equal(
          (
            await send(
              `/cards/${card.id}`,
              { version: card.version, archived: true },
              "PATCH",
            )
          ).code,
          "RECURRING_ACTIVE",
        );
      },
    );
    await t.test(
      "API directa no omite recurrentes y duplicados exigen confirmación",
      async () => {
        let other = (
          await send<CreditCard>("/cards", {
            name: "Otra tarjeta",
            lastFour: "1111",
            closingDay: 28,
            dueDay: 10,
          })
        ).data;
        other = (
          await send<CreditCard>(
            `/cards/${other.id}`,
            {
              version: other.version,
              lastFour: null,
            },
            "PATCH",
          )
        ).data;
        assert.equal(other.lastFour, null);
        assert.equal(
          (
            await send(`/cards/${other.id}/recurring`, {
              description: "Abono",
              firstPeriod: "2027-06",
              currency: "ARS",
              amountMinor: "100",
            })
          ).status,
          201,
        );
        const input = {
          description: "Compra directa",
          occurredOn: "2027-07-01",
          firstPeriod: "2027-07",
          currency: "ARS",
          amountMinor: "200",
        };
        assert.equal(
          (await send(`/cards/${other.id}/purchases`, input)).status,
          201,
        );
        assert.equal(
          (await send(`/cards/${other.id}/purchases`, input)).code,
          "POSSIBLE_DUPLICATE",
        );
        assert.equal(
          (
            await send(`/cards/${other.id}/purchases`, {
              ...input,
              confirmDuplicate: true,
            })
          ).status,
          201,
        );
        const raw = await withUser(h.databases.app, h.userA.id, (tx) =>
          tx.cardStatement.findFirstOrThrow({
            where: { cardId: other.id, period: new Date("2027-07-01") },
            include: { charges: true },
          }),
        );
        assert.equal(raw.charges.length, 2);
        // Sin GET previo: la mutación detecta el recurrente faltante y exige refrescar.
        assert.equal(
          (
            await send(`/statements/${raw.id}/matches`, {
              version: raw.version,
              chargeId: raw.charges[0].id,
            })
          ).code,
          "VERSION_CONFLICT",
        );
        const full = await get(`/statements/${raw.id}`);
        assert.equal(full.charges.length, 3);
        assert.equal(full.charges.filter((c) => c.recurringId).length, 1);
        assert.equal(
          (
            await send(`/statements/${full.id}/reconcile`, {
              version: full.version,
            })
          ).code,
          "UNRESOLVED_ITEMS",
        );
      },
    );
    await t.test("aislamiento, resumen mensual y auditoría", async () => {
      const month = await get<{ statements: { cardName: string }[] }>(
        "/card-months/2026-12",
      );
      assert.equal(month.statements[0].cardName, card.name);
      assert.deepEqual(
        (
          await get<{ statements: unknown[] }>(
            "/card-months/2026-12",
            h.cookieC,
          )
        ).statements,
        [],
      );
      assert.deepEqual(
        await withUser(h.databases.app, h.userB.id, (tx) =>
          tx.cardStatement.findMany(),
        ),
        [],
      );
      const log = await withUser(h.databases.app, h.userA.id, (tx) =>
        tx.auditLog.findMany({ where: { entityId: s.id } }),
      );
      assert.ok(log.some((l) => l.action === "card.statement_pay"));
      assert.ok(log.some((l) => l.action === "card.statement_undo"));
    });
  } finally {
    await h.close();
  }
});
