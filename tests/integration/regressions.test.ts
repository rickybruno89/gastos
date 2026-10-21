import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { startTestApp } from "./harness";
import { withUser } from "../../server/persistence/database";
import { payAnnual } from "../../server/application/monthly-expenses";
import type { Tx } from "../../server/application/common";
import type { Occurrence } from "../../shared/contracts/expenses";

test("regresión: un pago anual no sobrescribe un pago mensual concurrente", async () => {
  const h = await startTestApp();
  async function send(path: string, body: unknown) {
    return h.call("/api/v2" + path, h.cookieA, {
      method: "POST",
      headers: { origin: h.config.origin, "Idempotency-Key": randomUUID() },
      body: JSON.stringify(body),
    });
  }
  async function month(period: string) {
    return (await (await h.call("/api/v2/months/" + period, h.cookieA)).json())
      .data.occurrences as Occurrence[];
  }
  try {
    await send("/expenses", {
      name: "Servicio",
      currency: "ARS",
      amountMinor: "10000",
      dueDay: 10,
      firstPeriod: "2026-10",
    });
    const [october] = await month("2026-10"),
      [november] = await month("2026-11");
    let reached!: () => void, release!: () => void;
    const rangeRead = new Promise<void>((r) => {
        reached = r;
      }),
      resume = new Promise<void>((r) => {
        release = r;
      });
    const annual = withUser(h.databases.app, h.userA.id, async (tx) => {
      const proxy = new Proxy(tx, {
        get(target, key) {
          if (key === "monthlyExpenseOccurrence")
            return new Proxy(target.monthlyExpenseOccurrence, {
              get(delegate, method) {
                if (method === "findMany")
                  return async (
                    ...args: Parameters<typeof delegate.findMany>
                  ) => {
                    const result = await delegate.findMany(...args);
                    reached();
                    await resume;
                    return result;
                  };
                return Reflect.get(delegate, method);
              },
            });
          return Reflect.get(target, key);
        },
      }) as Tx;
      return payAnnual(
        { tx: proxy, ownerId: h.userA.id, requestId: randomUUID() },
        october.id,
        { version: october.version, months: 12, amountMinor: "100000" },
      );
    });
    await rangeRead;
    const monthly = send(`/occurrences/${november.id}/payments`, {
      version: november.version,
    });
    release();
    await annual;
    assert.equal((await monthly).status, 409);
    const [after] = await month("2026-11");
    assert.equal(after.status, "COVERED");
    assert.equal(
      await withUser(h.databases.app, h.userA.id, (tx) =>
        tx.expensePayment.count({
          where: { occurrenceId: november.id, revertedAt: null },
        }),
      ),
      0,
    );
  } finally {
    await h.close();
  }
});
