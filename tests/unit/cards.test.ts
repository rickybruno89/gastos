import { test } from "node:test";
import assert from "node:assert/strict";
import {
  installmentAmounts,
  installmentAllocations,
} from "../../shared/domain/cards";
import {
  createPurchaseSchema,
  statementDatesSchema,
  resolveStatementLineSchema,
} from "../../shared/contracts/cards";
import { allocateMoney } from "../../shared/domain/money";
test("cuotas: conserva todos los centavos, aun fuera del rango seguro de Number", () => {
  assert.deepEqual(installmentAmounts(100n, 3), [34n, 33n, 33n]);
  const total = 9007199254740993n;
  assert.equal(
    installmentAmounts(total, 120).reduce((s, a) => s + a, 0n),
    total,
  );
  assert.throws(() => installmentAmounts(1n, 2));
});
test("reparto en cuotas: cada fila suma su cuota y cada persona conserva su parte del total", () => {
  for (const total of [100n, 10001n, 999999999999999n])
    for (const count of [1, 3, 12, 120]) {
      if (total < BigInt(count)) continue;
      const shares = [
          { id: "owner", shareBps: 3333 },
          { id: "juan", shareBps: 3333 },
          { id: "ana", shareBps: 3334 },
        ],
        rows = installmentAllocations(total, count, shares),
        amounts = installmentAmounts(total, count);
      rows.forEach((row, i) =>
        assert.equal(
          row.reduce((s, a) => s + a.amountMinor, 0n),
          amounts[i],
        ),
      );
      for (const target of allocateMoney(
        { amountMinor: total.toString(), currency: "ARS" },
        shares,
      ))
        assert.equal(
          rows
            .reduce(
              (s, row) => s + row.find((p) => p.id === target.id)!.amountMinor,
              0n,
            )
            .toString(),
          target.money.amountMinor,
        );
    }
});
test("contratos: fechas de cuotas, cierre, y exclusión motivada", () => {
  const input = {
    description: "Compra",
    occurredOn: "2026-10-01",
    firstPeriod: "2026-10",
    amountMinor: "100",
    currency: "ARS",
    installments: 3,
  };
  assert.ok(createPurchaseSchema.safeParse(input).success);
  assert.ok(
    !createPurchaseSchema.safeParse({ ...input, firstPeriod: "2026-09" })
      .success,
  );
  assert.ok(
    !createPurchaseSchema.safeParse({ ...input, amountMinor: "1" }).success,
  );
  assert.ok(
    !statementDatesSchema.safeParse({
      version: 1,
      closingDate: "2026-10-30",
      dueDate: "2026-10-01",
    }).success,
  );
  assert.ok(
    !resolveStatementLineSchema.safeParse({ version: 1, action: "IGNORE" })
      .success,
  );
});
