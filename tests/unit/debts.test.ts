import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { deriveDebt } from "../../shared/domain/debts";
import { createDebtSchema } from "../../shared/contracts/debts";

const base = {
  principalMinor: 100_000n,
  increasesMinor: [],
  forgivenMinor: [],
  paymentsMinor: [],
  cancelled: false,
};
test("estados de una deuda se derivan de principal, pagos, ajustes y cancelación", () => {
  assert.equal(deriveDebt(base).status, "OPEN");
  const partial = deriveDebt({ ...base, paymentsMinor: [25_000n] });
  assert.equal(partial.status, "PARTIALLY_PAID");
  assert.equal(partial.balanceMinor, 75_000n);
  assert.equal(
    deriveDebt({ ...base, paymentsMinor: [25_000n, 75_000n] }).status,
    "PAID",
  );
  const adjusted = deriveDebt({
    ...base,
    increasesMinor: [50_000n],
    forgivenMinor: [10_000n],
    paymentsMinor: [40_000n],
  });
  assert.deepEqual(
    [adjusted.owedMinor, adjusted.forgivenMinor, adjusted.balanceMinor],
    [150_000n, 10_000n, 100_000n],
  );
  // Perdonar todo sin pagos deja la deuda saldada, sin inventar un pago.
  const forgiven = deriveDebt({ ...base, forgivenMinor: [100_000n] });
  assert.equal(forgiven.status, "PAID");
  assert.equal(forgiven.paidMinor, 0n);
  assert.equal(
    deriveDebt({ ...base, paymentsMinor: [1n], cancelled: true }).status,
    "CANCELLED",
  );
});
test("una deuda exige importe exacto y vencimiento posterior al préstamo", () => {
  const valid = {
    contactId: randomUUID(),
    description: "Préstamo",
    currency: "USD",
    principalMinor: "100000",
    lentOn: "2026-10-01",
  };
  assert.equal(createDebtSchema.safeParse(valid).success, true);
  for (const invalid of [
    { ...valid, principalMinor: "0" },
    { ...valid, principalMinor: "10.5" },
    { ...valid, dueOn: "2026-09-30" },
    { ...valid, description: " " },
    { ...valid, interestBps: 100 },
  ])
    assert.equal(createDebtSchema.safeParse(invalid).success, false);
});
